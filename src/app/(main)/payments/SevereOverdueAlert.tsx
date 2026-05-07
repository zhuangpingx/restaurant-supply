'use client'
import { AlertTriangle } from 'lucide-react'
import { formatAmount } from '@/lib/utils'
import type { Payment } from '@/types'

export default function SevereOverdueAlert({ payments }: { payments: Payment[] }) {
  const total = payments.reduce((s, p) => s + Number(p.amount), 0)
  return (
    <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700">{payments.length} 笔严重逾期（超60天）</p>
          <p className="text-xs text-red-500 mt-0.5">累计欠款 {formatAmount(total)}，请尽快处理</p>
          <div className="mt-2 space-y-1">
            {payments.slice(0, 3).map(p => (
              <p key={p.id} className="text-xs text-red-400">· {p.supplier?.name}（{p.store?.name}）逾期 {p.overdue_days} 天，{formatAmount(p.amount)}</p>
            ))}
            {payments.length > 3 && <p className="text-xs text-red-300">等 {payments.length} 笔...</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
