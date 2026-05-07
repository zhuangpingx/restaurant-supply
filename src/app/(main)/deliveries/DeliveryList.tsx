'use client'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { formatDate, formatAmount, getDeliveryStatusLabel, getDeliveryStatusStyle } from '@/lib/utils'
import EmptyState from '@/components/shared/EmptyState'
import type { Delivery } from '@/types'

export default function DeliveryList({ deliveries, role }: { deliveries: Delivery[]; role?: string }) {
  if (deliveries.length === 0) return <EmptyState title="暂无送货单" description={role === 'supplier' ? '点击右上角新建送货单' : '等待供应商提交送货单'} />
  return (
    <div className="mt-3 space-y-2">
      {deliveries.map(d => (
        <Link key={d.id} href={`/deliveries/${d.id}`}>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 active:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{d.supplier?.name ?? '未知供应商'}</span>
                {d.supplier?.category && <span className="text-xs text-gray-400">{d.supplier.category}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDeliveryStatusStyle(d.status)}`}>{getDeliveryStatusLabel(d.status)}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
              <span>{d.store?.name ?? '未知门店'}</span><span>·</span><span>{formatDate(d.delivery_date)}</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex flex-wrap gap-1">
                {d.delivery_items?.slice(0, 3).map(item => (
                  <span key={item.id} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">{item.name} ×{item.quantity}{item.unit}</span>
                ))}
                {(d.delivery_items?.length ?? 0) > 3 && <span className="text-xs text-gray-300">+{(d.delivery_items?.length ?? 0) - 3}项</span>}
              </div>
              <span className="text-base font-semibold text-gray-900 ml-2 flex-shrink-0">{formatAmount(d.total_amount)}</span>
            </div>
            {d.status === 'rejected' && d.rejection_reason && (
              <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1.5">驳回原因：{d.rejection_reason}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
