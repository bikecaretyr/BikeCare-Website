import { useEffect, useState } from 'react'
import { jobs as jobsApi, parts as partsApi, branches as branchesApi } from '../../api/client'
import { Spinner, StatusBadge, Table, Tr, Td, Modal, FormGrid, Field, FormActions, toast, fmtDate, fmtMoney } from '../../components/ui'
import { useData } from '../../hooks/useData'
import { useForm } from '../../hooks/useForm'
import { useAuth } from '../../context/AuthContext'
import { JobInvoice } from '../../components/JobInvoice'
import { JobIntakePrint } from '../../components/JobIntakePrint'
import type { Branch, JobCard, Part, SpareItem, VendorBatch } from '../../types'

type JobsPageProps = {
  basePath: string
  title: string
  showBranch: boolean
}

type JobForm = {
  vehicleNumber: string
  brand: string
  model: string
  customerName: string
  customerPhone: string
  kmReading: string
  serviceInDate: string
  expectedDelivery: string
  branch?: string
  serviceMode: string
  mechanic: string
  complaint: string
  engineOil: string
  workDone: string
  labourCharge: string
  waterWash: string
  discount: string
  paymentMode: string
  status: string
  paymentStatus: 'Paid' | 'Pending' | 'Partial'
  paidAmount: string
}

const BRANDS = ['Hero', 'Honda', 'Bajaj', 'TVS', 'Yamaha', 'Suzuki', 'Royal Enfield', 'KTM', 'Ather', 'Other']
const MODES = ['General Service', 'Engine Repair', 'Tyre Change', 'Electrical Work', 'Body Work', 'Full Service', 'Other']
const STATUSES = ['Received', 'In Progress', 'Ready', 'Delivered', 'Cancelled']

const emptyForm: JobForm = {
  vehicleNumber: '', brand: '', model: '', customerName: '', customerPhone: '',
  kmReading: '', serviceInDate: new Date().toISOString().split('T')[0], expectedDelivery: '',
  serviceMode: 'General Service', mechanic: '', complaint: '', engineOil: '', workDone: '',
  labourCharge: '0', waterWash: '0', discount: '0', paymentMode: 'Cash', paymentStatus: 'Paid', paidAmount: '0', status: 'Received',
}

export function JobsPage({ basePath, title, showBranch }: JobsPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [modal, setModal] = useState<JobCard | 'new' | null>(null)
  const [spares, setSpares] = useState<SpareItem[]>([])
  const [partsList, setPartsList] = useState<Part[]>([])
  const [spareSearch, setSpareSearch] = useState('')
  const [spareQtys, setSpareQtys] = useState<Record<string, string>>({})
  const [invoiceJob, setInvoiceJob] = useState<JobCard | null>(null)
  const [intakeJob, setIntakeJob] = useState<JobCard | null>(null)
  const [paymentJob, setPaymentJob] = useState<JobCard | null>(null)
  const [collectAmount, setCollectAmount] = useState('')
  const [collectMode, setCollectMode] = useState<'Cash' | 'UPI' | 'Card' | 'Credit'>('Cash')
  const canAddSpares = modal !== 'new'
  const { form, setForm, set, reset, saving, setSaving } = useForm<JobForm>(emptyForm)
  const { user } = useAuth()

  function openPayment(job: JobCard) {
    setPaymentJob(job)
    setCollectMode('Cash')
    setCollectAmount(String(job.balanceAmount && job.balanceAmount > 0 ? job.balanceAmount : job.totalAmount || 0))
  }

  async function collectPayment() {
    if (!paymentJob) return

    const total = paymentJob.totalAmount ?? 0
    const alreadyPaid = paymentJob.paidAmount ?? 0
    const balance = paymentJob.balanceAmount && paymentJob.balanceAmount > 0
      ? paymentJob.balanceAmount
      : Math.max(0, total - alreadyPaid)

    const amount = collectMode === 'Credit'
      ? (+collectAmount || 0)
      : balance

    if (amount < 0) {
      toast('Enter valid amount', 'error')
      return
    }

    if (amount > balance) {
      toast('Amount cannot exceed balance', 'error')
      return
    }

    try {
      await jobsApi.addPayment(paymentJob._id, {
        amount,
        mode: collectMode,
        note: collectMode === 'Credit'
          ? 'Bill settled as credit'
          : 'Payment collected',
      })

      toast('Payment updated', 'success')
      setPaymentJob(null)
      setCollectAmount('')
      await reloadJobs()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'error')
    }
  }

  const userBranchId = user?.branch && typeof user.branch !== 'string'
    ? user.branch._id
    : typeof user?.branch === 'string'
      ? user.branch
      : undefined

  const { data: allJobs, loading: jobsLoading, reload: reloadJobs } = useData(async () => {
    const d = await jobsApi.list({ limit: '300' })
    return d.jobs
  }, [])

  const { data: branchList } = useData(async () => {
    if (!showBranch) return [] as Branch[]
    const d = await branchesApi.list()
    return d.branches
  }, [showBranch])

  useEffect(() => {
    if (!modal) return
    const params: Record<string, string> = {}
    if (showBranch && form.branch) params.branch = form.branch
    partsApi.list(params).then(d => setPartsList(d.parts)).catch(() => {})
  }, [modal, form.branch, showBranch])

  useEffect(() => {
    if (form.paymentMode !== 'Credit') {
      set('paidAmount', '0')
    }
  }, [form.paymentMode])

  const filteredJobs = (allJobs ?? []).filter(job => {
    if (search && !`${job.vehicleNumber} ${job.customerName ?? ''} ${job.mechanic} ${job.jobNo}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && job.status !== statusFilter) return false
    if (paymentFilter && job.paymentMode !== paymentFilter) return false
    return true
  })

  const openNew = () => {
    setForm({ ...emptyForm, branch: showBranch ? (userBranchId ?? '') : (userBranchId ?? undefined) })
    setSpares([])
    setSpareSearch('')
    setModal('new')
  }

  const openEdit = (job: JobCard) => {
    setForm({
      vehicleNumber: job.vehicleNumber,
      brand: job.brand,
      model: job.model || '',
      customerName: job.customerName || '',
      customerPhone: job.customerPhone || '',
      kmReading: String(job.kmReading ?? ''),
      serviceInDate: job.serviceInDate.split('T')[0],
      expectedDelivery: job.expectedDelivery?.split('T')[0] ?? '',
      branch: showBranch ? (typeof job.branch === 'object' ? (job.branch as Branch)._id : (job.branch as string) ?? '') : undefined,
      serviceMode: job.serviceMode,
      mechanic: job.mechanic,
      complaint: job.complaint || '',
      engineOil: job.engineOil || '',
      workDone: job.workDone || '',
      labourCharge: String(job.labourCharge),
      waterWash: String(job.waterWash),
      discount: String(job.discount),
      paymentMode: job.paymentMode,
      paymentStatus: job.paymentStatus || 'Pending',
      paidAmount: String(job.paidAmount ?? 0),
      status: job.status,
    })
    setSpares(Array.isArray(job.sparesUsed) ? job.sparesUsed : [])
    setSpareSearch('')
    setModal(job)
  }

  const addSpare = (part: Part, batch: VendorBatch) => {
    const qty = parseInt(spareQtys[batch._id] || '1') || 1
    if (qty > batch.stock) {
      toast(`Only ${batch.stock} in stock from ${batch.vendorName}`, 'error')
      return
    }
    const existing = spares.findIndex(item => item.partId === part._id && item.vendorBatchId === batch._id)
    if (existing >= 0) {
      setSpares(current => current.map((item, index) => index === existing ? { ...item, qty: item.qty + qty } : item))
    } else {
      setSpares(current => [...current, {
        partId: part._id,
        partNumber: part.partNumber,
        partName: part.partName,
        vendorBatchId: batch._id,
        vendorName: batch.vendorName,
        sellingPrice: batch.sellingPrice,
        qty,
      }])
    }
    setSpareQtys(current => ({ ...current, [batch._id]: '1' }))
  }

  const removeSpare = (index: number) => setSpares(current => current.filter((_, i) => i !== index))
  const updateSpareQty = (index: number, value: string) => {
    const qty = parseInt(value)
    if (!isNaN(qty) && qty > 0) {
      setSpares(current => current.map((item, i) => i === index ? { ...item, qty } : item))
    }
  }

  const save = async () => {
    if (!form.vehicleNumber || !form.brand || !form.mechanic) {
      toast('Vehicle, brand and mechanic required', 'error')
      return
    }
    if (showBranch && !form.branch) {
      toast('Branch is required', 'error')
      return
    }
    setSaving(true)
    try {
      const {
        paymentStatus,
        paidAmount: _paidAmount,
        branch: _branch,
        ...cleanForm
      } = form

      const body: Record<string, unknown> = {
        ...cleanForm,
        branch: showBranch ? form.branch : (userBranchId ?? undefined),
        kmReading: form.kmReading ? +form.kmReading : undefined,
        labourCharge: +form.labourCharge || 0,
        waterWash: +form.waterWash || 0,
        discount: +form.discount || 0,
        expectedDelivery: form.expectedDelivery || undefined,
        sparesUsed: spares,
      }
      if (modal && modal !== 'new') {
        const jobId = (modal as JobCard)._id
        await jobsApi.update(jobId, body)

        toast('Job updated', 'success')
      } else {
        const result = await jobsApi.create(body)
        toast(`Created: ${result.job.jobNo}`, 'success')
        setIntakeJob(result.job)
      }
      setModal(null)
      reset()
      setSpares([])
      await reloadJobs()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const quickStatus = (job: JobCard) => {
    const nextStatus = job.status === 'Received'
      ? 'In Progress'
      : job.status === 'In Progress'
        ? 'Ready'
        : 'Delivered'
    openEdit(job)
    setForm(prev => ({ ...prev, status: nextStatus }))
  }

  const filteredParts = partsList.filter(part =>
    part.totalStock > 0 && part.isActive &&
    `${part.partNumber} ${part.partName} ${part.brand || ''}`.toLowerCase().includes(spareSearch.toLowerCase())
  )

  const sparesTotal = spares.reduce((sum, item) => sum + item.sellingPrice * item.qty, 0)

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title mb-0">{title}</h1>
        <button className="btn-primary" onClick={openNew}>+ New Job</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="input flex-1 min-w-[220px] text-xs" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-auto text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select className="input w-auto text-xs" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
          <option value="">All Payment</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
          <option value="Credit">Credit</option>
        </select>
      </div>

      <div className="card">
        {jobsLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <Table headers={['Job No', 'Vehicle', 'Customer', 'Mechanic', 'Date', 'Status', 'Payment', 'Total', 'Actions']} empty={filteredJobs.length === 0}>
            {filteredJobs.map(job => (
              <Tr key={job._id}>
                <Td className="font-semibold text-sm">{job.jobNo}</Td>
                <Td>{job.vehicleNumber}</Td>
                <Td>{job.customerName || '—'}</Td>
                <Td>{job.mechanic}</Td>
                <Td>{fmtDate(job.serviceInDate)}</Td>
                <Td><StatusBadge status={job.status} /></Td>
                <Td>
                  <div className="space-y-1">
                    <StatusBadge status={job.paymentMode} />
                    <StatusBadge status={job.paymentStatus} />
                  </div>
                </Td>
                <Td>{fmtMoney(job.totalAmount ?? 0)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <button
                      className="btn-outline px-2 py-1 text-xs"
                      onClick={() => openEdit(job)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn-outline px-2 py-1 text-xs"
                      onClick={() => setIntakeJob(job)}
                    >
                      📄 Job Sheet
                    </button>

                    {(job.status === 'Ready' || job.status === 'Delivered') && (
                      <button
                        className="btn-outline px-2 py-1 text-xs"
                        onClick={() => setInvoiceJob(job)}
                      >
                        🖨 Bill
                      </button>
                    )}

                    {job.status !== 'Delivered' && job.status !== 'Cancelled' && (
                      <button
                        className="btn-primary px-2 py-1 text-xs"
                        onClick={() => quickStatus(job)}
                      >
                        {job.status === 'Received'
                          ? '→ Progress'
                          : job.status === 'In Progress'
                            ? '→ Ready'
                            : '→ Deliver'}
                      </button>
                    )}
                    {job.status !== 'Cancelled' && (job.paymentStatus !== 'Paid') && (
                      <button
                        className="btn-success px-2 py-1 text-xs"
                        onClick={() => openPayment(job)}
                      >
                        💰 Payment
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'New Job' : 'Edit Job'} wide>
        <div className="space-y-4">
          <FormGrid>
            <Field label="Vehicle No" required>
              <input className="input uppercase" value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Brand" required>
              <select className="input" value={form.brand} onChange={e => set('brand', e.target.value)}>
                <option value="">Select</option>
                {BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </Field>
            <Field label="Customer Name"><input className="input" value={form.customerName} onChange={e => set('customerName', e.target.value)} /></Field>
            <Field label="Customer Phone"><input className="input" maxLength={10} value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} /></Field>
            <Field label="Model"><input className="input" value={form.model} onChange={e => set('model', e.target.value)} /></Field>
            <Field label="KM Reading"><input className="input" type="number" value={form.kmReading} onChange={e => set('kmReading', e.target.value)} /></Field>
            {showBranch && (
              <Field label="Branch" required>
                <select className="input" value={form.branch ?? ''} onChange={e => set('branch', e.target.value)}>
                  <option value="">Select</option>
                  {branchList?.map(branch => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Mechanic" required><input className="input" value={form.mechanic} onChange={e => set('mechanic', e.target.value)} /></Field>
            <Field label="Service Date"><input className="input" type="date" value={form.serviceInDate} onChange={e => set('serviceInDate', e.target.value)} /></Field>
            <Field label="Expected Delivery"><input className="input" type="date" value={form.expectedDelivery} onChange={e => set('expectedDelivery', e.target.value)} /></Field>
            <Field label="Service Mode">
              <select className="input" value={form.serviceMode} onChange={e => set('serviceMode', e.target.value)}>
                {MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
            <Field label="Complaint" span>
              <textarea className="input resize-none" rows={2} value={form.complaint} onChange={e => set('complaint', e.target.value)} />
            </Field>
            <Field label="Engine Oil"><input className="input" value={form.engineOil} onChange={e => set('engineOil', e.target.value)} /></Field>
            <Field label="Work Done" span>
              <textarea className="input resize-none" rows={2} value={form.workDone} onChange={e => set('workDone', e.target.value)} />
            </Field>
            <Field label="Labour Charge (₹)"><input className="input" type="number" value={form.labourCharge} onChange={e => set('labourCharge', e.target.value)} /></Field>
            <Field label="Water Wash (₹)"><input className="input" type="number" value={form.waterWash} onChange={e => set('waterWash', e.target.value)} /></Field>
            <Field label="Discount (₹)"><input className="input" type="number" value={form.discount} onChange={e => set('discount', e.target.value)} /></Field>
            <Field label="Total (₹)">
              <div className="input bg-[#090b10] text-amber font-heading text-lg font-bold cursor-default">
                ₹{(
                  (+form.labourCharge || 0) +
                  (+form.waterWash || 0) +
                  sparesTotal -
                  (+form.discount || 0)
                ).toLocaleString()}
              </div>
            </Field>
            <Field label="Payment Mode">
              <select
                className="input"
                value={form.paymentMode}
                onChange={e => set('paymentMode', e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Credit">Credit</option>
              </select>
            </Field>
            {form.paymentMode === 'Credit' && (
              <>
                <Field label="Paid Amount (₹)">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.paidAmount}
                    onChange={e => set('paidAmount', e.target.value)}
                  />
                </Field>

                <Field label="Balance (₹)">
                  <div className="input bg-[#090b10] text-red-400 font-bold cursor-default">
                    ₹{Math.max(
                      0,
                      (
                        (+form.labourCharge || 0) +
                        (+form.waterWash || 0) +
                        sparesTotal -
                        (+form.discount || 0)
                      ) - (+form.paidAmount || 0)
                    ).toLocaleString()}
                  </div>
                </Field>
              </>
            )}
          </FormGrid>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-100">
                Parts / Spares Used
                {spares.length > 0 && (
                  <span className="ml-2 text-xs text-amber font-bold">{spares.reduce((sum, item) => sum + item.qty, 0)} items · ₹{sparesTotal.toLocaleString()}</span>
                )}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {spares.length > 0 && (
                <div className="space-y-1.5">
                  {spares.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-surface-2 border border-border rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-amber truncate">{item.partNumber}</div>
                        <div className="text-xs text-gray-500">{item.partName} · {item.vendorName}</div>
                      </div>
                      <input type="number" min="1" className="input w-14 text-xs py-1 text-center" value={item.qty} onChange={e => updateSpareQty(index, e.target.value)} />
                      <div className="text-sm font-bold text-green-400 shrink-0 w-16 text-right">₹{(item.sellingPrice * item.qty).toLocaleString()}</div>
                      <button onClick={() => removeSpare(index)} className="text-gray-600 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  ))}
                  <div className="text-xs text-right text-gray-400">Spares total: <strong className="text-amber">₹{sparesTotal.toLocaleString()}</strong></div>
                </div>
              )}
              {!canAddSpares ? (
                <div className="rounded-xl border border-dashed border-gray-500 bg-gray-950/30 p-4 text-sm text-gray-300">
                  Parts cannot be selected while creating a new job card. Add them later once the job is moved to <strong>In Progress</strong>.
                </div>
              ) : (
                <>
                  <input className="input text-xs" placeholder="Search parts..." value={spareSearch} onChange={e => setSpareSearch(e.target.value)} />
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredParts.length === 0 ? (
                      <p className="text-xs text-gray-600 text-center py-3">No parts with stock available.</p>
                    ) : (
                      filteredParts.map(part => {
                        const activeBatches = part.vendorBatches.filter(batch => batch.isActive && batch.stock > 0)
                        const hasMultiplePrices = new Set(activeBatches.map(batch => batch.sellingPrice)).size > 1
                        return (
                          <div key={part._id} className="bg-surface border border-border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 flex items-center justify-between bg-surface-2">
                          <div>
                            <span className="font-heading font-bold text-amber">{part.partNumber}</span>
                            <span className="text-xs text-gray-400 ml-1.5">{part.partName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasMultiplePrices && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20">{activeBatches.length} prices</span>
                            )}
                            <span className="text-xs text-gray-500">{part.totalStock} in stock</span>
                          </div>
                        </div>
                        {activeBatches.map((batch, index) => (
                          <div key={batch._id} className={`flex items-center gap-3 px-3 py-2.5 border-t border-border/40${hasMultiplePrices ? ' hover:bg-surface-2 transition-colors' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-100">{batch.vendorName}</span>
                                <span className={`font-heading font-bold px-2 py-0.5 rounded-lg text-sm${hasMultiplePrices ? ' bg-green-500/15 text-green-400 border border-green-500/20' : ' text-green-400'}`}>
                                  ₹{batch.sellingPrice.toLocaleString()}
                                </span>
                                {hasMultiplePrices && index === 0 && (<span className="text-[10px] text-gray-600 bg-surface-2 px-1.5 py-0.5 rounded">lowest</span>)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{batch.stock} units in stock</div>
                            </div>
                            <input type="number" min="1" max={batch.stock} className="input w-14 text-xs py-1 text-center shrink-0" value={spareQtys[batch._id] ?? '1'} onChange={e => setSpareQtys(current => ({ ...current, [batch._id]: e.target.value }))} />
                            <button className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors${hasMultiplePrices ? ' bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' : ' btn-primary'}`} onClick={() => addSpare(part, batch)}>
                              + Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <FormActions>
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size="sm" /> : '💾 Save'}</button>
          </FormActions>
        </div>
      </Modal>

      {invoiceJob && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <JobInvoice
            job={invoiceJob}
            onClose={() => { setInvoiceJob(null); reloadJobs() }}
            onSave={async (data) => {
              await jobsApi.update(invoiceJob._id, data as unknown as Record<string, unknown>)
              toast('Invoice saved', 'success')
            }}
          />
        </div>
      )}

      <Modal
        open={!!paymentJob}
        onClose={() => setPaymentJob(null)}
        title={`Collect Payment — ${paymentJob?.jobNo ?? ''}`}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            <div>Total: {fmtMoney(paymentJob?.totalAmount ?? 0)}</div>
            <div>Paid: {fmtMoney(paymentJob?.paidAmount ?? 0)}</div>
            <div className="font-bold text-red-400">
              Balance: {fmtMoney(paymentJob?.balanceAmount ?? 0)}
            </div>
          </div>

          <FormGrid>
            <Field label="Amount">
              <input
                className="input"
                type="number"
                min="1"
                max={paymentJob?.balanceAmount ?? 0}
                value={collectAmount}
                onChange={e => setCollectAmount(e.target.value)}
              />
            </Field>

            <Field label="Payment Mode">
              <select
                className="input"
                value={collectMode}
                onChange={e => setCollectMode(e.target.value as 'Cash' | 'UPI' | 'Card' | 'Credit')}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Credit">Credit</option>
              </select>
            </Field>
            
          </FormGrid>

          <FormActions>
            <button className="btn-outline" onClick={() => setPaymentJob(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={collectPayment}>
              Collect Payment
            </button>
          </FormActions>
        </div>
      </Modal>

      {intakeJob && (
        <JobIntakePrint
          job={intakeJob}
          onClose={() => setIntakeJob(null)}
        />
      )}

    </div>
  )
}
