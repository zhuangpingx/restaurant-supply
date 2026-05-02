'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatDate, formatDateTime, formatAmount, getDeliveryStatusLabel, getDeliveryStatusStyle } from '@/lib/utils'
import type { Delivery, DeliveryItem } from '@/types'
import { confirmDelivery, rejectDelivery, confirmWithEdits, type UpdateItemInput } from '@/lib/actions/confirm'
import toast from 'react-hot-toast'
import { Loader2, ChevronLeft, Pencil, Check, X } from 'lucide-react'

interface EditableItem extends DeliveryItem { editQty: string; editPrice: string; isEditing: boolean }

export default function DeliveryDetail({ delivery, role }: { delivery: Delivery; role: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null)
  const [hasEdits, setHasEdits] = useState(false)
  const [editItems, setEditItems] = useState<EditableItem[]>(
    (delivery.delivery_items ?? []).map(item => ({ ...item, editQty: String(item.quantity), editPrice: String(item.unit_price), isEditing: false }))
  )

  const canConfirm = ['store_manager', 'boss'].includes(role) && delivery.status === 'pending'

  function startEdit(id: string) { setEditItems(prev => prev.map(item => item.id === id ? { ...item, isEditing: true } : item)) }
  function cancelEdit(id: string) { setEditItems(prev => prev.map(item => item.id === id ? { ...item, editQty: String(item.quantity), editPrice: String(item.unit_price), isEditing: false } : item)) }
  function saveEdit(id: string) {
    setEditItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const qty = parseFloat(item.editQty); const price = parseFloat(item.editPrice)
      if (isNaN(qty) || qty <= 0) { toast.error('数量必须大于0'); return item }
      if (isNaN(price) || price <= 0) { toast.error('单价必须大于0'); return item }
      if (qty !== item.quantity || price !== item.unit_price) setHasEdits(true)
      return { ...item, quantity: qty, unit_price: price, amount: qty * price, isEditing: false }
    }))
  }

  const currentTotal = editItems.reduce((sum, i) => sum + i.amount, 0)

  async function handleConfirm() {
    setLoading(true)
    try {
      const result = hasEdits
        ? await confirmWithEdits(delivery.id, editItems.map(i => ({ id: i.id, quantity: i.quantity, unit_price: i.unit_price })) as UpdateItemInput[])
        : await confirmDelivery(delivery.id)
      if (result.error) { toast.error(result.error); return }
      toast.success(hasEdits ? '已修改并确认' : '已确认送货单')
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast.error('请填写驳回原因'); return }
    setLoading(true)
    try {
      const result = await rejectDelivery(delivery.id, rejectReason)
      if (result.error) { toast.error(result.error); return }
      toast.success('已驳回'); setShowReject(false); router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 pb-36">
      <div className="flex items-center gap-2 py-2">
        <button onClick={() => router.back()} className="p-1 -ml-1"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
        <h1 className="text-base font-semibold text-gray-900">送货单详情</h1>
        <span className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full ${getDeliveryStatusStyle(delivery.status)}`}>{getDeliveryStatusLabel(delivery.status)}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {[['供应商', delivery.supplier?.name], ['配送门店', delivery.store?.name], ['送货日期', formatDate(delivery.delivery_date)], ['提交时间', formatDateTime(delivery.created_at)]].map(([label, value]) =>
          value ? <div key={label} className="flex items-start justify-between px-4 py-3 gap-4"><span className="text-sm text-gray-400 flex-shrink-0">{label}</span><span className="text-sm text-gray-900 text-right">{value}</span></div> : null
        )}
        {delivery.confirmed_at && <div className="flex items-start justify-between px-4 py-3 gap-4"><span className="text-sm text-gray-400 flex-shrink-0">{delivery.status === 'rejected' ? '驳回时间' : '确认时间'}</span><span className="text-sm text-gray-900 text-right">{formatDateTime(delivery.confirmed_at)}</span></div>}
        {delivery.notes && <div className="flex items-start justify-between px-4 py-3 gap-4"><span className="text-sm text-gray-400 flex-shrink-0">备注</span><span className="text-sm text-gray-900 text-right">{delivery.notes}</span></div>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">商品明细</h2>
          {canConfirm && <span className="text-xs text-gray-400">点击铅笔图标修改数量</span>}
        </div>
        <div className="divide-y divide-gray-50">
          {editItems.map(item => (
            <div key={item.id} className="px-4 py-3">
              {item.isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => cancelEdit(item.id)} className="p-1 text-gray-300"><X className="w-4 h-4" /></button>
                      <button onClick={() => saveEdit(item.id)} className="p-1 text-green-500"><Check className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">数量（{item.unit}）</label>
                      <input type="number" inputMode="decimal" value={item.editQty} onChange={e => setEditItems(prev => prev.map(i => i.id === item.id ? { ...i, editQty: e.target.value } : i))} autoFocus
                        className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 text-center" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">单价（元）</label>
                      <input type="number" inputMode="decimal" value={item.editPrice} onChange={e => setEditItems(prev => prev.map(i => i.id === item.id ? { ...i, editPrice: e.target.value } : i))}
                        className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 text-center" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.original_quantity !== null && item.original_quantity !== item.quantity && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md">已修改</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.quantity}{item.unit} × ¥{item.unit_price}
                      {item.original_quantity !== null && item.original_quantity !== item.quantity && <span className="ml-2 line-through text-gray-300">原 {item.original_quantity}{item.unit}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-sm font-semibold text-gray-900">{formatAmount(item.amount)}</span>
                    {canConfirm && <button onClick={() => startEdit(item.id)} className="p-1 text-gray-300 hover:text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div><span className="text-sm text-gray-500">合计</span>{hasEdits && <span className="ml-2 text-xs text-orange-500">（已修改）</span>}</div>
          <div className="text-right">
            {hasEdits && <p className="text-xs text-gray-300 line-through">原：{formatAmount(delivery.total_amount)}</p>}
            <p className="text-lg font-bold text-gray-900">{formatAmount(currentTotal)}</p>
          </div>
        </div>
      </div>

      {delivery.status === 'rejected' && delivery.rejection_reason && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <p className="text-xs font-semibold text-red-400 mb-1">驳回原因</p>
          <p className="text-sm text-red-600">{delivery.rejection_reason}</p>
        </div>
      )}

      {delivery.photos && delivery.photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">送货照片</h2>
          <div className="grid grid-cols-3 gap-2">
            {delivery.photos.map((url, i) => (
              <button key={i} onClick={() => setZoomedPhoto(url)} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                <Image src={url} alt={`照片${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {canConfirm && !showReject && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-4 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-8 pointer-events-none">
          <div className="flex gap-3 max-w-2xl mx-auto pointer-events-auto">
            <button onClick={() => setShowReject(true)} className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 active:bg-gray-50">驳回</button>
            <button onClick={handleConfirm} disabled={loading || editItems.some(i => i.isEditing)}
              className="flex-[2] py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all">
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />处理中...</span> : hasEdits ? '修改并确认' : '确认收货'}
            </button>
          </div>
        </div>
      )}

      {canConfirm && showReject && (
        <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 pt-4 pb-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-sm font-medium text-gray-700">驳回原因</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请说明驳回原因，将通知供应商..." rows={3} autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 resize-none placeholder:text-gray-300" />
            <div className="flex gap-3">
              <button onClick={() => { setShowReject(false); setRejectReason('') }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">取消</button>
              <button onClick={handleReject} disabled={loading || !rejectReason.trim()} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40">
                {loading ? '提交中...' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomedPhoto(null)}>
          <div className="relative w-full max-w-sm aspect-square"><Image src={zoomedPhoto} alt="送货照片" fill className="object-contain" /></div>
          <button className="absolute top-6 right-6 text-white/60" onClick={() => setZoomedPhoto(null)}><X className="w-6 h-6" /></button>
        </div>
      )}
    </div>
  )
}
