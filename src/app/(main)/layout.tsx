import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar user={profile} unreadCount={count ?? 0} />
      <main className="flex-1 pb-20 pt-14">{children}</main>
      <BottomNav role={profile.role} />
    </div>
  )
}
