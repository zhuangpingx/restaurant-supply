import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { OverdueLevel, PaymentStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'yyyy-MM-dd', { locale: zhCN })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN })
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: zhCN, addSuffix: true })
}

export function getOverdueLevel(overdueDays: number, status: PaymentStatus): OverdueLevel {
  if (status === 'paid') return 'normal'
  if (overdueDays === 0) return 'normal'
  if (overdueDays <= 3) return 'due_soon'
  if (overdueDays <= 60) return 'overdue'
  return 'severe'
}

export function getOverdueStyle(level: OverdueLevel) {
  const styles = {
    normal:   { bg: 'bg-gray-50',   text: 'text-gray-500',   badge: 'bg-gray-100 text-gray-600',    label: '正常' },
    due_soon: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: '即将到期' },
    overdue:  { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', label: '已逾期' },
    severe:   { bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',       label: '严重逾期' },
  }
  return styles[level]
}

export function getDeliveryStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待确认', confirmed: '已确认', rejected: '已驳回', paid: '已付款',
  }
  return labels[status] ?? status
}

export function getDeliveryStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    paid: 'bg-gray-100 text-gray-600',
  }
  return styles[status] ?? 'bg-gray-100 text-gray-600'
}
