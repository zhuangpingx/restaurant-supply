'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Truck, CreditCard, Store, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

const navItems = [
  { href: '/dashboard',    label: '首页',   icon: LayoutDashboard, roles: ['boss','store_manager','supplier','finance','receiver'] },
  { href: '/deliveries',   label: '送货单', icon: Truck,           roles: ['boss','store_manager','supplier','finance','receiver'] },
  { href: '/payments',     label: '付款',   icon: CreditCard,      roles: ['boss','store_manager','supplier','finance'] },
  { href: '/stores',       label: '门店',   icon: Store,           roles: ['boss','finance'] },
  { href: '/suppliers',    label: '供应商', icon: Users,           roles: ['boss','finance'] },
  { href: '/admin/users',  label: '账号',   icon: Settings,        roles: ['boss'] },
]

export default function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const visible = navItems.filter(item => item.roles.includes(role))
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-gray-100 flex items-center justify-around px-2 safe-area-pb">
      {visible.map(item => {
        const Icon = item.icon
        const isActive = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href}
            className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[44px]',
              isActive ? 'text-gray-900' : 'text-gray-400')}>
            <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
