import { useEffect, useState } from 'react'
import { approvals as approvalsApi } from '../../api/client'
import { Spinner, StatusBadge, Empty } from '../../components/ui'
import type { ApprovalRequest } from '../../types'

export function PortalRequests() {
  const [reqs, setReqs]     = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  useEffect(() => { approvalsApi.mine().then(d => setReqs(d.requests)).catch(()=>{}).finally(()=>setLoading(false)) }, [])
  const filtered = filter ? reqs.filter(r => r.status===filter) : reqs
  return (
    <div className="space-y-3">
      <div className="page-title">📝 My Requests</div>
      <p className="text-xs text-gray-400 bg-surface border border-border rounded-lg px-3 py-2">Your modification requests are reviewed by admin before being applied.</p>
      <div className="card p-3"><select className="input" value={filter} onChange={e => setFilter(e.target.value)}><option value="">All</option>{['Pending','Approved','Rejected'].map(s=><option key={s}>{s}</option>)}</select></div>
      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : filtered.length===0 ? <Empty icon="📝" text="No requests yet" />
        : <div className="space-y-2">{filtered.map(r => (
          <div key={r._id} className="card p-3 sm:p-4">
            <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-wider text-amber">{r.type.replace(/_/g,' ')}</span><StatusBadge status={r.status} /></div>
            <div className="text-xs text-gray-400">Submitted: {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '—'}{r.reason&&` · ${r.reason}`}</div>
            {r.reviewNote&&<div className={`text-xs mt-1 px-2 py-1 rounded ${r.status==='Rejected'?'bg-red-500/10 text-red-400':'bg-green-500/10 text-green-400'}`}>Admin: {r.reviewNote}</div>}
          </div>
        ))}</div>
      }
    </div>
  )
}