import { ReactNode, useMemo } from 'react'
import { useAuth, isSuperAdmin } from '../context/AuthContext'
import AppLayout, { type AppLayoutSection } from './AppLayout'
import { ROUTES } from '../routes'

const BASE_SECTIONS: AppLayoutSection[] = [
  { label: 'Overview', items: [
    { path: ROUTES.admin.dashboard, icon: '📊', label: 'Dashboard' },
    { path: ROUTES.admin.jobs, icon: '📋', label: 'Job Cards' },
  ]},
  { label: 'Operations', items: [
    { path: ROUTES.admin.approvals, icon: '📝', label: 'Approvals', badge: 'approvals' },
    { path: ROUTES.admin.bookings, icon: '📅', label: 'Bookings', badge: 'bookings' },
    { path: ROUTES.admin.credits, icon: '💳', label: 'Credit Manager' },
    { path: ROUTES.admin.inventory, icon: '📦', label: 'Inventory' },
  ]},
  { label: 'Management', items: [
    { path: ROUTES.admin.employees, icon: '👥', label: 'Employees' },
    { path: ROUTES.admin.branches, icon: '🏪', label: 'Branches' },
    { path: ROUTES.admin.services, icon: '⚙️', label: 'Services' },
  ]},
  { label: 'Analytics', items: [
    { path: ROUTES.admin.reports, icon: '📈', label: 'Reports' },
  ]},
]

const SA_SECTION: AppLayoutSection = {
  label: 'Developer',
  items: [
    { path: ROUTES.admin.audit, icon: '🔍', label: 'Audit Logs' },
  ],
}

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.admin.dashboard]: 'Dashboard',
  [ROUTES.admin.jobs]: 'Job Cards',
  [ROUTES.admin.approvals]: 'Approvals',
  [ROUTES.admin.bookings]: 'Bookings',
  [ROUTES.admin.credits]: 'Credit Manager',
  [ROUTES.admin.inventory]: 'Inventory',
  [ROUTES.admin.employees]: 'Employees',
  [ROUTES.admin.branches]: 'Branches',
  [ROUTES.admin.services]: 'Services',
  [ROUTES.admin.reports]: 'Reports',
  [ROUTES.admin.audit]: 'Audit Logs',
  [ROUTES.admin.profile]: 'My Profile',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const sections = useMemo(() => isSuperAdmin(user) ? [...BASE_SECTIONS, SA_SECTION] : BASE_SECTIONS, [user])

  return (
    <AppLayout
      title="Admin"
      logoSubtitle="BMS Admin"
      profilePath={ROUTES.admin.profile}
      sections={sections}
      pageTitles={PAGE_TITLES}
    >
      {children}
    </AppLayout>
  )
}
