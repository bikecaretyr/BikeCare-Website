import { DashboardPage } from '../shared/DashboardPage'
import { JobsPage } from '../shared/JobsPage'
import { ApprovalsPage } from '../shared/ApprovalsPage'
import { InventoryPage } from '../shared/InventoryPage'
import { EmployeesPage } from '../shared/EmployeesPage'

export function AdminDashboard() {
  return <DashboardPage basePath="/admin" title="Admin Dashboard" />
}

export function AdminJobs() {
  return <JobsPage basePath="/admin" title="Jobs" showBranch />
}

export function AdminApprovals() {
  return <ApprovalsPage title="Approval Requests" reviewLabel="Review Note" />
}

export function AdminInventory() {
  return <InventoryPage title="Inventory" showVendorTab showBranch />
}

export function AdminEmployees() {
  return <EmployeesPage
    title="Employees"
    basePath="/admin"
    showBranch
    roleOptions={[
      { value: 'admin', label: 'Admin' },
      { value: 'manager', label: 'Manager' },
      { value: 'employee', label: 'Employee' },
    ]}
  />
}

export { AdminBookings } from './Bookings'
export { AdminCredits } from './Credits'
export { AdminBranches } from './Branches'
export { AdminServices } from './Services'
export { AdminReports } from './Reports'
export { AdminAudit } from './Audit'
export { AdminProfile } from './Profile'
