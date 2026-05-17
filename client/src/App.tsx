import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, isAdmin, isManager, isEmployee } from './context/AuthContext'
import { PageLoader, ToastProvider } from './components/ui'
import PublicLayout from './layouts/PublicLayout'
import PortalLayout from './layouts/PortalLayout'
import AdminLayout from './layouts/AdminLayout'
import ManagerLayout from './layouts/ManagerLayout'
import Home from './pages/public/Home'
import Login from './pages/auth/Login'
import SuperAdminLogin from './pages/auth/SuperAdminLogin'
import {
  PortalDashboard, NewJob, PortalJobs, PortalBookings,
  PortalParts, PortalRequests, PortalProfile,
} from './pages/portal'
import {
  AdminDashboard, AdminJobs, AdminApprovals, AdminBookings,
  AdminCredits, AdminInventory, AdminEmployees, AdminBranches,
  AdminServices, AdminReports, AdminAudit, AdminProfile,
} from './pages/admin'
import {
  ManagerDashboard, ManagerJobs, ManagerInventory, ManagerBookings,
  ManagerApprovals, ManagerEmployees, ManagerReports, ManagerProfile,
} from './pages/manager'

// ── Guards ─────────────────────────────────────────────────
function PublicPage({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}

function PortalGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user)            return <Navigate to="/login" replace />
  if (isAdmin(user))    return <Navigate to="/admin/dashboard" replace />
  if (!isEmployee(user)) return <Navigate to="/login" replace />
  return <PortalLayout>{children}</PortalLayout>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user)          return <Navigate to="/login" replace />
  if (!isAdmin(user)) return <Navigate to="/portal/dashboard" replace />
  return <AdminLayout>{children}</AdminLayout>
}

function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user)          return <Navigate to="/login" replace />
  if (!isManager(user)) return <Navigate to="/portal/dashboard" replace />
  return <ManagerLayout>{children}</ManagerLayout>
}

// ── App ────────────────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  return (
    <>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<PublicPage><Home /></PublicPage>} />

        {/* ── Auth ── */}
        <Route path="/login" element={
          user
            ? <Navigate to={isManager(user) ? '/manager/dashboard' : isAdmin(user) ? '/admin/dashboard' : '/portal/dashboard'} replace />
            : <Login />
        } />
        <Route path="/superadmin" element={
          user?.role === 'superadmin'
            ? <Navigate to="/admin/dashboard" replace />
            : <SuperAdminLogin />
        } />

        {/* ── Portal (employees) ── */}
        <Route path="/portal"           element={<Navigate to="/portal/dashboard" replace />} />
        <Route path="/portal/dashboard" element={<PortalGuard><PortalDashboard /></PortalGuard>} />
        <Route path="/portal/new-job"   element={<PortalGuard><NewJob /></PortalGuard>} />
        <Route path="/portal/bookings"  element={<PortalGuard><PortalBookings /></PortalGuard>} />
        <Route path="/portal/jobs"      element={<PortalGuard><PortalJobs /></PortalGuard>} />
        <Route path="/portal/parts"     element={<PortalGuard><PortalParts /></PortalGuard>} />
        <Route path="/portal/requests"  element={<PortalGuard><PortalRequests /></PortalGuard>} />
        <Route path="/portal/profile"   element={<PortalGuard><PortalProfile /></PortalGuard>} />

        {/* ── Admin (admin / superadmin) ── */}
        <Route path="/admin"             element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard"   element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/jobs"        element={<AdminGuard><AdminJobs /></AdminGuard>} />
        <Route path="/admin/approvals"   element={<AdminGuard><AdminApprovals /></AdminGuard>} />
        <Route path="/admin/bookings"    element={<AdminGuard><AdminBookings /></AdminGuard>} />
        <Route path="/admin/credits"     element={<AdminGuard><AdminCredits /></AdminGuard>} />
        <Route path="/admin/inventory"   element={<AdminGuard><AdminInventory /></AdminGuard>} />
        <Route path="/admin/employees"   element={<AdminGuard><AdminEmployees /></AdminGuard>} />
        <Route path="/admin/branches"    element={<AdminGuard><AdminBranches /></AdminGuard>} />
        <Route path="/admin/services"    element={<AdminGuard><AdminServices /></AdminGuard>} />
        <Route path="/admin/reports"     element={<AdminGuard><AdminReports /></AdminGuard>} />
        <Route path="/admin/audit"       element={<AdminGuard><AdminAudit /></AdminGuard>} />
        <Route path="/admin/profile"     element={<AdminGuard><AdminProfile /></AdminGuard>} />

        {/* ── Manager (manager) ── */}
        <Route path="/manager"             element={<Navigate to="/manager/dashboard" replace />} />
        <Route path="/manager/dashboard"   element={<ManagerGuard><ManagerDashboard /></ManagerGuard>} />
        <Route path="/manager/jobs"        element={<ManagerGuard><ManagerJobs /></ManagerGuard>} />
        <Route path="/manager/approvals"   element={<ManagerGuard><ManagerApprovals /></ManagerGuard>} />
        <Route path="/manager/bookings"    element={<ManagerGuard><ManagerBookings /></ManagerGuard>} />
        <Route path="/manager/inventory"   element={<ManagerGuard><ManagerInventory /></ManagerGuard>} />
        <Route path="/manager/employees"   element={<ManagerGuard><ManagerEmployees /></ManagerGuard>} />
        <Route path="/manager/reports"     element={<ManagerGuard><ManagerReports /></ManagerGuard>} />
        <Route path="/manager/profile"     element={<ManagerGuard><ManagerProfile /></ManagerGuard>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastProvider />
    </>
  )
}
