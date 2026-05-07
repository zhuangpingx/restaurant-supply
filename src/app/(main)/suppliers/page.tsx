import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageContainer from '@/components/layout/PageContainer'
import SupplierList from './SupplierList'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['boss', 'finance'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: suppliers } = await supabase.from('suppliers').select('*').eq('is_active', true).order('name')
  const { data: payStats } = await supabase.from('payments').select('supplier_id,amount,status,overdue_days')

  const statsMap = (payStats ?? []).reduce<Record<string, { pending: number; paid: number; overdue: number; severe: number }>>((acc, p) => {
    if (!acc[p.supplier_id]) acc[p.supplier_id] = { pending: 0, paid: 0, overdue: 0, severe: 0 }
    if (p.status === 'paid') acc[p.supplier_id].paid += Number(p.amount)
    else { acc[p.supplier_id].pending += Number(p.amount); if (p.status === 'overdue') acc[p.supplier_id].overdue += Number(p.amount); if (p.overdue_days > 60) acc[p.supplier_id].severe += Number(p.amount) }
    return acc
  }, {})

  const suppliersWithStats = (suppliers ?? []).map(s => ({ ...s, stats: statsMap[s.id] ?? { pending: 0, paid: 0, overdue: 0, severe: 0 } }))

  return (
    <PageContainer>
      <div className="py-2 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">供应商管理</h1>
        <span className="text-xs text-gray-400">共 {suppliers?.length ?? 0} 家</span>
      </div>
      <SupplierList suppliers={suppliersWithStats} />
    </PageContainer>
  )
}
