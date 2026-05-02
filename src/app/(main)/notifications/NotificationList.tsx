'use client'
import Link from 'next/link'
import { formatRelative } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types'
import { Truck, CheckCircle2, XCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react'

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  delivery_created: { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
  delivery_confirmed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  delivery_rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  payment_due_soon: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  payment_overdue: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
  payment_severe: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  payment_completed: { icon: CreditCard, color: 'text-green-500', bg: 'bg-green-50' },
}

export default function NotificationList({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) return <div className="text-center py-16 text-sm text-gray-300">暂无通知</div>
  return (
    <div className="mt-3 space-y-2">
      {notifications.map(n => {
        const cfg = typeConfig[n.type]; const Icon = cfg.icon
        const href = n.delivery_id ? `/deliveries/${n.delivery_id}` : n.payment_id ? '/payments' : undefined
        const content = (
          <div className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50/50 border-blue-100/50'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}><Icon className={`w-4 h-4 ${cfg.color}`} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{n.title}</p>
              {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>}
              <p className="text-xs text-gray-300 mt-1">{formatRelative(n.created_at)}</p>
            </div>
            {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
          </div>
        )
        if (href) return <Link key={n.id} href={href} className="block active:opacity-80">{content}</Link>
        return <div key={n.id}>{content}</div>
      })}
    </div>
  )
}
