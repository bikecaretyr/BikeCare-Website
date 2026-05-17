import { useEffect, useState, useCallback } from 'react'
import { jobs as jobsApi } from '../../api/client'
import { Spinner, StatCard, Empty, Modal, Field, FormActions, toast, fmtDate, fmtMoney } from '../../components/ui'
import type { JobCard, Branch } from '../../types'

export function AdminCredits() {
  const [allJobs, setAllJobs] = useState<JobCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSel] = useState<JobCard | null>(null)
  const [mode, setMode] = useState('Cash')
  const [sub, setSub] = useState(false)

  const load = useCallback(async () => { setLoading(true); try { const d = await jobsApi.list({ payment: 'Credit', limit: '300' }); setAllJobs(d.jobs) } catch {/**/ } finally { setLoading(false) } }, [])
  useEffect(() => { load() }, [load])

  const unpaid = allJobs.filter(j => (j.balanceAmount ?? 0) > 0)
  const total = unpaid.reduce((s, j) => s + (j.balanceAmount || 0), 0)

  async function collect() {
    if (!selected) return

    setSub(true)

    try {
      await jobsApi.addPayment(selected._id, {
        amount: selected.balanceAmount ?? 0,
        mode,
        note: 'Credit balance collected',
      })

      toast('Collected', 'success')
      setSel(null)
      load()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'error')
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="page-title">💳 Credit Manager</h1>
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="💸" label="Outstanding" value={fmtMoney(total)} color="text-red-400" />
        <StatCard icon="📋" label="Unpaid Bills" value={unpaid.length} color="text-purple-400" />
        <StatCard icon="✅" label="Collected" value={allJobs.length - unpaid.length} color="text-green-400" />
      </div>
      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : unpaid.length === 0 ? <Empty icon="✅" text="No outstanding credits!" /> : (
        <div className="space-y-3">{unpaid.map(j => (
          <div key={j._id} className="card p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-heading text-base font-bold text-amber">{j.vehicleNumber}</div>
              <div className="text-sm text-gray-200">{j.customerName || '—'} {j.customerPhone ? `· ${j.customerPhone}` : ''}</div>
              <div className="text-xs text-gray-500">{j.jobNo} · {(j.branch as Branch)?.name || '—'} · {fmtDate(j.serviceInDate)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-heading text-xl font-bold text-red-400">₹{(j.balanceAmount ?? 0).toLocaleString()}</div>
              <button className="btn-success mt-2 text-xs px-3 py-1.5" onClick={() => { setSel(j); setMode('Cash') }}>Collect</button>
            </div>
          </div>
        ))}</div>
      )}
      <Modal open={!!selected} onClose={() => setSel(null)} title="Mark Credit Collected">
        {selected && <div className="space-y-4">
          <div className="bg-surface-2 rounded-lg p-3 text-sm"><div className="font-bold text-amber">{selected.vehicleNumber}</div><div>{selected.customerName || '—'}</div><div className="text-xl font-heading font-bold text-red-400 mt-1">₹{selected.totalAmount?.toLocaleString()}</div></div>
          <Field label="Payment Mode Received"><select className="input" value={mode} onChange={e => setMode(e.target.value)}>{['Cash', 'UPI', 'Card'].map(m => <option key={m}>{m}</option>)}</select></Field>
          <FormActions><button className="btn-outline" onClick={() => setSel(null)}>Cancel</button><button className="btn-success" onClick={collect} disabled={sub}>{sub ? <Spinner size="sm" /> : '✓ Mark Collected'}</button></FormActions>
        </div>}
      </Modal>
    </div>
  )
}