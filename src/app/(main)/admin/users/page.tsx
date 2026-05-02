import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageContainer from '@/components/layout/PageContainer'
import UserList from './UserList'
import { getUsers, getStoresAndSuppliers } from '@/lib/actions/admin'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'boss') redirect('/dashboard')

  const [{ data: users }, { stores, suppliers }] = await Promise.all([
    getUsers(),
    getStoresAndSuppliers(),
  ])

  return (
    <PageContainer>
      <div className="py-2 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">账号管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">管理系统用户和权限</p>
        </div>
        <span className="text-xs text-gray-400">共 {users?.length ?? 0} 个账号</span>
      </div>
      <UserList users={users ?? []} stores={stores} suppliers={suppliers} currentUserId={user.id} />
    </PageContainer>
  )
}
