'use client'
import { useState } from 'react'
import { Users, Phone, ChevronRight, Clock } from 'lucide-react'
import { formatAmount } from '@/lib/utils'

interface SupplierWithStats { id: string; name: string; phone: string | null; category: string | null; payment_term_days: number; bank_info: string | null; notes: string | null; stats: { pending: number; paid: number; overdue: number; severe: number } }

export default function SupplierList({ suppliers }: { suppliers: SupplierWithStats[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (suppliers.length === 0) return <div className="text-center py-16 text-sm text-gray-300">暂无供应商</div>
  return (
    <div className="mt-3 space-y-2">
      {suppliers.map(s => (
        <div key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"><Users className="w-4 h-4 text-gray-500" /></div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  {s.category && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{s.category}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5"><Clock className="w-3 h-3 text-gray-300" /><p className="text-xs text-gray-400">账期 {s.payment_term_days} 天</p></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.stats.severe > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">严重逾期</span>}
              <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${expanded === s.id ? 'rotate-90' : ''}`} />
            </div>
          </button>
          {expanded === s.id && (
            <div className="border-t border-gray-50 px-4 py-4 space-y-4">
              <div className="space-y-2">
                {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-xs text-blue-500"><Phone className="w-3.5 h-3.5" />{s.phone}</a>}
                {s.bank_info && <p className="text-xs text-gray-500">收款：{s.bank_info}</p>}
                {s.notes && <p className="text-xs text-gray-400">{s.notes}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['待付款', formatAmount(s.stats.pending), s.stats.pending > 0 ? 'text-gray-900' : 'text-gray-300', 'bg-gray-50'], ['累计已付', formatAmount(s.stats.paid), 'text-green-600', 'bg-green-50'], ['已逾期', formatAmount(s.stats.overdue), s.stats.overdue > 0 ? 'text-orange-500' : 'text-gray-300', s.stats.overdue > 0 ? 'bg-orange-50' : 'bg-gray-50'], ['超60天', formatAmount(s.stats.severe), s.stats.severe > 0 ? 'text-red-500' : 'text-gray-300', s.stats.severe > 0 ? 'bg-red-50' : 'bg-gray-50']].map(([label, value, color, bg]) => (
                  <div key={label} className={`${bg} rounded-xl p-3`}><p className="text-xs text-gray-400">{label}</p><p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p></div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
