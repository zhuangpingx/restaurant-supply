'use client'
import { useState } from 'react'
import { Store, ChevronRight, MapPin, User } from 'lucide-react'
import { formatAmount } from '@/lib/utils'

interface StoreWithStats { id: string; name: string; address: string | null; manager: { id: string; name: string; phone: string } | null; stats: { total: number; overdue: number; severe: number } }

export default function StoreList({ stores }: { stores: StoreWithStats[]; isBoss: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (stores.length === 0) return <div className="text-center py-16 text-sm text-gray-300">暂无门店</div>
  return (
    <div className="mt-3 space-y-2">
      {stores.map(store => (
        <div key={store.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button onClick={() => setExpanded(expanded === store.id ? null : store.id)} className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"><Store className="w-4 h-4 text-gray-500" /></div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{store.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{store.manager?.name ?? '暂无店长'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {store.stats.severe > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">逾期</span>}
              <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${expanded === store.id ? 'rotate-90' : ''}`} />
            </div>
          </button>
          {expanded === store.id && (
            <div className="border-t border-gray-50 px-4 py-4 space-y-3">
              {store.address && <div className="flex items-start gap-2 text-xs text-gray-500"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>{store.address}</span></div>}
              {store.manager && <div className="flex items-center gap-2 text-xs text-gray-500"><User className="w-3.5 h-3.5 flex-shrink-0" /><span>{store.manager.name} · {store.manager.phone}</span></div>}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[['待付款', formatAmount(store.stats.total), 'text-gray-900'], ['已逾期', formatAmount(store.stats.overdue), store.stats.overdue > 0 ? 'text-orange-500' : 'text-gray-400'], ['超60天', formatAmount(store.stats.severe), store.stats.severe > 0 ? 'text-red-500' : 'text-gray-400']].map(([label, value, color]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className={`text-xs font-bold mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
