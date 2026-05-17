import { normalizeApprovals } from './normalize'
import type {
  User, Branch, Service, JobCard, Part, Booking,
  ApprovalRequest, Employee, Notification, DashboardStats, RevenueReport, AuditLog
} from '../types'

const BASE = '/api'

// ── Token store ────────────────────────────────────────────
let _token = ''
export const getToken  = () => _token
export const setToken  = (t: string) => { _token = t }
export const clearToken = () => { _token = '' }

export async function refreshToken() {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Refresh failed')
  const data = await res.json()
  setToken(data.accessToken)
  return data
}

// ── Core fetch with auto-refresh ───────────────────────────
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const call = (tok: string) =>
    fetch(`${BASE}${path}`, {
      ...opts, credentials: 'include',
      cache: 'no-store',   // fix: prevent 304 stale responses after mutations
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}`, ...(opts.headers ?? {}) },
    })

  let res = await call(_token)

  if (res.status === 401) {
    try {
      const d = await refreshToken()
      res = await call(d.accessToken)
    } catch {
      clearToken()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data as T
}

const qs = (p: Record<string, string | undefined>) => {
  const s = new URLSearchParams()
  Object.entries(p).forEach(([k, v]) => { if (v !== undefined && v !== '') s.append(k, v) })
  return s.toString() ? `?${s}` : ''
}

const post  = <T>(path: string, body: unknown) => req<T>(path, { method: 'POST',  body: JSON.stringify(body) })
const patch = <T>(path: string, body: unknown) => req<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const del   = <T>(path: string)                => req<T>(path, { method: 'DELETE' })

// ── Auth ───────────────────────────────────────────────────
export const auth = {
  login:          (email: string, password: string) =>
    post<{ accessToken: string; user: User }>('/auth/login', { email, password }),
  superAdminLogin:(username: string, password: string) =>
    post<{ accessToken: string; user: User }>('/auth/superadmin', { username, password }),
  getMe:          () => req<{ user: User }>('/auth/me'),
  logout:         () => post<void>('/auth/logout', {}),
  changePassword: (currentPassword: string, newPassword: string) =>
    patch<{ success: boolean }>('/auth/password', { currentPassword, newPassword }),
}

// ── Public (no auth needed) ────────────────────────────────
export const pub = {
  getServices: () => req<{ services: Service[] }>('/public/services'),
  getBranches: () => req<{ branches: Branch[] }>('/public/branches?activeOnly=true'),
  createBooking: (body: Record<string, unknown>) =>
    post<{ bookingRef: string; message: string }>('/public/bookings', body),
  track: (vehicle?: string, phone?: string) => {
    const p = new URLSearchParams()
    if (vehicle) p.append('vehicle', vehicle)
    if (phone)   p.append('phone', phone)
    return req<{ jobs: JobCard[] }>(`/public/track?${p}`)
  },
}

// ── Jobs ───────────────────────────────────────────────────
export const jobs = {
  list:   (p?: Record<string, string>) => req<{ jobs: JobCard[]; total: number }>(`/jobs${qs(p ?? {})}`),
  create: (body: Record<string, unknown>) => post<{ job: JobCard }>('/jobs', body),
  update: (id: string, body: Record<string, unknown>) => patch<{ success: boolean; message: string }>(`/jobs/${id}`, body),
  addSpares: (id: string, body: Record<string, unknown>) => post<{ job: JobCard }>(`/jobs/${id}/spares`, body),
  remove: (id: string) => del<{ success: boolean }>(`/jobs/${id}`),
  addPayment: (id: string, body: { amount: number; mode: string; note?: string }) =>
    post<{ success: boolean; job: JobCard }>(`/jobs/${id}/payment`, body),
}

// ── Parts ──────────────────────────────────────────────────
export const parts = {
  list:   (p?: Record<string, string>) => req<{ parts: Part[] }>(`/parts${qs(p ?? {})}`),
  create: (body: Record<string, unknown>) => post<{ success: boolean; message: string; part?: Part }>('/parts', body),
  update: (id: string, body: Record<string, unknown>) => patch<{ part: Part }>(`/parts/${id}`, body),
  remove: (id: string) => del<{ success: boolean }>(`/parts/${id}`),
}

// ── Approvals ──────────────────────────────────────────────
// Normalize at API layer: requestedBy is always a populated object, never a raw string
export const approvals = {
  list: async (p?: Record<string, string>) => {
    const d = await req<{ requests: Record<string, unknown>[] }>(`/approvals${qs(p ?? {})}`)
    return { ...d, requests: normalizeApprovals(d.requests) }
  },
  mine: async (status?: string) => {
    const d = await req<{ requests: Record<string, unknown>[] }>(`/approvals/my${status ? `?status=${status}` : ''}`)
    return { ...d, requests: normalizeApprovals(d.requests) }
  },
  pendingCount: () => req<{ count: number }>('/approvals/count'),
  review: (id: string, action: 'approve' | 'reject', note?: string) =>
    post<{ success: boolean }>(`/approvals/${id}/review`, { action, note }),
}

// ── Bookings ───────────────────────────────────────────────
export const bookings = {
  list:    (p?: Record<string, string>) => req<{ bookings: Booking[]; count: number }>(`/bookings${qs(p ?? {})}`),
  update:  (id: string, body: Record<string, unknown>) => patch<{ success: boolean }>(`/bookings/${id}`, body),
  convert: (id: string, body: Record<string, unknown>) => post<{ job: JobCard }>(`/bookings/${id}/convert`, body),
}

// ── Branches ───────────────────────────────────────────────
export const branches = {
  list:       () => req<{ branches: Branch[] }>('/branches'),
  create:     (body: Record<string, unknown>) => post<{ branch: Branch }>('/branches', body),
  update:     (id: string, body: Record<string, unknown>) => patch<{ branch: Branch }>(`/branches/${id}`, body),
  activate:   (id: string) => patch<{ success: boolean }>(`/branches/${id}/activate`, {}),
  deactivate: (id: string) => patch<{ success: boolean }>(`/branches/${id}/deactivate`, {}),
  remove:     (id: string) => del<{ success: boolean }>(`/branches/${id}`),
}

// ── Services ───────────────────────────────────────────────
export const services = {
  list:       (activeOnly = true) => req<{ services: Service[] }>(`/services${activeOnly ? '' : '?activeOnly=false'}`),
  create:     (body: Record<string, unknown>) => post<{ service: Service }>('/services', body),
  update:     (id: string, body: Record<string, unknown>) => patch<{ service: Service }>(`/services/${id}`, body),
  activate:   (id: string) => patch<{ success: boolean }>(`/services/${id}/activate`, {}),
  deactivate: (id: string) => patch<{ success: boolean }>(`/services/${id}/deactivate`, {}),
  remove:     (id: string) => del<{ success: boolean }>(`/services/${id}`),
}

// ── Users ──────────────────────────────────────────────────
export const users = {
  list:          (p?: Record<string, string>) => req<{ users: Employee[] }>(`/users${qs(p ?? {})}`),
  create:        (body: Record<string, unknown>) => post<{ user: Employee }>('/users', body),
  update:        (id: string, body: Record<string, unknown>) => patch<{ user: Employee }>(`/users/${id}`, body),
  activate:      (id: string) => patch<{ success: boolean }>(`/users/${id}/activate`, {}),
  deactivate:    (id: string) => patch<{ success: boolean }>(`/users/${id}/deactivate`, {}),
  remove:        (id: string) => del<{ success: boolean }>(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) => post<{ success: boolean }>(`/users/${id}/reset-password`, { newPassword }),
}

// ── Reports ────────────────────────────────────────────────
export const reports = {
  dashboard: (period = 'today', branch?: string) => {
    const p: Record<string, string> = { period }
    if (branch) p.branch = branch
    return req<{ stats: DashboardStats }>(`/reports/dashboard${qs(p)}`)
  },
  revenue:   (p?: Record<string, string>) => req<RevenueReport>(`/reports/revenue${qs(p ?? {})}`),
  inventory: (p?: Record<string, string>) => req<{ parts: Part[]; totalInventoryValue: number; lowStockCount: number }>(`/reports/inventory${qs(p ?? {})}`),
}

// ── Notifications ──────────────────────────────────────────
export const notifications = {
  list:        () => req<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
  markAllRead: () => patch<{ success: boolean }>('/notifications/read', {}),
}

// ── Audit (superadmin only) ────────────────────────────────
export const audit = {
  list: (p?: Record<string, string>) => req<{ logs: AuditLog[] }>(`/superadmin/audit${qs(p ?? {})}`),
}

// ── Vendors ────────────────────────────────────────────────
export const vendors = {
  list:   (p?: Record<string, string>) => req<{ vendors: import('../types').Vendor[] }>(`/vendors${qs(p ?? {})}`),
  get:    (id: string) => req<{ vendor: import('../types').Vendor }>(`/vendors/${id}`),
  create: (body: Record<string, unknown>) => post<{ vendor: import('../types').Vendor }>('/vendors', body),
  update: (id: string, body: Record<string, unknown>) => patch<{ vendor: import('../types').Vendor }>(`/vendors/${id}`, body),
  remove: (id: string) => del<{ success: boolean }>(`/vendors/${id}`),
}

// ── Purchases ──────────────────────────────────────────────
export const purchases = {
  list:        (p?: Record<string, string>) => req<{ entries: import('../types').PurchaseEntry[]; purchases: import('../types').Purchase[] }>(`/purchases${qs(p ?? {})}`),
  create:      (body: Record<string, unknown>) => post<{ purchase: import('../types').Purchase }>('/purchases', body),
  recordStock: (partId: string, body: Record<string, unknown>) =>
    post<{ part: import('../types').Part; purchaseEntry: import('../types').PurchaseEntry }>(`/parts/${partId}/purchase`, body),
  markPaid:    (id: string) => patch<{ success: boolean }>(`/purchases/${id}/paid`, {}),
  deactivateBatch: (partId: string, batchId: string) =>
    patch<{ part: import('../types').Part }>(`/parts/${partId}/batches/${batchId}/deactivate`, {}),
}

// ── Vehicle lookup ─────────────────────────────────────────
export const vehicleLookup = (vehicle: string) =>
  req<{ found: boolean; data?: import('../types').JobCard }>(`/jobs/vehicle-lookup?vehicle=${encodeURIComponent(vehicle)}`)