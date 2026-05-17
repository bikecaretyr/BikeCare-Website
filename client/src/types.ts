export type Role = 'superadmin' | 'admin' | 'manager' | 'employee'

export interface User {
  _id?: string
  name: string; email: string; role: Role
  branch?: Branch | string | null
  phone?: string; isActive?: boolean
}

export interface Branch {
  _id: string; name: string; code: string
  address?: { street?: string; city?: string; state?: string; pincode?: string }
  phone?: string; phoneType?: 'mobile' | 'landline'; whatsapp?: string; googleMapsUrl?: string; email?: string
  workingHours?: { open: string; close: string; days?: string[] }
  isActive: boolean
}

export interface Service {
  _id: string; name: string; description?: string
  price: number; priceType: 'fixed' | 'starting_from' | 'on_request'
  category: string; durationMinutes: number; isActive: boolean
}

// Structured spare item used in job cards
export interface SpareItem {
  partId?: string
  partNumber?: string   // primary identifier — snapshot at time of job
  partName: string
  vendorBatchId?: string
  vendorName?: string
  sellingPrice: number
  qty: number
}

export interface JobCard {
  _id: string; jobNo: string
  branch?: Branch | string
  vehicleNumber: string; brand: string; model?: string; kmReading?: number
  customerName?: string; customerPhone?: string
  serviceInDate: string; expectedDelivery?: string; actualDelivery?: string
  serviceMode: string; complaint?: string; mechanic: string
  engineOil?: string
  sparesUsed?: SpareItem[]   // always structured array — never a string
  workDone?: string
  status: JobStatus
  labourCharge: number; waterWash: number; sparesCost: number
  discount: number; totalAmount: number
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit'
  paymentStatus: 'Paid' | 'Pending' | 'Partial'
  paidAmount: number
  balanceAmount: number

  paymentHistory: {
    amount: number
    mode: 'Cash' | 'UPI' | 'Card' | 'Credit'
    paidAt: string
    note?: string
  }[]
  creditCollected?: boolean; creditCollectedAt?: string; creditCollectedMode?: string
  createdAt: string
}

export type JobStatus = 'Received' | 'In Progress' | 'Ready' | 'Delivered' | 'Cancelled'

// Vendor batch embedded inside a Part
export interface VendorBatch {
  _id: string
  vendorId: string | Vendor
  vendorName: string
  purchasePrice: number
  sellingPrice: number
  stock: number
  purchasedAt: string
  isActive: boolean
}

export interface Part {
  _id: string; partNumber: string; partName: string; brand?: string
  branch?: Branch | string
  vendorBatches: VendorBatch[]
  totalStock: number   // unitPrice and stock fields removed — use totalStock
  minStock: number
  isActive: boolean; isLowStock?: boolean
  stockValue?: number
  lastRestockedAt?: string
  createdAt?: string
}

export interface Vendor {
  _id: string; name: string; phone?: string
  paymentDueDays: number
  vehicleModels: string[]
  branches: (Branch | string)[]
  isActive: boolean; isLegacy?: boolean
  createdAt: string
}

export interface PurchaseEntry {
  _id: string
  vendor: Vendor | string
  part: Part | string
  branch: Branch | string
  qty: number
  purchasePrice: number
  sellingPrice: number
  batchId?: string
  paymentDueDate?: string
  paymentPaid: boolean
  paymentPaidAt?: string
  notes?: string
  createdAt: string
}

export interface PurchaseItem {
  partId: string
  qty: number
  purchaseCost: number
  sellingPrice: number
}

export interface Purchase {
  _id: string
  vendor: Vendor | string
  branch: Branch | string
  items: PurchaseItem[]
  miscCost: number
  totalCost: number
  paymentDueDate?: string
  paymentPaid: boolean
  paymentPaidAt?: string
  notes?: string
  createdAt: string
}

export interface Booking {
  _id: string; bookingRef: string
  branch?: Branch | string
  customerName: string; customerPhone: string; customerEmail?: string
  vehicleNumber?: string; vehicleBrand?: string; vehicleModel?: string
  serviceRequested?: { _id?: string; name: string; price?: number }[]
  serviceNote?: string; preferredDate: string
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Completed' | 'Cancelled'
  adminNote?: string; confirmedBy?: { name: string }
  convertedToJobCard?: string; createdAt: string
}

// fix: requestedBy is always a populated object after API normalization — never a raw string
export interface ApprovalRequestedBy {
  _id?: string
  name: string
  role: string
}

export interface ApprovalRequest {
  _id: string; type: string
  requestedBy?: ApprovalRequestedBy   // fix: was string | User — normalized at API layer
  branch?: Branch | string; targetModel: string; targetId: string
  currentData?: Record<string, unknown>; requestedData?: Record<string, unknown>
  reason?: string; status: 'Pending' | 'Approved' | 'Rejected'
  reviewedBy?: { name: string }; reviewNote?: string
  createdAt: string   // fix: always string — was optional causing undefined errors
}

export interface Employee {
  _id: string; name: string; email: string; role: string
  branch?: Branch | string | null; phone?: string; phoneType?: 'mobile' | 'landline'; isActive: boolean
}

export interface Notification {
  _id: string; title: string; message: string; isRead: boolean; createdAt: string
}

export interface DashboardStats {
  totalJobs: number; todayJobs: number; totalRevenue: number; todayRevenue: number
  pendingCredits: number; lowStockCount: number; pendingBookings: number; pendingApprovals: number
}

export interface RevenueReport {
  totals: { totalRevenue?: number; totalJobs?: number; totalLabour?: number; totalSpares?: number }
  revenueByBrand: { _id: string; revenue: number; count: number }[]
  revenueByMode: { _id: string; revenue: number; count: number }[]
  revenueByService: { _id: string; revenue: number; count: number }[]
  revenueByMechanic: { _id: string; revenue: number; count: number }[]
  dailyRevenue: { _id: string; revenue: number; count: number }[]
}

// fix: createdAt is always present on server responses — make it non-optional
export interface AuditLog {
  _id: string; actor: string; actorRole: string; action: string
  targetModel?: string; severity: string; ipAddress?: string
  createdAt: string   // fix: was optional (string | undefined) — caused fmtDT error
}