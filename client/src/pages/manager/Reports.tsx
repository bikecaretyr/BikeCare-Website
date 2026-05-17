import { useEffect, useState } from 'react'
import { reports as reportsApi } from '../../api/client'
import { Spinner, StatCard, BarChart, Sparkline, fmtMoney } from '../../components/ui'
import type { RevenueReport } from '../../types'

export function ManagerReports() {
  const [data, setData]   = useState<RevenueReport|null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState('month')
  useEffect(()=>{setLoading(true);reportsApi.revenue({period}).then(d=>setData(d)).catch(()=>{}).finally(()=>setLoading(false))},[period])
  const t=data?.totals
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between"><h1 className="page-title mb-0">📈 Reports</h1>
        <select className="input w-auto text-xs" value={period} onChange={e=>setPeriod(e.target.value)}><option value="today">Today</option><option value="week">Last 7 Days</option><option value="month">Last 30 Days</option><option value="year">Last Year</option></select>
      </div>
      {loading?<div className="flex justify-center py-12"><Spinner size="lg"/></div>:<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon="💰" label="Total Revenue" value={fmtMoney(t?.totalRevenue??0)} color="text-green-400" />
          <StatCard icon="📋" label="Total Jobs"    value={t?.totalJobs??0} />
          <StatCard icon="🔧" label="Labour Revenue" value={fmtMoney(t?.totalLabour??0)} color="text-blue-400" />
          <StatCard icon="⚙️" label="Spares Revenue" value={fmtMoney(t?.totalSpares??0)} color="text-purple-400" />
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="card p-4"><div className="font-heading text-sm font-semibold mb-1">Revenue by Brand</div><BarChart data={data?.revenueByBrand??[]} labelKey="_id" valueKey="revenue" prefix="₹"/></div>
          <div className="card p-4"><div className="font-heading text-sm font-semibold mb-1">By Service Type</div><BarChart data={data?.revenueByService??[]} labelKey="_id" valueKey="revenue" prefix="₹"/></div>
          <div className="card p-4"><div className="font-heading text-sm font-semibold mb-1">Top Mechanics</div><BarChart data={data?.revenueByMechanic??[]} labelKey="_id" valueKey="revenue" prefix="₹"/></div>
          <div className="card p-4"><div className="font-heading text-sm font-semibold mb-1">Payment Modes</div>
            <div className="space-y-2 mt-2">{(data?.revenueByMode??[]).map(m=>{const tot=(data?.revenueByMode??[]).reduce((s,x)=>s+(x.revenue||0),0);const pct=tot?((m.revenue/tot)*100).toFixed(0):0;return(<div key={m._id} className="flex items-center justify-between text-sm"><span className="text-gray-400">{m._id}</span><div className="flex items-center gap-2"><div className="w-20 bg-surface-3 rounded h-1.5 overflow-hidden"><div className="h-full bg-amber rounded" style={{width:`${pct}%`}}/></div><span className="text-xs text-gray-500 w-8 text-right">{pct}%</span><span className="font-heading text-sm font-bold text-amber w-14 text-right">{fmtMoney(m.revenue)}</span></div></div>)})}
            </div>
          </div>
        </div>
        <div className="card p-4"><div className="font-heading text-sm font-semibold mb-2">Daily Revenue</div><Sparkline data={data?.dailyRevenue??[]}/></div>
      </>}
    </div>
  )
}