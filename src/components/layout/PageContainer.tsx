import { cn } from '@/lib/utils'
interface PageContainerProps { children: React.ReactNode; className?: string }
export default function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn('max-w-2xl mx-auto px-4 py-4', className)}>{children}</div>
}
