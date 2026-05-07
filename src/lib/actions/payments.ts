'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Payment } from '@/types'

export async function getPayments(params?: { status?: string; store_id?: string; supplier_id?: string }) {
  const supabase = await createClient()
  let query = supabase
    .from('payments')
    .select('*, supplier:suppliers(id,name,category,payment_term_days), store:stores(id,name), delivery:deliveries(id,delivery_date,photos), paid_by_user:users!paid_by(id,name)')
    .order('due_date', { ascending: true })

  if (params?.status && params.status !== 'all') query = query.eq('status', params.status)
  if (params?.store_id) query = query.eq('store_id', params.store_id)
  if (params?.supplier_id) query = query.eq('supplier_id', params.supplier_id)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data as Payment[], error: null }
}

export async function getPayment(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, supplier:suppliers(id,name,phone,category,payment_term_days,bank_info), store:stores(id,name), delivery:deliveries(id,delivery_date,photos,notes,delivery_items(*)), paid_by_user:users!paid_by(id,name)')
    .eq('id', id).single()
  if (error) return { data: null, error: error.message }
  return { data: data as Payment, error: null }
}

export async function getDashboardStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const [pendingRes, overdueRes, severeRes, monthRes] = await Promise.all([
    supabase.from('payments').select('amount').in('status', ['pending', 'overdue']),
    supabase.from('payments').select('amount').eq('status', 'overdue'),
    supabase.from('payments').select('amount,overdue_days').in('status', ['pending', 'overdue']).lt('due_date', today),
    supabase.from('deliveries').select('total_amount').eq('status', 'confirmed').gte('confirmed_at', monthStart),
  ])

  const todayPending = (pendingRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const overdueAmount = (overdueRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const severe = (severeRes.data ?? []).filter(p => p.overdue_days > 60)
  const severeOverdueAmount = severe.reduce((s, p) => s + Number(p.amount), 0)
  const severeOverdueCount = severe.length
  const monthPurchase = (monthRes.data ?? []).reduce((s, d) => s + Number(d.total_amount), 0)

  return { todayPending, monthPurchase, overdueAmount, severeOverdueAmount, severeOverdueCount }
}

export async function markAsPaid(paymentId: string, input: { payment_notes?: string; payment_proof?: string }): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['finance', 'boss'].includes(profile.role)) return { error: '无权限操作' }

  const { data: payment } = await supabase
    .from('payments')
    .select('*, supplier:suppliers(name,user_id), store:stores(name)')
    .eq('id', paymentId).single()
  if (!payment) return { error: '记录不存在' }
  if (payment.status === 'paid') return { error: '已付款，请勿重复操作' }

  const now = new Date().toISOString()
  const { error: payError } = await supabase.from('payments')
    .update({ status: 'paid', paid_at: now, paid_by: user.id, payment_notes: input.payment_notes || null, payment_proof: input.payment_proof || null })
    .eq('id', paymentId)
  if (payError) return { error: '操作失败，请重试' }

  await supabase.from('deliveries').update({ status: 'paid', paid_at: now }).eq('id', payment.delivery_id)

  if (payment.supplier?.user_id) {
    await supabase.from('notifications').insert({
      user_id: payment.supplier.user_id,
      type: 'payment_completed',
      title: '货款已到账',
      body: `${payment.store?.name} 已向您付款 ¥${Number(payment.amount).toFixed(2)}，请查收`,
      payment_id: paymentId,
    })
  }

  revalidatePath('/payments')
  revalidatePath('/dashboard')
  return {}
}

export async function uploadPaymentProof(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const file = formData.get('file') as File
  if (!file) return { error: '未选择文件' }
  if (file.size > 10 * 1024 * 1024) return { error: '文件超过 10MB' }

  const ext = file.name.split('.').pop()
  const path = `proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file)
  if (error) return { error: '上传失败' }

  const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
  return { url: data.publicUrl }
}
