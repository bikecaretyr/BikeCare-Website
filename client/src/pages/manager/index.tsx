import { DashboardPage } from '../shared/DashboardPage'
import { JobsPage } from '../shared/JobsPage'
import { ApprovalsPage } from '../shared/ApprovalsPage'
import { InventoryPage } from '../shared/InventoryPage'
import { EmployeesPage } from '../shared/EmployeesPage'

export function ManagerDashboard() {
  return <DashboardPage basePath="/manager" title="Manager Dashboard" />
}

export function ManagerJobs() {
  return <JobsPage basePath="/manager" title="Jobs" showBranch={false} />
}

export function ManagerInventory() {
  return <InventoryPage title="Inventory" showVendorTab={false} showBranch={false} />
}

export function ManagerApprovals() {
  return <ApprovalsPage title="Approval Requests" reviewLabel="Review Note" />
}

export function ManagerEmployees() {
  return <EmployeesPage
    title="Employees"
    basePath="/manager"
    showBranch={false}
    roleOptions={[{ value: 'employee', label: 'Employee' }]}
  />
}

export { ManagerBookings } from './Bookings'
export { ManagerReports } from './Reports'
export { ManagerProfile } from './Profile'