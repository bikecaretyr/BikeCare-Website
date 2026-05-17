import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { jobs as jobsApi, parts as partsApi } from '../../api/client'
import { Spinner, StatusBadge, Empty, fmtDate } from '../../components/ui'
import type { JobCard, Part, Branch } from '../../types'

export function PortalDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [recentJobs, setJobs]   = useState<JobCard[]>([])
  const [lowStock, setLowStock] = useState<Part[]>([])
  const [loading, setLoading]   = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([jobsApi.list({ limit: '50' }), partsApi.list({ lowStock: 'true' })])
      .then(([j, p]) => { setJobs(j.jobs); setLowStock(p.parts) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const todayJobs = recentJobs.filter(j => j.serviceInDate?.startsWith(today))

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber/10 to-transparent border border-amber/20 rounded-xl p-4">
        <div className="font-heading text-lg font-bold">👋 Hey, {user?.name.split(' ')[0]}!</div>
        <div className="text-xs text-gray-400 mt-1">
          {user?.branch && typeof user.branch === 'object' ? `📍 ${(user.branch as Branch).name}` : 'All Branches'}
          {' · '}{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card"><div className="stat-val text-amber">{todayJobs.length}</div><div className="stat-lbl">Today</div></div>
        <div className="stat-card"><div className="stat-val text-blue-400">{recentJobs.length}</div><div className="stat-lbl">Total</div></div>
        <div className={`stat-card`}><div className={`stat-val ${lowStock.length ? 'text-red-400' : 'text-green-400'}`}>{lowStock.length}</div><div className="stat-lbl">Low Stock</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <button onClick={() => navigate('/portal/new-job')} className="card p-4 text-left hover:border-amber/40 transition-colors">
          <div className="text-2xl mb-2">🔧</div><div className="font-semibold text-sm">New Job Card</div><div className="text-xs text-gray-500 mt-0.5">Create a service entry</div>
        </button>
        <button onClick={() => navigate('/portal/jobs')} className="card p-4 text-left hover:border-amber/40 transition-colors">
          <div className="text-2xl mb-2">📋</div><div className="font-semibold text-sm">View All Jobs</div><div className="text-xs text-gray-500 mt-0.5">{recentJobs.length} total records</div>
        </button>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Recent Jobs</span><button className="text-xs text-amber hover:underline" onClick={() => navigate('/portal/jobs')}>All →</button></div>
        <div className="p-3 space-y-2">
          {recentJobs.slice(0,5).length === 0 ? <Empty icon="📋" text="No jobs yet" /> : recentJobs.slice(0,5).map(j => (
            <div key={j._id} className="bg-surface-2 border border-border rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-heading text-sm font-bold text-amber">{j.vehicleNumber}</span>
                <StatusBadge status={j.status} />
              </div>
              <div className="text-xs text-gray-400">{j.jobNo} · {j.mechanic} · {fmtDate(j.serviceInDate)}</div>
              <div className="text-xs text-green-400 font-semibold mt-0.5">₹{j.totalAmount?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
      {lowStock.length > 0 && (
        <div className="card border-red-500/20">
          <div className="card-header"><span className="card-title text-red-400">⚠ Low Stock</span></div>
          <div className="p-3 space-y-2">
            {lowStock.map(p => (
              <div key={p._id} className="flex justify-between items-center bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                <div><div className="text-sm font-semibold">{p.partName}</div><div className="text-xs text-gray-500">{p.brand||''}</div></div>
                <div className="text-right"><div className="text-sm font-bold text-red-400">Stock: {p.totalStock}</div><div className="text-xs text-gray-500">Min: {p.minStock}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}