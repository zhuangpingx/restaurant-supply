'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 获取所有用户
export async function getUsers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*, store:stores!stores_manager_id_fkey(id, name)')
    .order('created_at', { ascending: false })
  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

// 创建账号（老板手动添加）
export async function createUser(input: {
  phone: string
  name: string
  role: string
  password: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  // 验证当前用户是老板
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'boss') return { error: '无权限操作' }

  // 用 service role 创建 auth 用户（需要服务端）
  // 这里用邮箱模拟：phone@supply.com
  const email = `${input.phone}@supply.com`

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name, role: input.role },
  })

  if (authError || !authData.user) {
    if (authError?.message.includes('already')) return { error: '该手机号已注册' }
    return { error: authError?.message || '创建失败' }
  }

  // 写入 public.users
  const { error: profileError } = await supabase.from('users').upsert({
    id: authData.user.id,
    phone: input.phone,
    name: input.name,
    role: input.role,
    is_active: true,
  })

  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/users')
  return {}
}

// 更新用户角色
export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'boss') return { error: '无权限' }

  const { error } = await supabase
    .from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

// 禁用/启用账号
export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'boss') return { error: '无权限' }
  if (userId === user.id) return { error: '不能操作自己的账号' }

  const { error } = await supabase
    .from('users').update({ is_active: isActive }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

// 绑定店长到门店
export async function bindManagerToStore(
  userId: string,
  storeId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'boss') return { error: '无权限' }

  // 先清除该门店原来的店长
  await supabase.from('stores').update({ manager_id: null }).eq('manager_id', userId)
  // 绑定新门店
  const { error } = await supabase
    .from('stores').update({ manager_id: userId }).eq('id', storeId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

// 绑定供应商账号
export async function bindSupplier(
  userId: string,
  supplierId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'boss') return { error: '无权限' }

  await supabase.from('suppliers').update({ user_id: null }).eq('user_id', userId)
  const { error } = await supabase
    .from('suppliers').update({ user_id: userId }).eq('id', supplierId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

// 获取门店和供应商列表（用于绑定下拉）
export async function getStoresAndSuppliers() {
  const supabase = await createClient()
  const [{ data: stores }, { data: suppliers }] = await Promise.all([
    supabase.from('stores').select('id, name').eq('is_active', true).order('name'),
    supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
  ])
  return { stores: stores ?? [], suppliers: suppliers ?? [] }
}

// 绑定收货员到门店（可多个门店）
export async function bindReceiverToStore(
  userId: string,
  storeId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'boss') return { error: '无权限' }

  // 收货员可以绑定多个门店，用 upsert
  const { error } = await supabase
    .from('store_receivers')
    .upsert({ user_id: userId, store_id: storeId, is_active: true })

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}
