import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageContainer from '@/components/layout/PageContainer'
import NotificationList from './NotificationList'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)

  return (
    <PageContainer>
      <div className="py-2"><h1 className="text-base font-semibold text-gray-900">通知</h1></div>
      <NotificationList notifications={notifications ?? []} />
    </PageContainer>
  )
}
