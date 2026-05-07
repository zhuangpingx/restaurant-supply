import { PackageOpen } from 'lucide-react'
export default function EmptyState({ title = '暂无数据', description = '这里空空如也' }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageOpen className="w-12 h-12 text-gray-200 mb-3" />
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {description && <p className="text-xs text-gray-300 mt-1">{description}</p>}
    </div>
  )
}
