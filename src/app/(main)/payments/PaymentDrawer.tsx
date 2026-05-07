'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { formatAmount, formatDate, formatDateTime, getOverdueLevel, getOverdueStyle } from '@/lib/utils'
import type { Payment } from '@/types'
import { markAsPaid, uploadPaymentProof } from '@/lib/actions/payments'
import toast from 'react-hot-toast'

export default function PaymentDrawer({ payment, isFinance, onClose }: { payment: Payment; isFinance: boolean; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [zoomedImg, setZoomedImg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isPaid = payment.status === 'paid'
  const level = getOverdueLevel(payment.overdue_days, payment.status)
  const style = getOverdueStyle(level)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const result = await uploadPaymentProof(fd)
      if (result.error) { toast.error(result.error); return }
      setProofUrl(result.url!); toast.success('凭证上传成功')
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleMarkPaid() {
    setLoading(true)
    try {
      const result = await markAsPaid(payment.id, { payment_notes: notes || undefined, payment_proof: proofUrl || undefined })
      if (result.error) { toast.error(result.error); return }
      toast.success('已标记付款'); onClose(); router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">付款详情</h2>
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 pb-8 space-y-5">
          {!isPaid && level !== 'normal' && (
            <div className={`rounded-xl px-4 py-3 ${style.bg}`}>
              <p className={`text-sm font-semibold ${style.text}`}>{level === 'severe' ? `⚠️ 严重逾期 ${payment.overdue_days} 天` : level === 'overdue' ? `已逾期 ${payment.overdue_days} 天` : `还有 ${payment.overdue_days} 天到期`}</p>
              {level === 'severe' && <p className="text-xs text-red-400 mt-0.5">请优先处理，避免影响供应商关系</p>}
            </div>
          )}
          {isPaid && (
            <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700">已付款</p>
                <p className="text-xs text-green-500 mt-0.5">{formatDateTime(payment.paid_at!)}{payment.paid_by_user && ` · ${payment.paid_by_user.name}`}</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {[['供应商', payment.supplier?.name], ['配送门店', payment.store?.name], ['金额', formatAmount(payment.amount)], ['账期', `${payment.payment_term_days} 天`], ['到期日', formatDate(payment.due_date)]].map(([label, value]) =>
              value ? <div key={label} className="flex items-start justify-between gap-4"><span className="text-sm text-gray-400 flex-shrink-0">{label}</span><span className={`text-sm text-right break-all ${label === '金额' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{value}</span></div> : null
            )}
            {payment.supplier?.bank_info && <div className="flex items-start justify-between gap-4"><span className="text-sm text-gray-400 flex-shrink-0">收款信息</span><span className="text-sm text-right break-all text-gray-700">{payment.supplier.bank_info}</span></div>}
          </div>

          {isPaid && payment.payment_proof && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">付款凭证</p>
              <button onClick={() => setZoomedImg(payment.payment_proof!)} className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-100">
                <Image src={payment.payment_proof} alt="付款凭证" fill className="object-cover" />
              </button>
            </div>
          )}

          {isFinance && !isPaid && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700">标记付款</p>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">付款凭证（可选）</p>
                {proofUrl ? (
                  <div className="relative">
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-100"><Image src={proofUrl} alt="付款凭证" fill className="object-cover" /></div>
                    <button onClick={() => setProofUrl(null)} className="absolute top-2 right-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-50">
                    {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">上传中...</span></> : <><Upload className="w-5 h-5" /><span className="text-xs">上传付款截图</span></>}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} capture="environment" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">备注（可选）</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="如：微信转账、银行转账等..." rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 resize-none placeholder:text-gray-300" />
              </div>
              <button onClick={handleMarkPaid} disabled={loading}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />处理中...</span> : `确认已付款 ${formatAmount(payment.amount)}`}
              </button>
            </div>
          )}
        </div>
      </div>
      {zoomedImg && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomedImg(null)}>
          <div className="relative w-full max-w-sm aspect-square"><Image src={zoomedImg} alt="查看图片" fill className="object-contain" /></div>
          <button className="absolute top-6 right-6 text-white/60" onClick={() => setZoomedImg(null)}><X className="w-6 h-6" /></button>
        </div>
      )}
    </>
  )
}
