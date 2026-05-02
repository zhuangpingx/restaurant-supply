'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Delivery } from '@/types'

export async function getDeliveries(params?: {
  status?: string
  store_id?: string
  supplier_id?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('deliveries')
    .select('*, supplier:suppliers(id,name,category), store:stores(id,name), delivery_items(*)')
    .order('created_at', { ascending: false })

  if (params?.status && params.status !== 'all') query = query.eq('status', params.status)
  if (params?.store_id) query = query.eq('store_id', params.store_id)
  if (params?.supplier_id) query = query.eq('supplier_id', params.supplier_id)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data as Delivery[], error: null }
}

export async function getDelivery(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, supplier:suppliers(id,name,phone,category,payment_term_days), store:stores(id,name,address), delivery_items(*), confirmed_by_user:users!confirmed_by(id,name)')
    .eq('id', id)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as Delivery, error: null }
}

export interface CreateDeliveryInput {
  store_id: string
  delivery_date: string
  notes?: string
  photos?: string[]
  items: { name: string; unit: string; quantity: number; unit_price: number }[]
}

export async function createDelivery(input: CreateDeliveryInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: supplier } = await supabase
    .from('suppliers').select('id').eq('user_id', user.id).single()
  if (!supplier) return { error: '未找到供应商信息' }

  const total_amount = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .insert({
      supplier_id: supplier.id,
      store_id: input.store_id,
      delivery_date: input.delivery_date,
      total_amount,
      notes: input.notes || null,
      photos: input.photos || [],
      created_by: user.id,
    })
    .select().single()

  if (deliveryError || !delivery) return { error: deliveryError?.message || '创建失败' }

  const items = input.items.map(item => ({
    delivery_id: delivery.id,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.quantity * item.unit_price,
  }))

  const { error: itemsError } = await supabase.from('delivery_items').insert(items)
  if (itemsError) {
    await supabase.from('deliveries').delete().eq('id', delivery.id)
    return { error: itemsError.message }
  }

  // 通知店长
  try {
    const { data: store } = await supabase
      .from('stores').select('manager_id, name').eq('id', input.store_id).single()
    const { data: sup } = await supabase
      .from('suppliers').select('name').eq('id', supplier.id).single()
    if (store?.manager_id) {
      await supabase.from('notifications').insert({
        user_id: store.manager_id,
        type: 'delivery_created',
        title: '新送货单待确认',
        body: `${sup?.name} 向 ${store.name} 提交了一张送货单，请及时确认`,
        delivery_id: delivery.id,
      })
    }
  } catch (e) { console.error('notify error:', e) }

  revalidatePath('/deliveries')
  return { data: delivery, error: null }
}

export async function uploadDeliveryPhoto(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const file = formData.get('file') as File
  if (!file) return { error: '未选择文件' }
  if (file.size > 10 * 1024 * 1024) return { error: '文件大小不能超过 10MB' }

  const ext = file.name.split('.').pop()
  const path = `deliveries/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('delivery-photos').upload(path, file)
  if (error) return { error: '上传失败，请重试' }

  const { data } = supabase.storage.from('delivery-photos').getPublicUrl(path)
  return { url: data.publicUrl }
}
