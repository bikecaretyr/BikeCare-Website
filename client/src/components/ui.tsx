import { useState, useEffect, ReactNode, useCallback } from 'react'

// ── Toast ──────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warn'
interface ToastMsg { id: number; msg: string; type: ToastType }

let _addToast: (msg: string, type?: ToastType) => void = () => {}
export const toast = (msg: string, type: ToastType = 'success') => _addToast(msg, type)

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  _addToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-5 z-[999] flex flex-col gap-2 pointer-events-none max-w-xs">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-2.5 rounded-lg text-xs font-semibold shadow-2xl bg-surface-3 border border-border text-gray-100 animate-[fadeIn_0.2s_ease] ${t.type === 'error' ? 'border-l-2 border-l-red-500' : t.type === 'success' ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-amber'}`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-9 h-9' }[size]
  return <div className={`${s} border-2 border-border border-t-amber rounded-full animate-spin shrink-0 ${className}`} />
}

// ── Full-page loader ───────────────────────────────────────
export function PageLoader() {
  return (
    <div className="h-full min-h-screen flex items-center justify-center bg-[#090b10]">
      <Spinner size="lg" />
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`bg-surface border border-border rounded-none sm:rounded-xl p-4 sm:p-6 w-full ${wide ? 'sm:max-w-6xl' : 'sm:max-w-lg'} min-h-screen sm:min-h-0 max-h-screen sm:max-h-[92vh] overflow-y-auto shadow-2xl`}>
        <div className="card-header sticky top-0 bg-surface z-10">
          <span className="font-heading text-base font-semibold">{title}</span>
          <button className="text-gray-400 hover:text-red-400 transition-colors text-lg leading-none" onClick={onClose}>✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm ────────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message, danger }: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; message: string; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-300 mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>Confirm</button>
      </div>
    </Modal>
  )
}

// ── Status Badge ──────────────────────────────────────────
const BADGE_MAP: Record<string, string> = {
  Received: 'badge-received', 'In Progress': 'badge-progress',
  Ready: 'badge-ready', Delivered: 'badge-delivered', Cancelled: 'badge-cancelled',
  Pending: 'badge-pending', Confirmed: 'badge-received',
  Approved: 'badge-approved', Rejected: 'badge-rejected', Completed: 'badge-approved',
  Active: 'badge-approved', Inactive: 'badge-rejected',
  Cash: 'badge bg-green-500/10 text-green-400',
  UPI: 'badge bg-blue-500/10 text-blue-400',
  Card: 'badge bg-purple-500/10 text-purple-400',
  Credit: 'badge-pending',
  admin: 'badge-admin', branch_admin: 'badge bg-blue-500/10 text-blue-400',
  manager: 'badge bg-purple-500/10 text-purple-400', employee: 'badge-employee', superadmin: 'badge bg-red-500/10 text-red-400',
}
export function StatusBadge({ status }: { status: string }) {
  return <span className={BADGE_MAP[status] || 'badge bg-gray-500/10 text-gray-400'}>{status}</span>
}

// ── Empty state ────────────────────────────────────────────
export function Empty({ icon = '📭', text = 'Nothing here yet' }: { icon?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────
export function Table({ headers, children, empty }: { headers: string[]; children?: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            {headers.map(h => <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {empty
            ? <tr><td colSpan={headers.length} className="px-3 py-10 text-center text-xs text-gray-600">No records found</td></tr>
            : children}
        </tbody>
      </table>
    </div>
  )
}
export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <tr onClick={onClick} className={`border-b border-border/50 last:border-0 ${onClick ? 'cursor-pointer hover:bg-surface-2 transition-colors' : ''}`}>{children}</tr>
}
export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-gray-300 ${className}`}>{children}</td>
}

// ── Stat Card ─────────────────────────────────────────────
export function StatCard({ icon, label, value, color = 'text-amber', sub, onClick }: {
  icon: string; label: string; value: string | number; color?: string; sub?: string; onClick?: () => void
}) {
  return (
    <div className={`stat-card relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-amber/40 transition-colors' : ''}`} onClick={onClick}>
      <div className="absolute right-3 top-3 text-3xl opacity-20 pointer-events-none">{icon}</div>
      <div className={`stat-val ${color}`}>{value}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Form helpers ──────────────────────────────────────────
export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const g = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[cols]
  return <div className={`grid grid-cols-1 ${g} gap-3`}>{children}</div>
}
export function Field({ label, children, required, span }: { label: string; children: ReactNode; required?: boolean; span?: boolean }) {
  return (
    <div className={span ? 'col-span-1 sm:col-span-2' : ''}>
      <label className="form-label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 justify-end pt-4 border-t border-border mt-2">{children}</div>
}

// ── Bar Chart (CSS only, no lib) ──────────────────────────
export function BarChart({ data, labelKey, valueKey, prefix = '' }: {
  data: Record<string, unknown>[]; labelKey: string; valueKey: string; prefix?: string
}) {
  if (!data.length) return <p className="text-xs text-gray-600 py-6 text-center">No data</p>
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0))
  return (
    <div className="space-y-2.5 mt-2">
      {data.slice(0, 8).map((d, i) => {
        const val = Number(d[valueKey]) || 0
        return (
          <div key={i} className="flex items-center gap-3 text-xs">
            <div className="w-28 text-gray-400 truncate text-right">{String(d[labelKey] || '—')}</div>
            <div className="flex-1 bg-surface-3 rounded h-2 overflow-hidden">
              <div className="h-full bg-amber rounded transition-all duration-700" style={{ width: `${max ? (val / max) * 100 : 0}%` }} />
            </div>
            <div className="w-20 text-right font-heading text-sm font-bold text-amber">{prefix}{val.toLocaleString()}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────
export function Sparkline({ data }: { data: { _id: string; revenue: number }[] }) {
  if (!data.length) return <p className="text-xs text-gray-600 py-4 text-center">No data</p>
  const max = Math.max(...data.map(d => d.revenue))
  return (
    <div>
      <div className="flex items-end gap-0.5 h-16">
        {data.map((d, i) => (
          <div key={i} title={`${d._id}: ₹${d.revenue.toLocaleString()}`}
            className="flex-1 bg-amber/60 hover:bg-amber rounded-t transition-colors cursor-default"
            style={{ height: `${max ? Math.max(4, (d.revenue / max) * 60) : 4}px` }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>{data[0]?._id}</span><span>{data[data.length - 1]?._id}</span>
      </div>
    </div>
  )
}

// ── Notification bell ─────────────────────────────────────
export function NotifBell({ count, notifs, onMarkRead }: {
  count: number; notifs: { _id: string; title: string; message: string; isRead: boolean }[]; onMarkRead: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button className="relative btn-ghost p-2 rounded-lg" onClick={() => setOpen(o => !o)}>
        🔔
        {count > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 card shadow-2xl z-50 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              <button className="text-xs text-amber hover:underline" onClick={() => { onMarkRead(); setOpen(false) }}>Mark all read</button>
            </div>
            {notifs.length === 0
              ? <div className="py-8 text-center text-xs text-gray-500">No notifications</div>
              : notifs.slice(0, 20).map(n => (
                <div key={n._id} className={`px-4 py-3 border-b border-border/50 text-sm last:border-0 ${!n.isRead ? 'border-l-2 border-l-amber' : ''}`}>
                  <div className="font-semibold text-gray-100 mb-0.5">{n.title}</div>
                  <div className="text-xs text-gray-400">{n.message}</div>
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────
export const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export const fmtMoney = (n: number) =>
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(0)}K` : `₹${(n || 0).toLocaleString()}`
