import { useEffect, useState, useCallback } from 'react'
import { jobs as jobsApi, parts as partsApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Spinner, StatusBadge, Empty, Modal, Field, FormActions, toast, fmtDate } from '../../components/ui'
import type { JobCard, Part, VendorBatch, SpareItem } from '../../types'

export function PortalJobs() {
  const [allJobs, setAllJobs] = useState<JobCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusF, setStatus]  = useState('')
  const [selected, setSel]    = useState<JobCard | null>(null)
  const [payMode, setPayMode] = useState('Cash')
  const [workDone, setWD]     = useState('')
  const [submitting, setSub]  = useState(false)
  const { user } = useAuth()
  const isEmployee = user?.role === 'employee'

  /* Spares used */
  const [spares, setSpares] = useState<SpareItem[]>([])
  const [partsList, setPartsList]     = useState<Part[]>([])
  const [spareSearch, setSpareSearch] = useState('')
  const [spareQtys, setSpareQtys]     = useState<Record<string, string>>({})

  useEffect(() => {
    if (!selected) return
    const branchId = typeof selected.branch === 'object' ? selected.branch._id : String(selected.branch || '')
    partsApi.list({ branch: branchId }).then(d => setPartsList(d.parts)).catch(() => {})
  }, [selected])

  const load = useCallback(async () => {
    setLoading(true)
    try { const d = await jobsApi.list({ limit: '200' }); setAllJobs(d.jobs) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = allJobs.filter(j => {
    if (search && !`${j.vehicleNumber} ${j.customerName || ''} ${j.mechanic} ${j.jobNo}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusF && j.status !== statusF) return false
    return true
  })

  const filteredParts = partsList.filter(p =>
    p.totalStock > 0 && p.isActive &&
    `${p.partNumber} ${p.partName} ${p.brand || ''}`.toLowerCase().includes(spareSearch.toLowerCase())
  )

  function openJob(j: JobCard) {
    setSel(j)
    setWD(j.workDone || '')
    setPayMode('Cash')
  }

  async function submitEdit() {
    if (!selected) return
    if (selected.status === 'In Progress' && !workDone.trim()) {
      toast('Work done is required before marking Ready', 'error'); return
    }
    setSub(true)
    try {
      const body: Record<string, unknown> = {}
      if (selected.status === 'Received') {
        body.status = 'In Progress'
      } else if (selected.status === 'In Progress') {
        body.status = 'Ready'
        body.workDone = workDone
      } else if (selected.status === 'Ready') {
        if (isEmployee) {
          toast('Employees cannot move a job to Delivered.', 'error');
          setSub(false)
          return
        }
        body.status = 'Delivered'
        body.paymentMode = payMode
        body.paymentStatus = 'Paid'
        body.actualDelivery = new Date().toISOString()
      }
      const d = await jobsApi.update(selected._id, body)
      toast(d.message || 'Status updated', 'success')
      setSel(null); load()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'error')
    } finally { setSub(false) }
  }

  function addSpare(part: Part, batch: VendorBatch) {
    const qty = parseInt(spareQtys[batch._id] || '1', 10) || 1
    if (qty < 1) { toast('Quantity must be at least 1', 'error'); return }
    if (qty > batch.stock) { toast(`Only ${batch.stock} in stock from ${batch.vendorName}`, 'error'); return }
    const existing = spares.findIndex(s => s.partId === part._id && s.vendorBatchId === batch._id)
    if (existing >= 0) {
      setSpares(s => s.map((item, i) => i === existing ? { ...item, qty: item.qty + qty } : item))
    } else {
      setSpares(s => [...s, {
        partId: part._id,
        partName: part.partName,
        vendorBatchId: batch._id,
        vendorName: batch.vendorName,
        sellingPrice: batch.sellingPrice,
        qty,
      }])
    }
    setSpareQtys(q => ({ ...q, [batch._id]: '1' }))
  }

  function removeSpare(idx: number) {
    setSpares(s => s.filter((_, i) => i !== idx))
  }

  async function addPartsToJob() {
    if (!selected) return
    if (spares.length === 0) {
      toast('Select parts to add before saving', 'error'); return
    }
    try {
      const d = await jobsApi.addSpares(selected._id, { sparesUsed: spares })
      toast('Parts added to job', 'success')
      setSel(d.job)
      setSpares([])
      setSpareQtys({})
      // Reload parts list to reflect updated stock
      const branchId = typeof selected.branch === 'object' ? selected.branch._id : String(selected.branch || '')
      partsApi.list({ branch: branchId }).then(d => setPartsList(d.parts)).catch(() => {})
      load()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed to add parts', 'error')
    }
  }

  return (
    <div className="space-y-3">
      <div className="page-title">📋 Job List</div>
      <div className="card p-3 space-y-2">
        <input className="input" placeholder="Search vehicle, customer, job no..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2">
          <select className="input" value={statusF} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {['Received','In Progress','Ready','Delivered','Cancelled'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-outline px-3 text-xs shrink-0" onClick={load}>↺</button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : filtered.length === 0 ? <Empty icon="📋" text="No job cards found" />
        : <div className="space-y-2">
            {filtered.map(j => (
              <button key={j._id} onClick={() => openJob(j)} className="w-full card p-4 text-left hover:border-amber/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-heading text-base font-bold text-amber">{j.vehicleNumber}</span>
                  <StatusBadge status={j.status} />
                </div>
                <div className="text-xs text-gray-400">{j.jobNo} · {j.brand} · {j.mechanic} · {fmtDate(j.serviceInDate)}</div>
                {/* Show spares summary if any */}
                {Array.isArray(j.sparesUsed) && j.sparesUsed.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Parts: {(j.sparesUsed as SpareItem[]).map(s => `${s.partName} ×${s.qty}`).join(', ')}
                  </div>
                )}
                <div className="flex justify-between mt-2 pt-2 border-t border-border">
                  <span className="font-heading text-sm font-bold text-green-400">₹{j.totalAmount?.toLocaleString()}</span>
                  <span className="text-xs text-gray-500">{j.paymentMode}</span>
                </div>
              </button>
            ))}
          </div>
      }

      <Modal open={!!selected} onClose={() => setSel(null)} title={selected?.jobNo || 'Job'} wide>
        {selected && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Vehicle', selected.vehicleNumber],
                ['Brand', `${selected.brand} ${selected.model || ''}`],
                ['Customer', selected.customerName || '—'],
                ['Phone', selected.customerPhone || '—'],
                ['Mechanic', selected.mechanic],
                ['Service', selected.serviceMode],
                ['Date', fmtDate(selected.serviceInDate)],
                ['Status', selected.status],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{l}</div>
                  <div className="font-medium">{v}</div>
                </div>
              ))}
            </div>
            
            {selected.complaint && (
              <div className="bg-surface-2 rounded-lg p-3 text-xs text-gray-300">
                <span className="text-gray-500">Complaint: </span>{selected.complaint}
              </div>
            )}

            {/* Show existing spares that were already added via full form */}
            {Array.isArray(selected.sparesUsed) && selected.sparesUsed.length > 0 && (
              <div className="bg-surface-2 rounded-lg p-3 space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Parts Used</div>
                {(selected.sparesUsed as SpareItem[]).map((s, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-200">{s.partName} <span className="text-gray-500">({s.vendorName})</span></span>
                    <span className="text-green-400 font-semibold">×{s.qty} · ₹{s.sellingPrice * s.qty}</span>
                  </div>
                ))}
              </div>
            )}

            {(selected.status !== 'Delivered' && selected.status !== 'Cancelled') && (
              <div className="space-y-3">
                <div className="bg-surface-2 rounded-lg p-3 space-y-3">
                  <div className="text-sm font-semibold text-gray-100">Add Parts to Job</div>
                  <p className="text-xs text-gray-400">Search branch stock and add selected vendor batches to this job.</p>

                  {spares.length > 0 && (
                    <div className="rounded-lg border border-border p-3 bg-black/20 space-y-2 text-xs">
                      <div className="font-semibold text-gray-200">Selected Parts</div>
                      {spares.map((s, i) => (
                        <div key={i} className="flex justify-between items-center gap-3">
                          <div className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap">
                            <span className="font-medium text-gray-100">{s.partName}</span>
                            <span className="text-gray-500"> ({s.vendorName})</span>
                          </div>
                          <div className="text-gray-300">×{s.qty}</div>
                          <button className="text-xs text-red-400 hover:text-red-200" onClick={() => removeSpare(i)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input className="input text-xs" placeholder="Search parts by name or brand..." value={spareSearch} onChange={e => setSpareSearch(e.target.value)} />
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {filteredParts.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-3">No matching parts with stock.</p>
                    ) : filteredParts.map(p => {
                      const activeBatches = p.vendorBatches.filter(b => b.isActive && b.stock > 0)
                      const hasMultiplePrices = new Set(activeBatches.map(b => b.sellingPrice)).size > 1
                      return (
                        <div key={p._id} className="bg-surface border border-border rounded-lg overflow-hidden">
                          <div className="px-3 py-2 flex items-center justify-between bg-surface-2">
                            <div>
                              <span className="font-heading font-bold text-amber">{p.partNumber}</span>
                              <span className="text-xs text-gray-400 ml-1.5">{p.partName}</span>
                            </div>
                            <span className="text-xs text-gray-500">{p.totalStock} in stock</span>
                          </div>
                          {activeBatches.map((b, idx) => (
                            <div key={b._id} className="flex items-center gap-3 px-3 py-2.5 border-t border-border/40">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-100">{b.vendorName}</span>
                                  <span className="font-heading font-bold text-green-400">₹{b.sellingPrice}</span>
                                </div>
                                <div className="text-xs text-gray-500">{b.stock} available</div>
                              </div>
                              <input type="number" min="1" max={b.stock} className="input w-16 text-xs py-1 text-center" value={spareQtys[b._id] ?? '1'} onChange={e => setSpareQtys(q => ({ ...q, [b._id]: e.target.value }))} />
                              <button className="btn-primary btn-xs px-3 py-1.5" onClick={() => addSpare(p, b)}>Add</button>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button className="btn-primary px-4 py-2" onClick={addPartsToJob} disabled={spares.length === 0}>Add parts to job</button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              {selected.status === 'Received' && (
                <p className="text-xs text-gray-400">Changing to <strong>In Progress</strong> — confirm by tapping the button below.</p>
              )}

              {selected.status === 'In Progress' && (
                <>
                  <p className="text-xs text-gray-400">Changing to <strong>Ready</strong> — describe all work completed:</p>
                  <Field label="Work Done *">
                    <textarea className="input resize-none" rows={3} placeholder="Describe all work done..."
                      value={workDone} onChange={e => setWD(e.target.value)} />
                  </Field>
                  <p className="text-xs text-gray-600">
                    💡 Parts/spares can be assigned directly from this job view.
                  </p>
                </>
              )}

              {selected.status === 'Ready' && !isEmployee && (
                <>
                  <p className="text-xs text-gray-400">Customer collecting — select payment mode:</p>
                  <Field label="Payment Mode *">
                    <select className="input" value={payMode} onChange={e => setPayMode(e.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                    </select>
                  </Field>
                </>
              )}
              {selected.status === 'Ready' && isEmployee && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-100">
                  Employees can move jobs only up to <strong>Ready</strong>. Delivery must be completed by manager/admin.
                </div>
              )}

              {selected.status !== 'Delivered' && selected.status !== 'Cancelled' && (
                <div className="flex gap-2 justify-end pt-1">
                  <button className="btn-outline" onClick={() => setSel(null)}>Cancel</button>
                  <button className="btn-primary" onClick={submitEdit} disabled={submitting || (isEmployee && selected.status === 'Ready')}>
                    {submitting ? <Spinner size="sm" /> : (
                      selected.status === 'Received' ? 'Mark In Progress →' :
                      selected.status === 'In Progress' ? 'Mark Ready →' :
                      selected.status === 'Ready' ? (isEmployee ? 'Delivery restricted' : 'Mark Delivered →') : 'Submit'
                    )}
                  </button>
                </div>
              )}

              {(selected.status === 'Delivered' || selected.status === 'Cancelled') && (
                <p className="text-xs text-gray-500 text-center">This job is {selected.status.toLowerCase()}.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
