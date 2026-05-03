import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'
import { getDashboardStats } from '@/lib/actions/payments'
import { getDeliveries } from '@/lib/actions/deliveries'
import { formatAmount, formatDate, getDeliveryStatusStyle, getDeliveryStatusLabel } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const isFinanceOrBoss = ['finance', 'boss'].includes(profile?.role ?? '')
  const isReceiver = profile?.role === 'receiver'

  const [stats, { data: recentDeliveries }] = await Promise.all([
    isFinanceOrBoss ? getDashboardStats() : Promise.resolve(null),
    getDeliveries(),
  ])

  const recent = (recentDeliveries ?? []).slice(0, 5)

  return (
    <PageContainer>
      <div className="py-3">
        <p className="text-xs text-gray-400">欢迎回来</p>
        <h1 className="text-lg font-semibold text-gray-900 mt-0.5">{profile?.name}</h1>
      </div>

      {isFinanceOrBoss && stats && (
        <div className="space-y-3">
          {stats.severeOverdueCount > 0 && (
            <Link href="/payments?tab=pending">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 active:opacity-80">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-700">{stats.severeOverdueCount} 笔严重逾期待处理</p>
                  <p className="text-xs text-red-400 mt-0.5">超60天欠款 {formatAmount(stats.severeOverdueAmount)}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-red-300 flex-shrink-0" />
              </div>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="待付款" value={formatAmount(stats.todayPending)} sub="全部未付" href="/payments?tab=pending" accent={stats.todayPending > 0} />
            <StatCard label="本月采购" value={formatAmount(stats.monthPurchase)} sub="已确认金额" />
            <StatCard label="已逾期" value={formatAmount(stats.overdueAmount)} sub="超出账期" href="/payments?tab=pending" danger={stats.overdueAmount > 0} />
            <StatCard label="超60天" value={formatAmount(stats.severeOverdueAmount)} sub={`${stats.severeOverdueCount} 笔`} href="/payments?tab=pending" danger={stats.severeOverdueAmount > 0} severe />
          </div>
        </div>
      )}

      {isReceiver && (
        <Link href="/deliveries">
          <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between active:opacity-80">
            <div>
              <p className="text-white font-semibold text-sm">查看送货单</p>
              <p className="text-gray-400 text-xs mt-0.5">收货确认与验收</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      )}

      {profile?.role === 'supplier' && (
        <Link href="/deliveries/new">
          <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between active:opacity-80">
            <div>
              <p className="text-white font-semibold text-sm">新建送货单</p>
              <p className="text-gray-400 text-xs mt-0.5">记录本次送货信息</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">最近送货单</h2>
          <Link href="/deliveries" className="text-xs text-gray-400">查看全部 →</Link>
        </div>
        {recent.length === 0
          ? <div className="text-center py-8 text-sm text-gray-300">暂无送货单</div>
          : (
            <div className="space-y-2">
              {recent.map(d => (
                <Link key={d.id} href={`/deliveries/${d.id}`}>
                  <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center justify-between active:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{d.supplier?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{d.store?.name} · {formatDate(d.delivery_date)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDeliveryStatusStyle(d.status)}`}>{getDeliveryStatusLabel(d.status)}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatAmount(d.total_amount)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        }
      </div>
    </PageContainer>
  )
}

function StatCard({ label, value, sub, href, accent, danger, severe }: {
  label: string; value: string; sub?: string; href?: string; accent?: boolean; danger?: boolean; severe?: boolean
}) {
  const content = (
    <div className={`rounded-2xl p-4 border h-full ${severe && danger ? 'bg-red-50 border-red-100' : danger ? 'bg-orange-50 border-orange-100' : accent ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold mt-1 leading-tight ${severe && danger ? 'text-red-600' : danger ? 'text-orange-600' : accent ? 'text-blue-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href} className="block active:opacity-80">{content}</Link>
  return content
}
