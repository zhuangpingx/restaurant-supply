import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'
import DeliveryList from './DeliveryList'
import { getDeliveries } from '@/lib/actions/deliveries'

export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const params = await searchParams
  const { data: deliveries } = await getDeliveries({ status: params.status })
  const isSupplier = profile?.role === 'supplier'

  const tabs = [
    { label: '全部', value: undefined },
    { label: '待确认', value: 'pending' },
    { label: '已确认', value: 'confirmed' },
    { label: '已驳回', value: 'rejected' },
    { label: '已付款', value: 'paid' },
  ]

  return (
    <PageContainer>
      <div className="flex items-center justify-between py-2">
        <h1 className="text-base font-semibold text-gray-900">送货单</h1>
        {isSupplier && (
          <Link href="/deliveries/new" className="flex items-center gap-1 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-xl active:opacity-80">
            <Plus className="w-3.5 h-3.5" />新建
          </Link>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mt-3 -mx-4 px-4">
        {tabs.map(tab => {
          const isActive = (tab.value ?? 'all') === (params.status ?? 'all')
          const href = tab.value ? `/deliveries?status=${tab.value}` : '/deliveries'
          return (
            <Link key={tab.label} href={href} className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {tab.label}
            </Link>
          )
        })}
      </div>
      <DeliveryList deliveries={deliveries} role={profile?.role} />
    </PageContainer>
  )
}
