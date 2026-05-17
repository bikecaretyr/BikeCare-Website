import { ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { approvals, bookings, notifications as notifApi } from '../api/client'
import { NotifBell, Confirm } from '../components/ui'
import type { Notification } from '../types'

export interface AppLayoutMenuItem {
  path: string
  icon: string
  label: string
  badge?: 'approvals' | 'bookings'
}

export interface AppLayoutSection {
  label: string
  items: AppLayoutMenuItem[]
}

export default function AppLayout({
  children,
  title,
  logoSubtitle,
  profilePath,
  sections,
  pageTitles,
}: {
  children: ReactNode
  title: string
  logoSubtitle: string
  profilePath: string
  sections: AppLayoutSection[]
  pageTitles: Record<string, string>
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [badges, setBadges] = useState({ approvals: 0, bookings: 0 })
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  const hasBookingsBadge = sections.some(section =>
    section.items.some(item => item.badge === 'bookings')
  )

  useEffect(() => {
    loadAll()
    const id = setInterval(loadAll, 30000)
    return () => clearInterval(id)
  }, [hasBookingsBadge, sections])

  async function loadAll() {
    try {
      const [ap, no] = await Promise.all([approvals.pendingCount(), notifApi.list()])
      const nextBadges = { approvals: ap.count, bookings: 0 }
      if (hasBookingsBadge) {
        const bk = await bookings.list({ status: 'Pending', limit: '1' })
        nextBadges.bookings = bk.count ?? bk.bookings?.length ?? 0
      }
      setBadges(nextBadges)
      setUnread(no.unreadCount)
      setNotifs(no.notifications)
    } catch {
      // ignore
    }
  }

  async function markRead() {
    await notifApi.markAllRead().catch(() => {})
    setUnread(0)
    setNotifs(n => n.map(x => ({ ...x, isRead: true })))
  }

  return (
    <div className="flex h-full overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={
        `
        lg:relative lg:flex lg:flex-col lg:shrink-0 lg:transition-all lg:duration-200
        ${collapsed ? 'lg:w-14' : 'lg:w-56'}
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-surface border-r border-border
        transform transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        <div className="h-14 flex items-center gap-3 px-3 border-b border-border overflow-hidden">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-amber to-orange-600 flex items-center justify-center text-sm">🏍</div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-heading text-sm font-bold truncate">Balaji Motors</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-widest">{logoSubtitle}</div>
            </div>
          )}
        </div>

        <button onClick={() => setCollapsed(c => !c)}
          className="lg:block hidden absolute -right-3 top-[18px] w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-[10px] text-gray-400 hover:text-amber transition-colors z-30"
        >
          {collapsed ? '›' : '‹'}
        </button>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {sections.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 px-2 py-2">
                  {section.label}
                </div>
              )}
              {section.items.map(item => {
                const active = location.pathname === item.path
                const badgeCount = item.badge ? badges[item.badge] ?? 0 : 0
                return (
                  <button key={item.path} onClick={() => { navigate(item.path); setMobileOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-semibold transition-colors mb-0.5 relative ${active ? 'bg-amber/10 text-amber' : 'text-gray-500 hover:bg-surface-2 hover:text-gray-200'}`}>
                    <span className="text-base shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {!collapsed && badgeCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badgeCount}</span>
                    )}
                    {collapsed && badgeCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <button onClick={() => navigate(profilePath)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-2 transition-colors">
            <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-amber to-orange-600 flex items-center justify-center text-xs font-bold text-black">
              {user?.name[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="text-left overflow-hidden flex-1">
                <div className="text-xs font-semibold truncate">{user?.name}</div>
                <div className="text-[10px] text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
            )}
          </button>
        </div>

        <button className="lg:hidden absolute top-3 right-3 text-gray-400" onClick={() => setMobileOpen(false)}>✕</button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-surface border-b border-border flex items-center px-5 gap-3 shrink-0">
          <button className="lg:hidden mr-2" onClick={() => setMobileOpen(true)}>☰</button>
          <h1 className="font-heading text-lg font-bold flex-1 truncate">{pageTitles[location.pathname] || title}</h1>
          <NotifBell count={unread} notifs={notifs} onMarkRead={markRead} />
          <button onClick={() => setLogoutConfirm(true)}
            className="btn-ghost px-3 py-1.5 text-xs text-gray-500 hover:text-red-400">
            🚪 Logout
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</main>
      </div>

      <Confirm
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={async () => { await logout(); navigate('/login') }}
        title="Log out?"
        message="You'll need to log back in to access the panel."
        danger
      />
    </div>
  )
}
