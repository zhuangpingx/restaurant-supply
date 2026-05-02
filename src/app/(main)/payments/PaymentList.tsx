'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatAmount, formatDate, formatDateTime, getOverdueLevel, getOverdueStyle } from '@/lib/utils'
import type { Payment } from '@/types'
import EmptyState from '@/components/shared/EmptyState'
import PaymentDrawer from './PaymentDrawer'

export default function PaymentList({ payments, role, tab }: { payments: Payment[]; role: string; tab: string }) {
  const [selected, setSelected] = useState<Payment | null>(null)
  if (payments.length === 0) return <EmptyState title={tab === 'paid' ? '暂无付款记录' : '暂无待付款'} description={tab === 'paid' ? '' : '送货单确认后将自动生成应付款'} />

  const sorted = tab !== 'paid' ? [...payments].sort((a, b) => b.overdue_days - a.overdue_days) : payments
  const isFinance = ['finance', 'boss'].includes(role)

  return (
    <>
      <div className="mt-3 space-y-2">
        {sorted.map(payment => {
          const level = getOverdueLevel(payment.overdue_days, payment.status)
          const style = getOverdueStyle(level)
          const isPaid = payment.status === 'paid'
          return (
            <button key={payment.id} onClick={() => setSelected(payment)} className={`w-full text-left rounded-2xl p-4 border transition-colors active:opacity-80 ${isPaid ? 'bg-white border-gray-100' : `${style.bg} border-transparent`}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{payment.supplier?.name}</span>
                    {!isPaid && level !== 'normal' && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>
                        {level === 'severe' || level === 'overdue' ? `逾期 ${payment.overdue_days} 天` : `${payment.overdue_days} 天后到期`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{payment.store?.name}{payment.supplier?.category && ` · ${payment.supplier.category}`}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-base font-bold ${isPaid ? 'text-gray-400' : style.text}`}>{formatAmount(payment.amount)}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                {isPaid
                  ? <><span>付款时间：{formatDateTime(payment.paid_at!)}</span>{payment.paid_by_user && <span>· {payment.paid_by_user.name}</span>}</>
                  : <><span>到期：{formatDate(payment.due_date)}</span><span>·</span><span>账期 {payment.payment_term_days} 天</span></>
                }
              </div>
            </button>
          )
        })}
      </div>
      {selected && <PaymentDrawer payment={selected} isFinance={isFinance} onClose={() => setSelected(null)} />}
    </>
  )
}
