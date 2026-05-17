import { useState } from 'react'
import { approvals as approvalsApi } from '../../api/client'
import { Spinner, StatusBadge, Empty, Modal, Field, FormActions, toast, fmtDate } from '../../components/ui'
import { useData } from '../../hooks/useData'
import type { ApprovalRequest, Branch } from '../../types'

interface ApprovalsPageProps {
  title: string
  reviewLabel: string
}

export function ApprovalsPage({ title, reviewLabel }: ApprovalsPageProps) {
  const [statusFilter, setStatusFilter] = useState('Pending')
  const [selected, setSelected] = useState<ApprovalRequest | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: requests, loading, reload } = useData(async () => {
    const d = await approvalsApi.list({ status: statusFilter })
    return d.requests
  }, [statusFilter])

  const review = async (action: 'approve' | 'reject') => {
    if (!selected) return
    setSaving(true)
    try {
      await approvalsApi.review(selected._id, action, note)
      toast(`Request ${action}d`, 'success')
      setSelected(null)
      setNote('')
      await reload()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="page-title">📝 {title}</h1>
      <div className="flex gap-2">
        <select
          className="input w-auto text-xs"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <button className="btn-outline px-3 text-xs" onClick={reload}>↺</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (requests?.length ?? 0) === 0 ? (
        <Empty icon="✅" text="No requests" />
      ) : (
        <div className="space-y-3">
          {requests!.map(request => (
            <div key={request._id} className="card p-4 hover:border-amber/25 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber">
                      {request.type.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="text-sm font-medium">
                    {request.requestedBy?.name} <span className="text-gray-500 text-xs">({request.requestedBy?.role})</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    📍 {(request.branch as Branch)?.name || '—'} · {fmtDate(request.createdAt)}
                  </div>
                  {request.reason && (
                    <div className="text-xs text-gray-400 mt-1 italic">"{request.reason}"</div>
                  )}
                  {request.reviewNote && (
                    <div className={`text-xs mt-1 px-2 py-1 rounded ${request.status === 'Rejected' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {reviewLabel}: {request.reviewNote}
                    </div>
                  )}
                </div>
                {request.status === 'Pending' && (
                  <button
                    className="btn-primary shrink-0 text-xs px-3 py-1.5"
                    onClick={() => {
                      setSelected(request)
                      setNote('')
                    }}
                  >
                    Review →
                  </button>
                )}
              </div>
              {request.requestedData && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">View changes</summary>
                  <pre className="mt-2 text-xs bg-[#090b10] border border-border rounded-lg p-3 overflow-x-auto text-gray-400 max-h-32">
                    {JSON.stringify(request.requestedData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review Request">
        {selected && (
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-lg p-3 text-sm space-y-1">
              <div>
                <span className="text-gray-500">Type: </span>
                <span className="font-bold uppercase text-amber">{selected.type.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-gray-500">From: </span>
                {selected.requestedBy?.name} ({selected.requestedBy?.role})
              </div>
              {selected.reason && (
                <div>
                  <span className="text-gray-500">Reason: </span>
                  {selected.reason}
                </div>
              )}
            </div>
            <Field label="Note (optional)">
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Reason for approval or rejection..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </Field>
            <FormActions>
              <button className="btn-outline" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => review('reject')} disabled={saving}>✕ Reject</button>
              <button className="btn-success" onClick={() => review('approve')} disabled={saving}>
                {saving ? <Spinner size="sm" /> : '✓ Approve'}
              </button>
            </FormActions>
          </div>
        )}
      </Modal>
    </div>
  )
}
