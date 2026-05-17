import { useEffect, useState } from 'react'
import { audit as auditApi } from '../../api/client'
import { Spinner, Empty } from '../../components/ui'
import type { AuditLog } from '../../types'

export function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sevF, setSevF] = useState('')
  const SEV = { low: 'bg-green-500/10 text-green-400', medium: 'bg-amber/10 text-amber', high: 'bg-red-500/10 text-red-400', critical: 'bg-red-700/20 text-red-300' }
  const fmtDT = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  useEffect(() => { setLoading(true); const p: Record<string, string> = {}; if (sevF) p.severity = sevF; auditApi.list(p).then(d => setLogs(d.logs)).catch(() => { }).finally(() => setLoading(false)) }, [sevF])

  const filtered = logs.filter(l => `${l.action} ${l.actor}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="page-title">🔍 Audit Logs</h1>
      <div className="flex gap-2"><input className="input flex-1 text-xs" placeholder="Search action, actor..." value={search} onChange={e => setSearch(e.target.value)} /><select className="input w-auto text-xs" value={sevF} onChange={e => setSevF(e.target.value)}><option value="">All Severity</option>{['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : filtered.length === 0 ? <Empty icon="🔍" text="No logs" /> : (
        <div className="card divide-y divide-border/50">{filtered.map(l => (
          <div key={l._id} className="flex items-start gap-3 px-4 py-3 text-xs hover:bg-surface-2 transition-colors">
            <span className={`badge shrink-0 mt-0.5 ${SEV[l.severity as keyof typeof SEV] || SEV.low}`}>{l.severity.toUpperCase()}</span>
            <div className="flex-1 min-w-0"><span className="font-semibold text-gray-100">{l.action}</span><span className="text-gray-500 ml-2">{l.actor}</span>{l.targetModel && <span className="text-gray-600 ml-1">· {l.targetModel}</span>}{l.ipAddress && <span className="text-gray-600 ml-1">· {l.ipAddress}</span>}</div>
            <span className="text-gray-600 shrink-0 whitespace-nowrap">{fmtDT(l.createdAt)}</span>
          </div>
        ))}</div>
      )}
    </div>
  )
}