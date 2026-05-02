'use client'
import { useState, useRef } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { uploadDeliveryPhoto } from '@/lib/actions/deliveries'
import toast from 'react-hot-toast'

interface ImageUploadProps { value: string[]; onChange: (urls: string[]) => void; maxCount?: number; label?: string }

export default function ImageUpload({ value, onChange, maxCount = 6, label = '上传图片' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const toUpload = files.slice(0, maxCount - value.length)
    if (!toUpload.length) { toast.error(`最多上传 ${maxCount} 张图片`); return }
    setUploading(true)
    try {
      const results = await Promise.all(toUpload.map(file => { const fd = new FormData(); fd.append('file', file); return uploadDeliveryPhoto(fd) }))
      const urls = results.filter(r => r.url).map(r => r.url!)
      const failed = results.filter(r => r.error).length
      if (failed > 0) toast.error(`${failed} 张图片上传失败`)
      if (urls.length > 0) { onChange([...value, ...urls]); toast.success('上传成功') }
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {value.map(url => (
          <div key={url} className="relative w-20 h-20">
            <Image src={url} alt="照片" fill className="object-cover rounded-xl border border-gray-100" />
            <button type="button" onClick={() => onChange(value.filter(u => u !== url))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {value.length < maxCount && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-300 hover:border-gray-300 active:bg-gray-50">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5" /><span className="text-xs">拍照</span></>}
          </button>
        )}
      </div>
      {value.length > 0 && <p className="text-xs text-gray-400">{value.length}/{maxCount} 张</p>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFileChange} capture="environment" />
    </div>
  )
}
