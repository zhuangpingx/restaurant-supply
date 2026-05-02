export type UserRole = 'boss' | 'store_manager' | 'supplier' | 'finance'
export type DeliveryStatus = 'pending' | 'confirmed' | 'rejected' | 'paid'
export type PaymentStatus = 'pending' | 'overdue' | 'paid'
export type NotificationType =
  | 'delivery_created'
  | 'delivery_confirmed'
  | 'delivery_rejected'
  | 'payment_due_soon'
  | 'payment_overdue'
  | 'payment_severe'
  | 'payment_completed'
export type OverdueLevel = 'normal' | 'due_soon' | 'overdue' | 'severe'

export interface User {
  id: string
  phone: string
  name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Store {
  id: string
  name: string
  address: string | null
  manager_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  manager?: User
}

export interface Supplier {
  id: string
  user_id: string | null
  name: string
  phone: string | null
  category: string | null
  payment_term_days: number
  bank_info: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DeliveryItem {
  id: string
  delivery_id: string
  name: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
  original_quantity: number | null
  original_unit_price: number | null
  notes: string | null
  created_at: string
}

export interface Delivery {
  id: string
  supplier_id: string
  store_id: string
  delivery_date: string
  total_amount: number
  status: DeliveryStatus
  photos: string[]
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  rejection_reason: string | null
  paid_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  supplier?: Supplier
  store?: Store
  delivery_items?: DeliveryItem[]
  confirmed_by_user?: User
}

export interface Payment {
  id: string
  delivery_id: string
  supplier_id: string
  store_id: string
  amount: number
  payment_term_days: number
  due_date: string
  status: PaymentStatus
  overdue_days: number
  paid_at: string | null
  paid_by: string | null
  payment_proof: string | null
  payment_notes: string | null
  created_at: string
  updated_at: string
  supplier?: Supplier
  store?: Store
  delivery?: Delivery
  paid_by_user?: User
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  delivery_id: string | null
  payment_id: string | null
  is_read: boolean
  created_at: string
}

export interface DashboardStats {
  todayPending: number
  monthPurchase: number
  overdueAmount: number
  severeOverdueAmount: number
  severeOverdueCount: number
}
