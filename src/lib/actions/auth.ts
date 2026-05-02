'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// 测试模式：使用此手机号可跳过短信验证码，直接输入任意6位数字登录
const TEST_PHONE = '13800138000'
const TEST_OTP = '123456'

export async function sendOtp(phone: string): Promise<{ error?: string }> {
  // 测试模式：跳过真实短信发送
  if (phone === TEST_PHONE) {
    console.log(`[TEST MODE] 验证码已生成: ${TEST_OTP}（手机号: ${phone}）`)
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
    const supabase = await createClient()
    // 尝试用测试账号登录或创建用户
    const { data: existing } = await supabase.from('users').select('id').eq('phone', phone).single()
    if (existing) {
      // 已有用户，直接通过
      return {}
    }
    // 创建测试用户
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      phone: `+86${phone}`,
      phone_confirm: true,
      user_metadata: { name: '测试管理员' },
    })
    if (createError || !newUser.user) return { error: '测试用户创建失败: ' + (createError?.message || '未知错误') }
    await supabase.from('users').insert({
      id: newUser.user.id,
      phone,
      name: '测试管理员',
      role: 'admin',
      is_active: true,
    })
    return {}
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
