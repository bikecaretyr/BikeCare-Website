import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobs as jobsApi, parts as partsApi, bookings as bookingsApi, reports as reportsApi } from '../../api/client'
import { Spinner, StatCard, Empty, fmtDate, fmtMoney } from '../../components/ui'
import { useData } from '../../hooks/useData'
import type { Booking, DashboardStats, JobCard, Part } from '../../types'

interface DashboardPageProps {
  basePath: string
  title: string
}

interface DashboardPayload {
  stats: DashboardStats
  jobs: JobCard[]
  bookings: Booking[]
  parts: Part[]
}

export function DashboardPage({ basePath, title }: DashboardPageProps) {
  const navigate = useNavigate()
  const [range, setRange] = useState('today')

  const { data, loading } = useData<DashboardPayload>(async () => {
    const [statsRes, jobsRes, bookingsRes, partsRes] = await Promise.all([
      reportsApi.dashboard(range),
      jobsApi.list({ limit: '8' }),
      bookingsApi.list({ status: 'Pending' }),
      partsApi.list({ lowStock: 'true' }),
    ])
    return {
      stats: statsRes.stats,
      jobs: jobsRes.jobs,
      bookings: bookingsRes.bookings,
      parts: partsRes.parts,
    }
  }, [basePath, range])

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  const stats = data?.stats
  const recentJobs = data?.jobs ?? []
  const pendingBookings = data?.bookings ?? []
  const lowStock = data?.parts ?? []

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">{title}</h1>

        <select
          className="input w-auto text-xs"
          value={range}
          onChange={e => setRange(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="lastMonth">Last Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="📋" label="Today's Jobs" value={stats?.todayJobs ?? 0} sub={`${stats?.totalJobs ?? 0} total`} />
        <StatCard icon="💰" label="Today's Revenue" value={fmtMoney(stats?.todayRevenue ?? 0)} color="text-green-400" sub={fmtMoney(stats?.totalRevenue ?? 0) + ' total'} />
        <StatCard icon="📝" label="Pending Approvals" value={stats?.pendingApprovals ?? 0} color="text-red-400" onClick={() => navigate(`${basePath}/approvals`)} />
        <StatCard icon="📅" label="Pending Bookings" value={stats?.pendingBookings ?? 0} color="text-blue-400" onClick={() => navigate(`${basePath}/bookings`)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="💳" label="Unpaid Credits" value={fmtMoney(stats?.pendingCredits ?? 0)} color="text-purple-400" onClick={() => navigate(`${basePath}/bookings`)} />
        <StatCard icon="⚠" label="Low Stock Parts" value={stats?.lowStockCount ?? 0} color={stats?.lowStockCount ? 'text-red-400' : 'text-green-400'} onClick={() => navigate(`${basePath}/inventory`)} />
        <StatCard icon="🏍" label="Total Jobs" value={stats?.totalJobs ?? 0} color="text-gray-300" />
        <StatCard icon="💵" label="Total Revenue" value={fmtMoney(stats?.totalRevenue ?? 0)} color="text-green-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Jobs</span>
            <button className="text-xs text-amber hover:underline" onClick={() => navigate(`${basePath}/jobs`)}>All →</button>
          </div>
          <div className="p-3 space-y-1">
            {recentJobs.length === 0 ? (
              <Empty icon="📋" text="No jobs yet" />
            ) : (
              recentJobs.map(job => (
                <div key={job._id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer" onClick={() => navigate(`${basePath}/jobs`)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-heading font-bold text-amber truncate">{job.vehicleNumber}</div>
                    <div className="text-xs text-gray-500 truncate">{job.jobNo} · {job.mechanic}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-heading font-bold text-green-400">{fmtMoney(job.totalAmount ?? 0)}</div>
                    <div className="text-xs text-gray-500">{job.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Bookings</span>
            <button className="text-xs text-amber hover:underline" onClick={() => navigate(`${basePath}/bookings`)}>All →</button>
          </div>
          <div className="p-3 space-y-1">
            {pendingBookings.length === 0 ? (
              <Empty icon="📅" text="No pending bookings 🎉" />
            ) : (
              pendingBookings.slice(0, 6).map(booking => (
                <div key={booking._id} className="flex justify-between items-center px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors">
                  <div>
                    <div className="text-sm font-semibold">{booking.customerName}</div>
                    <div className="text-xs text-gray-500">{booking.customerPhone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-amber">{fmtDate(booking.preferredDate)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card border-red-500/20">
          <div className="card-header">
            <span className="card-title text-red-400">⚠ Low Stock</span>
            <button className="text-xs text-amber hover:underline" onClick={() => navigate(`${basePath}/inventory`)}>Manage →</button>
          </div>
          <div className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {lowStock.map(part => (
              <div key={part._id} className="bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                <div className="text-sm font-semibold truncate">{part.partName}</div>
                <div className="text-xs text-red-400 font-bold">
                  Stock: {part.totalStock}
                  <span className="text-gray-500 font-normal"> / Min: {part.minStock}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {part.vendorBatches?.filter(b => b.isActive && b.stock > 0).map(batch => (
                    <span key={batch._id} className="text-[10px] text-gray-600">{batch.vendorName}: {batch.stock}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
