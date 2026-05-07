'use client'
import Link from 'next/link'
import { formatRelative } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types'
import { Truck, CheckCircle2, XCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react'

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; urgent?: boolean }> = {
  delivery_created:   { icon: Truck,         color: 'text-blue-500',   bg: 'bg-blue-50',   urgent: true },
  delivery_confirmed: { icon: CheckCircle2,  color: 'text-green-500',  bg: 'bg-green-50' },
  delivery_rejected:  { icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50',    urgent: true },
  payment_due_soon:   { icon: Clock,         color: 'text-yellow-500', bg: 'bg-yellow-50', urgent: true },
  payment_overdue:    { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', urgent: true },
  payment_severe:     { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',    urgent: true },
  payment_completed:  { icon: CreditCard,    color: 'text-green-500',  bg: 'bg-green-50' },
}

export default function NotificationList({ notifications }: { notifications: Notification[] }) {
  if (!notifications.length) {
    return <div className="text-center py-16 text-sm text-gray-300">暂无通知</div>
  }

  return (
    <div className="mt-3 space-y-2">
      {notifications.map(n => {
        const cfg = typeConfig[n.type]
        const Icon = cfg.icon
        const href = n.delivery_id ? `/deliveries/${n.delivery_id}` : n.payment_id ? `/payments` : undefined
        const isUrgent = cfg.urgent && !n.is_read

        const content = (
          <div className={`
            flex items-start gap-3 p-4 rounded-2xl border transition-colors
            ${isUrgent ? 'border-orange-200 bg-orange-50/30' : n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50/30 border-blue-100'}
          `}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold ${isUrgent ? 'text-gray-900' : 'text-gray-700'}`}>
                  {isUrgent && '🔔 '}{n.title}
                </p>
                {!n.is_read && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
              {n.body && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.body}</p>}
              <p className="text-xs text-gray-300 mt-1.5">{formatRelative(n.created_at)}</p>
            </div>
          </div>
        )

        if (href) return <Link key={n.id} href={href} className="block active:opacity-80">{content}</Link>
        return <div key={n.id}>{content}</div>
      })}
    </div>
  )
}
