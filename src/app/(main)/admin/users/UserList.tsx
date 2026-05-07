'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, UserCheck, UserX, Loader2, X, Check } from 'lucide-react'
import { createUser, updateUserRole, toggleUserActive, bindManagerToStore, bindSupplier, bindReceiverToStore } from '@/lib/actions/admin'
import toast from 'react-hot-toast'
import type { UserRole } from '@/types'

interface User { id: string; phone: string; name: string; role: UserRole; is_active: boolean; created_at: string }
interface Store { id: string; name: string }
interface Supplier { id: string; name: string }

const roleLabel: Record<string, string> = {
  boss: '老板', store_manager: '店长', supplier: '供应商', finance: '财务', receiver: '收货员'
}
const roleColor: Record<string, string> = {
  boss: 'bg-purple-100 text-purple-700',
  store_manager: 'bg-blue-100 text-blue-700',
  supplier: 'bg-green-100 text-green-700',
  finance: 'bg-orange-100 text-orange-700',
  receiver: 'bg-cyan-100 text-cyan-700',
}

export default function UserList({ users, stores, suppliers, currentUserId }: {
  users: User[]; stores: Store[]; suppliers: Supplier[]; currentUserId: string
}) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)

  return (
    <>
      <button onClick={() => setShowAdd(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium active:opacity-80">
        <Plus className="w-4 h-4" />添加账号
      </button>

      <div className="mt-3 space-y-2">
        {users.map(u => (
          <button key={u.id} onClick={() => setSelected(u)}
            className="w-full text-left bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center justify-between active:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${u.is_active ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-300'}`}>
                {u.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${u.is_active ? 'text-gray-900' : 'text-gray-400'}`}>{u.name}</p>
                  {!u.is_active && <span className="text-xs text-gray-300">已禁用</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{u.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColor[u.role]}`}>{roleLabel[u.role]}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </button>
        ))}
      </div>

      {showAdd && (
        <AddUserDrawer stores={stores} suppliers={suppliers}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); router.refresh() }} />
      )}

      {selected && (
        <EditUserDrawer user={selected} stores={stores} suppliers={suppliers}
          isSelf={selected.id === currentUserId}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); router.refresh() }} />
      )}
    </>
  )
}

function AddUserDrawer({ stores, suppliers, onClose, onSuccess }: {
  stores: Store[]; suppliers: Supplier[]; onClose: () => void; onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ phone: '', name: '', role: 'receiver', password: 'supply123456' })

  async function handleSubmit() {
    if (!form.phone.trim()) { toast.error('请输入手机号'); return }
    if (!/^1[3-9]\d{9}$/.test(form.phone)) { toast.error('手机号格式不正确'); return }
    if (!form.name.trim()) { toast.error('请输入姓名'); return }
    setLoading(true)
    try {
      const result = await createUser(form)
      if (result.error) { toast.error(result.error); return }
      toast.success('账号创建成功')
      onSuccess()
    } finally { setLoading(false) }
  }

  return (
    <Drawer title="添加账号" onClose={onClose}>
      <div className="space-y-4">
        <Field label="手机号">
          <input type="tel" inputMode="numeric" placeholder="13800000000" value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={11}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900" />
        </Field>
        <Field label="姓名">
          <input type="text" placeholder="请输入姓名" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900" />
        </Field>
        <Field label="角色">
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900 bg-white">
            <option value="receiver">收货员（后厨/各品类负责人）</option>
            <option value="store_manager">店长</option>
            <option value="supplier">供应商</option>
            <option value="finance">财务</option>
            <option value="boss">老板</option>
          </select>
        </Field>

        {/* 角色说明 */}
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
          {form.role === 'receiver' && <p>📦 收货员：可确认/驳回送货单，不看财务数据</p>}
          {form.role === 'store_manager' && <p>🏪 店长：管理本店送货单，查看本店待付款</p>}
          {form.role === 'supplier' && <p>🚚 供应商：提交送货单，查看收款状态</p>}
          {form.role === 'finance' && <p>💰 财务：标记付款，查看全部账单统计</p>}
          {form.role === 'boss' && <p>👑 老板：查看全部数据，管理账号</p>}
        </div>

        <Field label="初始密码">
          <input type="text" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900" />
        </Field>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40 active:scale-[0.98]">
          {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />创建中...</span> : '创建账号'}
        </button>
      </div>
    </Drawer>
  )
}

function EditUserDrawer({ user, stores, suppliers, isSelf, onClose, onSuccess }: {
  user: User; stores: Store[]; suppliers: Supplier[]; isSelf: boolean; onClose: () => void; onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(user.role)
  const [storeId, setStoreId] = useState('')
  const [supplierId, setSupplierId] = useState('')

  async function handleSaveRole() {
    if (role === user.role) { toast('角色未变更'); return }
    setLoading(true)
    try {
      const result = await updateUserRole(user.id, role)
      if (result.error) { toast.error(result.error); return }
      toast.success('角色已更新'); onSuccess()
    } finally { setLoading(false) }
  }

  async function handleBindStore() {
    if (!storeId) { toast.error('请选择门店'); return }
    setLoading(true)
    try {
      const fn = (role === 'receiver' || user.role === 'receiver') ? bindReceiverToStore : bindManagerToStore
      const result = await fn(user.id, storeId)
      if (result.error) { toast.error(result.error); return }
      toast.success('已绑定门店'); onSuccess()
    } finally { setLoading(false) }
  }

  async function handleBindSupplier() {
    if (!supplierId) { toast.error('请选择供应商'); return }
    setLoading(true)
    try {
      const result = await bindSupplier(user.id, supplierId)
      if (result.error) { toast.error(result.error); return }
      toast.success('已绑定供应商'); onSuccess()
    } finally { setLoading(false) }
  }

  async function handleToggle() {
    setLoading(true)
    try {
      const result = await toggleUserActive(user.id, !user.is_active)
      if (result.error) { toast.error(result.error); return }
      toast.success(user.is_active ? '已禁用账号' : '已启用账号'); onSuccess()
    } finally { setLoading(false) }
  }

  const isReceiverOrManager = ['receiver', 'store_manager'].includes(role) || ['receiver', 'store_manager'].includes(user.role)
  const isSupplierRole = role === 'supplier' || user.role === 'supplier'

  return (
    <Drawer title="编辑账号" onClose={onClose}>
      <div className="space-y-5">
        <div className="bg-gray-50 rounded-xl p-4 space-y-1">
          <p className="text-base font-semibold text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500">{user.phone}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${roleColor[user.role]}`}>{roleLabel[user.role]}</span>
        </div>

        {!isSelf && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">修改角色</p>
            <div className="flex gap-2">
              <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 bg-white">
                <option value="receiver">收货员</option>
                <option value="store_manager">店长</option>
                <option value="supplier">供应商</option>
                <option value="finance">财务</option>
                <option value="boss">老板</option>
              </select>
              <button onClick={handleSaveRole} disabled={loading || role === user.role}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 绑定门店（店长或收货员） */}
        {isReceiverOrManager && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {role === 'receiver' || user.role === 'receiver' ? '绑定门店（可多个）' : '绑定门店'}
            </p>
            <div className="flex gap-2">
              <select value={storeId} onChange={e => setStoreId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 bg-white">
                <option value="">选择门店</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={handleBindStore} disabled={loading || !storeId}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
            </div>
            {(role === 'receiver' || user.role === 'receiver') && (
              <p className="text-xs text-gray-400">收货员可绑定多个门店</p>
            )}
          </div>
        )}

        {/* 绑定供应商 */}
        {isSupplierRole && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">绑定供应商</p>
            <div className="flex gap-2">
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 bg-white">
                <option value="">选择供应商</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={handleBindSupplier} disabled={loading || !supplierId}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!isSelf && (
          <button onClick={handleToggle} disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-medium border ${user.is_active ? 'border-red-200 text-red-500 active:bg-red-50' : 'border-green-200 text-green-600 active:bg-green-50'}`}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />处理中...</span>
              : user.is_active
                ? <span className="flex items-center justify-center gap-2"><UserX className="w-4 h-4" />禁用账号</span>
                : <span className="flex items-center justify-center gap-2"><UserCheck className="w-4 h-4" />启用账号</span>
            }
          </button>
        )}
      </div>
    </Drawer>
  )
}

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-5 pb-10">{children}</div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">{label}</label>{children}</div>
}
