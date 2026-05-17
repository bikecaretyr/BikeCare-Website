import { useState, useEffect } from 'react'
import { branches as branchesApi, parts as partsApi, vehicleLookup } from '../api/client'
import { FormGrid, Field, FormActions, toast, Spinner } from '../components/ui'
import type { Branch, Part, VendorBatch, SpareItem } from '../types'

const BRANDS = ['Hero','Honda','Bajaj','TVS','Yamaha','Suzuki','Royal Enfield','KTM','Ather','Other']
const MODES  = ['General Service','Engine Repair','Tyre Change','Electrical Work','Body Work','Full Service','Other']

interface JobFormProps {
  initialData: Partial<{
    vehicleNumber: string; brand: string; model: string
    customerName: string; customerPhone: string; kmReading: string
    serviceInDate: string; expectedDelivery: string; branch: string
    serviceMode: string; mechanic: string; complaint: string; status: string
  }>
  onSubmit: (formData: any) => Promise<void>
  branchList?: Branch[]
  user: any
  allowSpares?: boolean
}

export function JobForm({ initialData, onSubmit, branchList: propBranchList, user, allowSpares = true }: JobFormProps) {
  const [branchList, setBranchList] = useState<Branch[]>(propBranchList || [])
  const [submitting, setSubmitting] = useState(false)
  const [autofilling, setAutofilling] = useState(false)

  // ── Spares state ─────────────────────────────────────────
  const [partsList, setPartsList]   = useState<Part[]>([])
  const [spares, setSpares]         = useState<SpareItem[]>([])
  const [spareSearch, setSpareSearch] = useState('')
  const [spareQtys, setSpareQtys]   = useState<Record<string, string>>({}) // batchId → qty string

  const emptyForm = {
    vehicleNumber: '', brand: '', model: '', customerName: '', customerPhone: '',
    kmReading: '', serviceInDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '', branch: '', serviceMode: 'General Service',
    mechanic: '', complaint: '', status: 'Received',
  }
  const [form, setForm] = useState({ ...emptyForm, ...initialData })
  const setField = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  useEffect(() => {
    if (!propBranchList) {
      branchesApi.list().then(d => {
        setBranchList(d.branches)
        const bid = user?.branch && typeof user.branch === 'object' ? (user.branch as Branch)._id : ''
        setField('branch', bid || d.branches[0]?._id || '')
      }).catch(() => {})
    }
    setField('mechanic', user?.name || '')
  }, [user, propBranchList])

  // Load parts for this branch whenever branch changes
  useEffect(() => {
    if (!form.branch) return
    partsApi.list({ branch: form.branch }).then(d => setPartsList(d.parts)).catch(() => {})
  }, [form.branch])

  // ── Vehicle auto-fill via API ─────────────────────────────
  async function autofill(val: string) {
    if (val.length < 4) return
    setAutofilling(true)
    try {
      const d = await vehicleLookup(val)
      if (d.found && d.data) {
        setForm(f => ({
          ...f,
          customerName:  f.customerName  || d.data!.customerName  || '',
          customerPhone: f.customerPhone || d.data!.customerPhone || '',
          brand:         f.brand         || d.data!.brand         || '',
          model:         f.model         || d.data!.model         || '',
        }))
        toast(`Returning customer — details filled in`, 'success')
      }
    } catch { /* not found — fine */ }
    finally { setAutofilling(false) }
  }

  // ── Spare management ──────────────────────────────────────
  function addSpare(part: Part, batch: VendorBatch) {
    const qty = parseInt(spareQtys[batch._id] || '1') || 1
    if (qty < 1) { toast('Quantity must be at least 1', 'error'); return }
    if (qty > batch.stock) { toast(`Only ${batch.stock} in stock from ${batch.vendorName}`, 'error'); return }

    // If same part+batch already added, just increment qty
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
    // Reset qty input for this batch
    setSpareQtys(q => ({ ...q, [batch._id]: '1' }))
  }

  function removeSpare(idx: number) {
    setSpares(s => s.filter((_, i) => i !== idx))
  }

  function updateSpareQty(idx: number, val: string) {
    const n = parseInt(val)
    if (!isNaN(n) && n > 0) setSpares(s => s.map((item, i) => i === idx ? { ...item, qty: n } : item))
  }

  const sparesTotal = spares.reduce((sum, s) => sum + s.sellingPrice * s.qty, 0)

  const filteredParts = partsList.filter(p =>
    p.totalStock > 0 &&
    p.isActive &&
    `${p.partNumber} ${p.partName} ${p.brand || ''}`.toLowerCase().includes(spareSearch.toLowerCase())
  )

  // ── Submit ─────────────────────────────────────────────
  async function submit() {
    if (!form.vehicleNumber) { toast('Vehicle number required', 'error'); return }
    if (!form.brand)         { toast('Brand required', 'error'); return }
    if (!form.mechanic)      { toast('Mechanic name required', 'error'); return }
    if (!form.branch)        { toast('Branch required', 'error'); return }

    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        kmReading: form.kmReading ? +form.kmReading : undefined,
        expectedDelivery: form.expectedDelivery || undefined,
        sparesUsed: spares,         // ← structured array sent to backend
        labourCharge: 0, waterWash: 0, discount: 0,
        paymentMode: 'Cash',
      })
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-5">
      <FormGrid>
        {/* Vehicle */}
        <Field label="Vehicle Number" required span>
          <div className="relative">
            <input className="input uppercase pr-8" placeholder="TN59AB1234"
              value={form.vehicleNumber}
              onChange={e => setField('vehicleNumber', e.target.value.toUpperCase())}
              onBlur={e => { if (e.target.value.length >= 4) autofill(e.target.value.toUpperCase()) }} />
            {autofilling && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2"><Spinner size="sm" /></span>
            )}
          </div>
        </Field>
        <Field label="Brand" required>
          <select className="input" value={form.brand} onChange={e => setField('brand', e.target.value)}>
            <option value="">Select</option>
            {BRANDS.map(b => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Model">
          <input className="input" placeholder="Splendor Plus" value={form.model} onChange={e => setField('model', e.target.value)} />
        </Field>
        <Field label="Customer Name">
          <input className="input" value={form.customerName} onChange={e => setField('customerName', e.target.value)} />
        </Field>
        <Field label="Customer Phone">
          <input className="input" maxLength={10} value={form.customerPhone} onChange={e => setField('customerPhone', e.target.value)} />
        </Field>
        <Field label="KM Reading">
          <input className="input" type="number" placeholder="24500" value={form.kmReading} onChange={e => setField('kmReading', e.target.value)} />
        </Field>
        <Field label="Branch" required>
          <select className="input" value={form.branch} onChange={e => setField('branch', e.target.value)}>
            {branchList.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Mechanic" required>
          <input className="input" placeholder="Mechanic name" value={form.mechanic} onChange={e => setField('mechanic', e.target.value)} />
        </Field>
        <Field label="Service Date">
          <input className="input" type="date" value={form.serviceInDate} onChange={e => setField('serviceInDate', e.target.value)} />
        </Field>
        <Field label="Expected Delivery">
          <input className="input" type="date" value={form.expectedDelivery} onChange={e => setField('expectedDelivery', e.target.value)} />
        </Field>
        <Field label="Service Mode">
          <select className="input" value={form.serviceMode} onChange={e => setField('serviceMode', e.target.value)}>
            {MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Complaint" span>
          <textarea className="input resize-none" rows={2} placeholder="What the customer reported..."
            value={form.complaint} onChange={e => setField('complaint', e.target.value)} />
        </Field>
      </FormGrid>

      {/* ── Spares Section ─────────────────────────────────── */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-surface-2 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-gray-100">Parts / Spares Used</span>
            {spares.length > 0 && (
              <span className="ml-2 text-xs text-amber font-bold">
                {spares.reduce((s, i) => s + i.qty, 0)} items · ₹{sparesTotal.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Added spares list */}
          {spares.length > 0 && (
            <div className="space-y-1.5">
              {spares.map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-surface-2 border border-border rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div><span className="font-heading font-bold text-amber text-sm">{s.partNumber || ''}</span><span className="text-xs text-gray-400 ml-1.5">{s.partName}</span></div>
                    <div className="text-xs text-gray-500">{s.vendorName} · ₹{s.sellingPrice} each</div>
                  </div>
                  {/* Inline qty editor */}
                  <input type="number" min="1"
                    className="input w-14 text-xs py-1 text-center"
                    value={s.qty}
                    onChange={e => updateSpareQty(i, e.target.value)} />
                  <div className="text-sm font-bold text-green-400 shrink-0 w-16 text-right">
                    ₹{(s.sellingPrice * s.qty).toLocaleString()}
                  </div>
                  <button onClick={() => removeSpare(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors shrink-0">✕</button>
                </div>
              ))}
              <div className="text-xs text-right text-gray-400 pt-1">
                Spares total: <strong className="text-amber text-sm">₹{sparesTotal.toLocaleString()}</strong>
              </div>
            </div>
          )}

          {!allowSpares ? (
            <div className="rounded-xl border border-dashed border-gray-500 bg-gray-950/30 p-4 text-sm text-gray-300">
              Parts cannot be selected during initial job creation. Add them later once the job is moved to <strong>In Progress</strong>.
            </div>
          ) : partsList.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-3">
              {form.branch ? 'No parts with stock in this branch.' : 'Select a branch to see available parts.'}
            </p>
          ) : (
            <>
              <input className="input text-xs" placeholder="Search parts by name or brand..."
                value={spareSearch} onChange={e => setSpareSearch(e.target.value)} />

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {filteredParts.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-3">No matching parts with stock.</p>
                )}
                {filteredParts.map(p => {
                  const activeBatches = p.vendorBatches.filter(b => b.isActive && b.stock > 0)
                  const prices = activeBatches.map(b => b.sellingPrice)
                  const hasMultiplePrices = new Set(prices).size > 1

                  return (
                    <div key={p._id} className="bg-surface border border-border rounded-lg overflow-hidden">
                      {/* Part header */}
                      <div className="px-3 py-2 flex items-center justify-between bg-surface-2">
                        <div>
                          <span className="font-heading font-bold text-amber">{p.partNumber}</span>
                          <span className="text-xs text-gray-400 ml-1.5">{p.partName}</span>
                          {p.brand && <span className="text-xs text-gray-500 ml-2">{p.brand}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasMultiplePrices && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20">
                              {activeBatches.length} prices
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{p.totalStock} in stock</span>
                        </div>
                      </div>

                      {/* Price/vendor label — only shown when multiple prices exist */}
                      {hasMultiplePrices && (
                        <div className="px-3 py-1.5 bg-amber/5 border-b border-amber/10">
                          <span className="text-[10px] text-amber font-medium">
                            ⚠ Multiple prices available — select the correct vendor batch below
                          </span>
                        </div>
                      )}

                      {/* One row per vendor batch = one selectable price */}
                      {activeBatches.map((b, idx) => (
                        <div key={b._id}
                          className={`flex items-center gap-3 px-3 py-2.5 border-t border-border/40
                            ${hasMultiplePrices ? 'hover:bg-surface-2 transition-colors' : ''}`}>

                          {/* Vendor + price info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-100">{b.vendorName}</span>
                              {/* Price badge — highlighted when multiple prices to make selection obvious */}
                              <span className={`font-heading font-bold px-2 py-0.5 rounded-lg text-sm
                                ${hasMultiplePrices
                                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                  : 'text-green-400'
                                }`}>
                                ₹{b.sellingPrice.toLocaleString()}
                              </span>
                              {hasMultiplePrices && idx === 0 && (
                                <span className="text-[10px] text-gray-600 bg-surface-2 px-1.5 py-0.5 rounded">lowest</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {b.stock} units in stock
                              {b.purchasedAt && (
                                <span className="ml-2 opacity-60">
                                  · purchased {new Date(b.purchasedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Qty + Add */}
                          <input type="number" min="1" max={b.stock}
                            className="input w-14 text-xs py-1 text-center shrink-0"
                            value={spareQtys[b._id] ?? '1'}
                            onChange={e => setSpareQtys(q => ({ ...q, [b._id]: e.target.value }))} />
                          <button
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors
                              ${hasMultiplePrices
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                : 'btn-primary'
                              }`}
                            onClick={() => addSpare(p, b)}>
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <FormActions>
        <button className="btn-outline" onClick={() => { setForm({ ...emptyForm, ...initialData }); setSpares([]) }}>Clear</button>
        <button className="btn-primary" onClick={submit} disabled={submitting}>
          {submitting ? <Spinner size="sm" /> : '💾 Create Job Card'}
        </button>
      </FormActions>
    </div>
  )
}