'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login')) return { error: '邮箱或密码错误' }
    return { error: '登录失败，请重试' }
  }

  if (!data.user) return { error: '登录异常，请重试' }

  const { data: profile } = await supabase
    .from('users').select('id, is_active').eq('id', data.user.id).single()

  if (!profile) { await supabase.auth.signOut(); return { error: '账号未开通，请联系管理员' } }
  if (!profile.is_active) { await supabase.auth.signOut(); return { error: '账号已被禁用' } }

  return {}
}

// 保留这两个函数避免其他地方报错
export async function sendOtp(_phone: string): Promise<{ error?: string }> {
  return { error: '请使用邮箱密码登录' }
}
export async function verifyOtp(_phone: string, _token: string): Promise<{ error?: string }> {
  return { error: '请使用邮箱密码登录' }
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
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  return profile
}
