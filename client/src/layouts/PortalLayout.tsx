import { ReactNode, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { notifications as notifApi } from '../api/client'
import { NotifBell } from '../components/ui'
import type { Notification } from '../types'

const NAV = [
  { path: '/portal/dashboard', icon: '📊', label: 'Home' },
  { path: '/portal/new-job',   icon: '🔧', label: 'New Job' },
  { path: '/portal/bookings',  icon: '📅', label: 'Bookings' },
  { path: '/portal/jobs',      icon: '📋', label: 'Jobs' },
  { path: '/portal/parts',     icon: '📦', label: 'Parts' },
  { path: '/portal/requests',  icon: '📝', label: 'Requests' },
]

const TITLES: Record<string, string> = {
  '/portal/dashboard': '📊 Dashboard',
  '/portal/new-job':   '🔧 New Job Card',
  '/portal/bookings':  '📅 Bookings',
  '/portal/jobs':      '📋 Job List',
  '/portal/parts':     '📦 Inventory',
  '/portal/requests':  '📝 My Requests',
  '/portal/profile':   '👤 Profile',
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [notifs, setNotifs]   = useState<Notification[]>([])
  const [unread, setUnread]   = useState(0)

  useEffect(() => {
    loadNotifs()
    const id = setInterval(loadNotifs, 30000)
    return () => clearInterval(id)
  }, [])

  async function loadNotifs() {
    try { const d = await notifApi.list(); setUnread(d.unreadCount); setNotifs(d.notifications) }
    catch { /* ignore */ }
  }

  async function markRead() {
    await notifApi.markAllRead().catch(() => {})
    setUnread(0); setNotifs(n => n.map(x => ({ ...x, isRead: true })))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-3 sm:px-4 shrink-0 sticky top-0 z-30">
        <span className="font-heading text-base font-semibold truncate">
          {TITLES[location.pathname] || 'BMS Portal'}
        </span>
        <div className="flex items-center gap-1">
          <NotifBell count={unread} notifs={notifs} onMarkRead={markRead} />
          <button onClick={() => navigate('/portal/profile')}
            className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-1.5 hover:border-amber/40 transition-colors">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber to-orange-600 flex items-center justify-center text-xs font-bold text-black">
              {user?.name[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium text-gray-300 hidden sm:block max-w-24 truncate">{user?.name}</span>
          </button>
        </div>
      </header>

      {/* Page */}
      <main className="flex-1 overflow-y-auto pb-16">
        <div className="max-w-2xl mx-auto p-3 sm:p-4">{children}</div>
      </main>

      {/* Bottom nav */}
      <nav className="h-14 bg-surface border-t border-border flex shrink-0 fixed bottom-0 left-0 right-0 z-30">
        {NAV.map(item => {
          const active = location.pathname === item.path
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${active ? 'text-amber' : 'text-gray-600 hover:text-gray-300'}`}>
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
