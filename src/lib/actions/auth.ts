'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function sendOtp(phone: string): Promise<{ error?: string }> {
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
