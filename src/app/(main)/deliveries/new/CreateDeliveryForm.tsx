'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { createDelivery } from '@/lib/actions/deliveries'
import ImageUpload from '@/components/shared/ImageUpload'
import toast from 'react-hot-toast'
import { formatAmount } from '@/lib/utils'

interface Store { id: string; name: string }
interface ItemRow { id: string; name: string; unit: string; quantity: string; unit_price: string }
const UNITS = ['件', 'kg', 'g', '箱', '袋', '瓶', '桶', '包', '捆']
const newItem = (): ItemRow => ({ id: Math.random().toString(36).slice(2), name: '', unit: 'kg', quantity: '', unit_price: '' })

export default function CreateDeliveryForm({ stores }: { stores: Store[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [storeId, setStoreId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [items, setItems] = useState<ItemRow[]>([newItem()])

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0)

  function updateItem(id: string, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  async function handleSubmit() {
    if (!storeId) { toast.error('请选择门店'); return }
    if (!deliveryDate) { toast.error('请选择送货日期'); return }
    const validItems = items.filter(item => item.name && parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) > 0)
    if (validItems.length === 0) { toast.error('请至少填写一条商品信息'); return }

    setLoading(true)
    try {
      const result = await createDelivery({
        store_id: storeId, delivery_date: deliveryDate, notes: notes || undefined, photos,
        items: validItems.map(item => ({ name: item.name, unit: item.unit, quantity: parseFloat(item.quantity), unit_price: parseFloat(item.unit_price) })),
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('送货单已提交')
      router.push('/deliveries')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-5 pb-10">
      <Section title="基本信息">
        <Field label="配送门店">
          <select value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900 bg-white">
            <option value="">请选择门店</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="送货日期">
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900" />
        </Field>
      </Section>

      <Section title="商品明细">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 flex-shrink-0">{index + 1}</span>
                <input type="text" placeholder="商品名称" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 min-w-0" />
                {items.length > 1 && (
                  <button type="button" onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 ml-6">
                <input type="number" inputMode="decimal" placeholder="数量" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-gray-900 text-center" />
                <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                  className="w-16 bg-white border border-gray-200 rounded-lg px-1 py-2 text-sm outline-none focus:border-gray-900 text-center">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <span className="text-gray-300">×</span>
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                  <input type="number" inputMode="decimal" placeholder="单价" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-5 pr-2 py-2 text-sm outline-none focus:border-gray-900" />
                </div>
              </div>
              {(parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) > 0 && (
                <div className="text-right ml-6">
                  <span className="text-xs text-gray-400">小计：</span>
                  <span className="text-sm font-medium text-gray-700">{formatAmount((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setItems(prev => [...prev, newItem()])}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 active:bg-gray-50">
          <Plus className="w-4 h-4" />添加商品
        </button>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
          <span className="text-sm text-gray-500">合计</span>
          <span className="text-lg font-semibold text-gray-900">{formatAmount(totalAmount)}</span>
        </div>
      </Section>

      <Section title="送货照片">
        <ImageUpload value={photos} onChange={setPhotos} maxCount={6} label="" />
        <p className="text-xs text-gray-400 mt-1">建议拍摄送货清单或货物照片，方便对账</p>
      </Section>

      <Section title="备注">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="可填写特殊说明、注意事项等..." rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900 resize-none placeholder:text-gray-300" />
      </Section>

      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all">
        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />提交中...</span> : `提交送货单（${formatAmount(totalAmount)}）`}
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">{label}</label>{children}</div>
}
