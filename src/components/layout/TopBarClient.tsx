'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NotificationBell({ userId, initialCount }: { userId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => setCount(c => c + 1))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, payload => { if (payload.new.is_read) setCount(c => Math.max(0, c - 1)) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <Link href="/notifications" className="relative p-1">
      <Bell className={`w-5 h-5 ${count > 0 ? 'text-gray-900' : 'text-gray-400'}`} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
