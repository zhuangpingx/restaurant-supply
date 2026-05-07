'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Camera, FileText, Sparkles, X } from 'lucide-react'
import { createDelivery, uploadDeliveryPhoto } from '@/lib/actions/deliveries'
import { recognizeDeliveryNote } from '@/lib/actions/ai'
import ImageUpload from '@/components/shared/ImageUpload'
import toast from 'react-hot-toast'
import { formatAmount } from '@/lib/utils'

interface Store { id: string; name: string }
interface ItemRow { id: string; name: string; unit: string; quantity: string; unit_price: string }

const UNITS = ['kg', 'g', '件', '箱', '袋', '瓶', '桶', '包', '捆', '扎', '条', '块', '个', '只', '头', '斤', '两', '升', '罐']

function newItem(): ItemRow {
  return { id: Math.random().toString(36).slice(2), name: '', unit: 'kg', quantity: '', unit_price: '' }
}

type InputMode = 'form' | 'quick' | 'ai'

export default function CreateDeliveryForm({ stores }: { stores: Store[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [storeId, setStoreId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [items, setItems] = useState<ItemRow[]>([newItem()])
  const [mode, setMode] = useState<InputMode>('form')
  const [quickText, setQuickText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiImage, setAiImage] = useState<string | null>(null)
  const aiFileRef = useRef<HTMLInputElement>(null)

  const totalAmount = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
  }, 0)

  function updateItem(id: string, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  // 快速批量输入解析
  // 格式：牛肉 20 kg 50 或 牛肉 20kg 50
  function parseQuickText() {
    const lines = quickText.trim().split('\n').filter(l => l.trim())
    if (!lines.length) { toast.error('请输入商品信息'); return }

    const parsed: ItemRow[] = []
    const failed: string[] = []

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 2) { failed.push(line); continue }

      const name = parts[0]
      let quantity = '', unit = 'kg', unit_price = ''

      if (parts.length === 2) {
        // 格式：牛肉 20（只有数量，单位默认kg）
        quantity = parts[1]
      } else if (parts.length === 3) {
        // 格式：牛肉 20 50（数量+单价）或 牛肉 20kg 50
        const match = parts[1].match(/^(\d+\.?\d*)([^\d]*)$/)
        if (match && match[2]) {
          quantity = match[1]
          unit = match[2] || 'kg'
          unit_price = parts[2]
        } else {
          quantity = parts[1]
          unit_price = parts[2]
        }
      } else if (parts.length >= 4) {
        // 格式：牛肉 20 kg 50
        quantity = parts[1]
        unit = parts[2]
        unit_price = parts[3]
      }

      if (!quantity || isNaN(parseFloat(quantity))) { failed.push(line); continue }

      parsed.push({
        id: Math.random().toString(36).slice(2),
        name, unit, quantity, unit_price,
      })
    }

    if (parsed.length === 0) { toast.error('没有识别到有效商品，请检查格式'); return }
    if (failed.length > 0) toast(`${failed.length} 行格式有误已跳过`)

    setItems(parsed)
    setMode('form')
    toast.success(`已导入 ${parsed.length} 个商品`)
  }

  // AI 识别图片
  async function handleAiRecognize(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 先上传图片
    setAiLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploadResult = await uploadDeliveryPhoto(fd)
      if (uploadResult.error) { toast.error('图片上传失败'); return }

      setAiImage(uploadResult.url!)

      // AI 识别
      const result = await recognizeDeliveryNote(uploadResult.url!)
      if (result.error) { toast.error(result.error); return }

      if (result.items && result.items.length > 0) {
        setItems(result.items.map(item => ({
          id: Math.random().toString(36).slice(2),
          name: item.name,
          unit: item.unit || 'kg',
          quantity: String(item.quantity || ''),
          unit_price: String(item.unit_price || ''),
        })))
        setMode('form')
        toast.success(`AI 识别到 ${result.items.length} 个商品，请核对后提交`)
      } else {
        toast.error('未识别到商品，请手动填写')
        setMode('form')
      }
    } finally {
      setAiLoading(false)
      if (aiFileRef.current) aiFileRef.current.value = ''
    }
  }

  async function handleSubmit() {
    if (!storeId) { toast.error('请选择门店'); return }
    if (!deliveryDate) { toast.error('请选择送货日期'); return }
    const validItems = items.filter(item => item.name && parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) > 0)
    if (!validItems.length) { toast.error('请至少填写一条商品信息（需有名称、数量、单价）'); return }

    setLoading(true)
    try {
      const result = await createDelivery({
        store_id: storeId,
        delivery_date: deliveryDate,
        notes: notes || undefined,
        photos,
        items: validItems.map(item => ({
          name: item.name,
          unit: item.unit,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('送货单已提交')
      router.push('/deliveries')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 pb-10">
      {/* 基本信息 */}
      <Section title="基本信息">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">配送门店</label>
          <select value={storeId} onChange={e => setStoreId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900 bg-white appearance-none">
            <option value="">请选择门店</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">送货日期</label>
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900" />
        </div>
      </Section>

      {/* 商品明细 */}
      <Section title="商品明细">
        {/* 输入模式切换 */}
        <div className="flex gap-2 mb-3">
          {[
            { key: 'form', label: '逐行填写', icon: FileText },
            { key: 'quick', label: '批量输入', icon: FileText },
            { key: 'ai', label: 'AI 识别', icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setMode(key as InputMode)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all
                ${mode === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* 逐行填写 */}
        {mode === 'form' && (
          <>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0">{index + 1}</span>
                    <input type="text" placeholder="商品名称" value={item.name}
                      onChange={e => updateItem(item.id, 'name', e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 min-w-0" />
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                        className="p-1.5 text-gray-300 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <input type="number" inputMode="decimal" placeholder="数量" value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                      className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-gray-900 text-center" />
                    <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      className="w-16 bg-white border border-gray-200 rounded-lg px-1 py-2 text-sm outline-none focus:border-gray-900 text-center">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <span className="text-gray-300">×</span>
                    <div className="flex-1 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                      <input type="number" inputMode="decimal" placeholder="单价" value={item.unit_price}
                        onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg pl-5 pr-2 py-2 text-sm outline-none focus:border-gray-900" />
                    </div>
                  </div>
                  {(parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) > 0 && (
                    <div className="text-right ml-6 text-xs text-gray-400">
                      小计：<span className="font-medium text-gray-700">{formatAmount((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems(prev => [...prev, newItem()])}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 active:bg-gray-50">
              <Plus className="w-4 h-4" />添加商品
            </button>
          </>
        )}

        {/* 批量快速输入 */}
        {mode === 'quick' && (
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600 space-y-1">
              <p className="font-medium">📝 输入格式（每行一个商品）</p>
              <p>商品名 数量 单位 单价</p>
              <p className="text-blue-400">例如：</p>
              <p className="font-mono">牛肉 20 kg 50</p>
              <p className="font-mono">蔬菜 5 箱 30</p>
              <p className="font-mono">可乐 2 箱 60</p>
            </div>
            <textarea value={quickText} onChange={e => setQuickText(e.target.value)}
              placeholder={'牛肉 20 kg 50\n蔬菜 5 箱 30\n可乐 2 箱 60'}
              rows={8} autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono outline-none focus:border-gray-900 resize-none placeholder:text-gray-300" />
            <button type="button" onClick={parseQuickText}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium active:opacity-80">
              解析并填入
            </button>
          </div>
        )}

        {/* AI 识别 */}
        {mode === 'ai' && (
          <div className="space-y-3">
            <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-600 space-y-1">
              <p className="font-medium">✨ AI 自动识别送货单</p>
              <p>拍摄或上传送货单照片，AI 自动识别商品信息</p>
              <p>识别后可人工核对再提交</p>
            </div>

            {aiImage && (
              <div className="relative">
                <img src={aiImage} alt="送货单" className="w-full rounded-xl border border-gray-100 max-h-48 object-cover" />
                <button onClick={() => setAiImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <button type="button" onClick={() => aiFileRef.current?.click()} disabled={aiLoading}
              className="w-full h-32 border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center justify-center gap-2 text-purple-400 active:bg-purple-50">
              {aiLoading
                ? <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">AI 识别中...</span></>
                : <><Camera className="w-8 h-8" /><span className="text-sm font-medium">拍照 / 上传送货单</span><span className="text-xs">支持手写、打印单据</span></>
              }
            </button>
            <input ref={aiFileRef} type="file" accept="image/*" className="hidden"
              onChange={handleAiRecognize} capture="environment" />
          </div>
        )}

        {/* 合计 */}
        {mode === 'form' && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
            <span className="text-sm text-gray-500">合计</span>
            <span className="text-lg font-semibold text-gray-900">{formatAmount(totalAmount)}</span>
          </div>
        )}
      </Section>

      {/* 送货照片 */}
      <Section title="送货照片">
        <ImageUpload value={photos} onChange={setPhotos} maxCount={6} label="" />
        <p className="text-xs text-gray-400 mt-1">建议拍摄送货清单或货物照片，方便对账</p>
      </Section>

      {/* 备注 */}
      <Section title="备注">
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="可填写特殊说明、注意事项等..." rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-gray-900 resize-none placeholder:text-gray-300" />
      </Section>

      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all">
        {loading
          ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />提交中...</span>
          : `提交送货单（${formatAmount(totalAmount)}）`
        }
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
