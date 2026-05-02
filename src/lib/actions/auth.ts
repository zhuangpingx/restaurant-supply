'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// 测试账号
const TEST_PHONE = '13800138000'
const TEST_PASSWORD = '123456'

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
  // 测试模式：使用密码登录
  if (phone === TEST_PHONE && token === TEST_PASSWORD) {
    const admin = createAdminClient()
    const testEmail = `test_${phone}@demo.local`

    // 查找或创建测试用户（带密码）
    const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 })
    let testUser = usersList.users.find(u => u.phone === `+86${phone}` || u.email === testEmail)

    if (!testUser) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: testEmail,
        email_confirm: true,
        password: TEST_PASSWORD,
        user_metadata: { name: '测试管理员', phone: phone },
      })
      if (createError || !newUser.user) {
        return { error: '测试用户创建失败: ' + (createError?.message || '未知错误') }
      }
      testUser = newUser.user
    }

    // 确保 users 表有记录
    await admin.from('users').upsert({
      id: testUser.id,
      phone,
      name: '测试管理员',
      role: 'admin',
      is_active: true,
    }, { onConflict: 'id' })

    // 用 signInWithPassword 建立正常 session
    const supabase = await createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: TEST_PASSWORD,
    })

    if (loginError) {
      return { error: '登录失败: ' + loginError.message }
    }

    redirect('/dashboard')
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
