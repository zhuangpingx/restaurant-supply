import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageContainer from '@/components/layout/PageContainer'
import StoreList from './StoreList'

export default async function StoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['boss', 'finance'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: stores } = await supabase.from('stores').select('*, manager:users!manager_id(id,name,phone)').eq('is_active', true).order('created_at')
  const { data: paymentSummary } = await supabase.from('payments').select('store_id,amount,status,overdue_days').in('status', ['pending','overdue'])

  const summaryMap = (paymentSummary ?? []).reduce<Record<string, { total: number; overdue: number; severe: number }>>((acc, p) => {
    if (!acc[p.store_id]) acc[p.store_id] = { total: 0, overdue: 0, severe: 0 }
    acc[p.store_id].total += Number(p.amount)
    if (p.status === 'overdue') acc[p.store_id].overdue += Number(p.amount)
    if (p.overdue_days > 60) acc[p.store_id].severe += Number(p.amount)
    return acc
  }, {})

  const storesWithStats = (stores ?? []).map(s => ({ ...s, stats: summaryMap[s.id] ?? { total: 0, overdue: 0, severe: 0 } }))

  return (
    <PageContainer>
      <div className="py-2 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">门店管理</h1>
        <span className="text-xs text-gray-400">共 {stores?.length ?? 0} 家门店</span>
      </div>
      <StoreList stores={storesWithStats} isBoss={profile?.role === 'boss'} />
    </PageContainer>
  )
}
