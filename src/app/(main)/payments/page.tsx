import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageContainer from '@/components/layout/PageContainer'
import { getPayments } from '@/lib/actions/payments'
import PaymentList from './PaymentList'
import SevereOverdueAlert from './SevereOverdueAlert'
import Link from 'next/link'

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const params = await searchParams
  const tab = params.tab ?? 'pending'

  const { data: payments } = await getPayments()
  const pending = payments.filter(p => p.status !== 'paid')
  const paid = payments.filter(p => p.status === 'paid')
  const severe = pending.filter(p => p.overdue_days > 60)

  const isFinance = ['finance', 'boss'].includes(profile?.role ?? '')
  const current = tab === 'paid' ? paid : pending

  const tabs = [
    { label: `待付款 ${pending.length}`, value: 'pending' },
    { label: `已付款 ${paid.length}`, value: 'paid' },
  ]

  return (
    <PageContainer>
      <div className="py-2"><h1 className="text-base font-semibold text-gray-900">付款管理</h1></div>
      {isFinance && severe.length > 0 && tab !== 'paid' && <SevereOverdueAlert payments={severe} />}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mt-3">
        {tabs.map(t => (
          <Link key={t.value} href={`/payments?tab=${t.value}`}
            className={`flex-1 text-center text-sm font-medium py-2 rounded-lg transition-all ${tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <PaymentList payments={current} role={profile?.role ?? ''} tab={tab} />
    </PageContainer>
  )
}
