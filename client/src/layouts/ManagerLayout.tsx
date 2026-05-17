import { ReactNode, useMemo } from 'react'
import AppLayout, { type AppLayoutSection } from './AppLayout'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../routes'

const SECTIONS: AppLayoutSection[] = [
  { label: 'Overview', items: [
    { path: ROUTES.manager.dashboard, icon: '📊', label: 'Dashboard' },
    { path: ROUTES.manager.jobs, icon: '📋', label: 'Job Cards' },
  ]},
  { label: 'Operations', items: [
    { path: ROUTES.manager.approvals, icon: '📝', label: 'Approvals', badge: 'approvals' },
    { path: ROUTES.manager.bookings, icon: '📅', label: 'Bookings', badge: 'bookings' },
    { path: ROUTES.manager.inventory, icon: '📦', label: 'Inventory' },
  ]},
  { label: 'Management', items: [
    { path: ROUTES.manager.employees, icon: '👥', label: 'Employees' },
  ]},
  { label: 'Analytics', items: [
    { path: ROUTES.manager.reports, icon: '📈', label: 'Reports' },
  ]},
]

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.manager.dashboard]: 'Dashboard',
  [ROUTES.manager.jobs]: 'Job Cards',
  [ROUTES.manager.approvals]: 'Approvals',
  [ROUTES.manager.bookings]: 'Bookings',
  [ROUTES.manager.inventory]: 'Inventory',
  [ROUTES.manager.employees]: 'Employees',
  [ROUTES.manager.reports]: 'Reports',
  [ROUTES.manager.profile]: 'My Profile',
}

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const sections = useMemo(() => SECTIONS, [])

  return (
    <AppLayout
      title="Manager"
      logoSubtitle="BMS Manager"
      profilePath={ROUTES.manager.profile}
      sections={sections}
      pageTitles={PAGE_TITLES}
    >
      {children}
    </AppLayout>
  )
}
