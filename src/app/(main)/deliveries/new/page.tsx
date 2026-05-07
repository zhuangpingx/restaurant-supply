import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageContainer from '@/components/layout/PageContainer'
import CreateDeliveryForm from './CreateDeliveryForm'

export default async function NewDeliveryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'supplier') redirect('/deliveries')

  const { data: stores } = await supabase.from('stores').select('id, name').eq('is_active', true).order('name')

  return (
    <PageContainer>
      <div className="py-2">
        <h1 className="text-base font-semibold text-gray-900">新建送货单</h1>
        <p className="text-xs text-gray-400 mt-0.5">填写本次送货信息</p>
      </div>
      <CreateDeliveryForm stores={stores ?? []} />
    </PageContainer>
  )
}
