'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// 测试模式：使用此手机号可跳过短信验证码，直接输入任意6位数字登录
const TEST_PHONE = '13800138000'
const TEST_OTP = '123456'

export async function sendOtp(phone: string): Promise<{ error?: string }> {
  // 测试模式：跳过真实短信发送
  if (phone === TEST_PHONE) {
    return {}
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    phone: `+86${phone}`,
  })

  if (error) {
    if (error.message.includes('rate limit')) return { error: '发送太频繁，请稍后再试' }
    return { error: '发送失败，请重试' }
  }
  return {}
}

export async function verifyOtp(phone: string, token: string): Promise<{ error?: string }> {
  // 测试模式验证
  if (phone === TEST_PHONE && token === TEST_OTP) {
    const admin = createAdminClient()

    // 查找或创建测试用户
    const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 })
    let testUser = usersList.users.find(u => u.phone === `+86${phone}`)

    if (!testUser) {
      const testEmail = `test_${phone}@demo.local`
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        phone: `+86${phone}`,
        phone_confirm: true,
        user_metadata: { name: '测试管理员', phone: phone },
        email: testEmail,
        email_confirm: true,
      })
      // 用户已存在也算成功，直接复用
      if (createError?.message?.includes('already been registered') || createError?.message?.includes('already exists')) {
        // 重新查找已存在的用户（先按手机号，再按邮箱）
        const { data: retryUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
        testUser = retryUsers.users.find(u => u.phone === `+86${phone}`)
        if (!testUser) {
          testUser = retryUsers.users.find(u => u.email === testEmail)
        }
        if (!testUser) return { error: '测试用户查找失败: ' + createError.message }
      } else if (createError || !newUser.user) {
        return { error: '测试用户创建失败: ' + (createError?.message || '未知错误') }
      } else {
        testUser = newUser.user
      }
    }

    // 确保 users 表有记录
    await admin.from('users').upsert({
      id: testUser.id,
      phone,
      name: '测试管理员',
      role: 'admin',
      is_active: true,
    }, { onConflict: 'id' })

    // 测试模式：用 magic link 建立可靠 session
    try {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: testUser.email || `test_${phone}@demo.local`,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard`,
        },
      })

      if (linkError || !linkData?.properties?.action_link) {
        return { error: '测试登录失败: 无法生成验证链接' }
      }

      // 提取 OTP token 并通过 anon client 验证以建立 session
      const match = linkData.properties.action_link.match(/otp=([^&]+)/)
      if (match) {
        const supabase = await createClient()
        const { error: otpError } = await supabase.auth.verifyOtp({
          token: decodeURIComponent(match[1]),
          type: 'magiclink',
          email: testUser.email || `test_${phone}@demo.local`,
        })
        if (otpError) {
          return { error: 'Session 建立失败: ' + otpError.message }
        }
      }

      // Session 已建立，服务端直接 redirect 到 dashboard
      redirect('/dashboard')
    } catch (e: any) {
      return { error: '测试登录异常: ' + (e?.message || '未知') }
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    phone: `+86${phone}`,
    token,
    type: 'sms',
  })

  if (error) {
    if (error.message.includes('expired')) return { error: '验证码已过期，请重新获取' }
    return { error: '验证码错误，请重新输入' }
  }

  if (!data.user) return { error: '登录异常，请重试' }

  const { data: profile } = await supabase
    .from('users')
    .select('id, is_active')
    .eq('id', data.user.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    return { error: '账号未开通，请联系管理员' }
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return { error: '账号已被禁用，请联系管理员' }
  }

  return {}
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  return profile
}
