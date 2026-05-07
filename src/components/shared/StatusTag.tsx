import { cn } from '@/lib/utils'
export default function StatusTag({ label, className }: { label: string; className?: string }) {
  return <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', className)}>{label}</span>
}
