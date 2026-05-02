'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmDelivery(deliveryId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['store_manager', 'boss'].includes(profile.role)) return { error: '无权限操作' }

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('*, supplier:suppliers(name,user_id), store:stores(name)')
    .eq('id', deliveryId).single()
  if (!delivery) return { error: '送货单不存在' }
  if (delivery.status !== 'pending') return { error: '当前状态不可确认' }

  const now = new Date().toISOString()
  const { error } = await supabase.from('deliveries')
    .update({ status: 'confirmed', confirmed_by: user.id, confirmed_at: now })
    .eq('id', deliveryId)
  if (error) return { error: '确认失败，请重试' }

  // 通知供应商
  if (delivery.supplier?.user_id) {
    await supabase.from('notifications').insert({
      user_id: delivery.supplier.user_id,
      type: 'delivery_confirmed',
      title: '送货单已确认',
      body: `${delivery.store?.name} 已确认您的送货单，系统已生成应付款记录`,
      delivery_id: deliveryId,
    })
  }

  // 通知财务
  const { data: targets } = await supabase.from('users').select('id').in('role', ['finance', 'boss']).eq('is_active', true)
  if (targets?.length) {
    await supabase.from('notifications').insert(
      targets.map(u => ({
        user_id: u.id,
        type: 'delivery_confirmed',
        title: '新增应付款',
        body: `${delivery.supplier?.name} 向 ${delivery.store?.name} 送货已确认，金额 ¥${Number(delivery.total_amount).toFixed(2)}`,
        delivery_id: deliveryId,
      }))
    )
  }

  revalidatePath('/deliveries')
  revalidatePath(`/deliveries/${deliveryId}`)
  revalidatePath('/payments')
  return {}
}

export async function rejectDelivery(deliveryId: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['store_manager', 'boss'].includes(profile.role)) return { error: '无权限操作' }

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('*, supplier:suppliers(name,user_id), store:stores(name)')
    .eq('id', deliveryId).single()
  if (!delivery) return { error: '送货单不存在' }
  if (delivery.status !== 'pending') return { error: '当前状态不可驳回' }

  const { error } = await supabase.from('deliveries')
    .update({ status: 'rejected', rejection_reason: reason, confirmed_by: user.id, confirmed_at: new Date().toISOString() })
    .eq('id', deliveryId)
  if (error) return { error: '操作失败，请重试' }

  if (delivery.supplier?.user_id) {
    await supabase.from('notifications').insert({
      user_id: delivery.supplier.user_id,
      type: 'delivery_rejected',
      title: '送货单被驳回',
      body: `${delivery.store?.name} 驳回了您的送货单，原因：${reason}`,
      delivery_id: deliveryId,
    })
  }

  revalidatePath('/deliveries')
  revalidatePath(`/deliveries/${deliveryId}`)
  return {}
}

export interface UpdateItemInput {
  id: string
  quantity: number
  unit_price: number
}

export async function confirmWithEdits(deliveryId: string, updatedItems: UpdateItemInput[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['store_manager', 'boss'].includes(profile.role)) return { error: '无权限操作' }

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('*, supplier:suppliers(name,user_id), store:stores(name)')
    .eq('id', deliveryId).single()
  if (!delivery) return { error: '送货单不存在' }
  if (delivery.status !== 'pending') return { error: '当前状态不可修改' }

  for (const item of updatedItems) {
    const { data: original } = await supabase
      .from('delivery_items').select('quantity,unit_price,original_quantity,original_unit_price').eq('id', item.id).single()
    if (!original) continue
    await supabase.from('delivery_items').update({
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.quantity * item.unit_price,
      original_quantity: original.original_quantity ?? original.quantity,
      original_unit_price: original.original_unit_price ?? original.unit_price,
    }).eq('id', item.id)
  }

  const { data: allItems } = await supabase.from('delivery_items').select('amount').eq('delivery_id', deliveryId)
  const newTotal = (allItems ?? []).reduce((sum, i) => sum + Number(i.amount), 0)

  const { error } = await supabase.from('deliveries')
    .update({ total_amount: newTotal, status: 'confirmed', confirmed_by: user.id, confirmed_at: new Date().toISOString() })
    .eq('id', deliveryId)
  if (error) return { error: '操作失败，请重试' }

  if (delivery.supplier?.user_id) {
    await supabase.from('notifications').insert({
      user_id: delivery.supplier.user_id,
      type: 'delivery_confirmed',
      title: '送货单已确认（含修改）',
      body: `${delivery.store?.name} 确认了您的送货单，部分数量已调整，请查看详情`,
      delivery_id: deliveryId,
    })
  }

  revalidatePath('/deliveries')
  revalidatePath(`/deliveries/${deliveryId}`)
  revalidatePath('/payments')
  return {}
}
