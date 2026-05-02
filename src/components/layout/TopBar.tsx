'use client'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import NotificationBell from './TopBarClient'
import type { User } from '@/types'

const roleLabel: Record<string, string> = { boss: '老板', store_manager: '店长', supplier: '供应商', finance: '财务' }

export default function TopBar({ user, unreadCount }: { user: User; unreadCount: number }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">供应链协同</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{roleLabel[user.role]}</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell userId={user.id} initialCount={unreadCount} />
          <button onClick={() => setShowMenu(v => !v)} className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-xs font-medium text-white">
            {user.name.slice(0, 1)}
          </button>
        </div>
      </header>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="fixed top-14 right-4 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px]">
            <div className="px-4 py-2 border-b border-gray-50">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400">{user.phone}</p>
            </div>
            <form action={signOut}>
              <button type="submit" className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                <LogOut className="w-4 h-4" />退出登录
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}
