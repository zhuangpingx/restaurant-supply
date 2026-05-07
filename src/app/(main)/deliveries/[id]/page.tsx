import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PageContainer from '@/components/layout/PageContainer'
import DeliveryDetail from './DeliveryDetail'
import { getDelivery } from '@/lib/actions/deliveries'

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const { id } = await params
  const { data: delivery, error } = await getDelivery(id)
  if (error || !delivery) notFound()

  return <PageContainer><DeliveryDetail delivery={delivery} role={profile?.role ?? ''} /></PageContainer>
}
