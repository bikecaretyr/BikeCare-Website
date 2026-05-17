import { useEffect, useState, useCallback } from 'react'
import { parts as partsApi } from '../../api/client'
import { Spinner, Empty, Modal, Field, FormActions, toast } from '../../components/ui'
import type { Part, Branch } from '../../types'

export function PortalParts() {
  const [allParts, setAllParts] = useState<Part[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [addOpen, setAddOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)
  // fix: removed unitPrice and stock — employees now only request a part by name
  // pricing and stock is managed by admin/manager via vendor batches
  const [form, setForm] = useState({ partNumber: '', partName: '', brand: '', reason: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { const d = await partsApi.list(); setAllParts(d.parts) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = allParts.filter(p =>
    `${p.partNumber} ${p.partName} ${p.brand || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  async function submit() {
    if (!form.partNumber || !form.partName) { toast('Part number and name required', 'error'); return }
    setSaving(true)
    try {
      // fix: only send partName, brand, reason — no unitPrice or stock
      const d = await partsApi.create({ partNumber: form.partNumber.toUpperCase().trim(), partName: form.partName, brand: form.brand, reason: form.reason })
      toast(d.message || 'Request submitted', 'success')
      setAddOpen(false)
      setForm({ partNumber: '', partName: '', brand: '', reason: '' })
      load()
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="page-title mb-0">📦 Inventory</div>
        <button className="btn-primary px-3 py-2 text-xs" onClick={() => setAddOpen(true)}>+ Request Part</button>
      </div>
      <div className="card p-3">
        <input className="input" placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : filtered.length === 0 ? <Empty icon="📦" text="No parts yet" />
        : <div className="space-y-2">
            {filtered.map(p => (
              <div key={p._id} className={`card p-3 sm:p-4 ${p.totalStock <= p.minStock ? 'border-red-500/25' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-heading font-bold text-amber">{p.partNumber}</div><div className="text-xs text-gray-300">{p.partName}</div>
                    {p.brand && <div className="text-xs text-gray-500 mt-0.5">{p.brand}</div>}
                  </div>
                  {/* fix: show vendor batch pricing instead of unitPrice */}
                  <div className="text-right">
                    {p.vendorBatches.filter(b => b.isActive && b.stock > 0).length > 0 ? (
                      <div className="font-heading text-base font-bold text-amber">
                        ₹{Math.min(...p.vendorBatches.filter(b => b.isActive && b.stock > 0).map(b => b.sellingPrice)).toLocaleString()}
                        {p.vendorBatches.filter(b => b.isActive && b.stock > 0).length > 1 && (
                          <span className="text-xs text-gray-500 font-normal ml-1">+</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">No stock</div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                  {/* fix: use totalStock instead of p.stock */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs sm:text-sm font-bold ${p.totalStock <= p.minStock ? 'text-red-400' : 'text-gray-300'}`}>
                      Stock: {p.totalStock}
                    </span>
                    {p.totalStock <= p.minStock && <span className="badge bg-red-500/10 text-red-400">LOW</span>}
                  </div>
                  <span className="text-xs text-gray-500">Min: {p.minStock}</span>
                </div>

                {/* Show vendor breakdown so mechanic knows which vendor has stock */}
                {p.vendorBatches.filter(b => b.isActive && b.stock > 0).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.vendorBatches.filter(b => b.isActive && b.stock > 0).map(b => (
                      <span key={b._id} className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full">
                        {b.vendorName} · {b.stock} · ₹{b.sellingPrice}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
      }

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Request New Part">
        <div className="space-y-3">
          <div className="bg-amber/5 border border-amber/20 rounded-lg px-3 py-2 text-xs text-amber">
            ⚠ New parts require admin approval. Pricing is set by admin when stock is purchased from a vendor.
          </div>
          <Field label="Part Number" required>
            <input className="input uppercase" value={form.partNumber} onChange={e => setForm(f => ({ ...f, partNumber: e.target.value.toUpperCase() }))} placeholder="e.g. 06435-KWN-900" />
          </Field>
          <Field label="Part Name" required>
            <input className="input" value={form.partName} onChange={e => setForm(f => ({ ...f, partName: e.target.value }))} />
          </Field>
          <Field label="Brand">
            <input className="input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
          </Field>
          <Field label="Reason">
            <textarea className="input resize-none" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </Field>
          <FormActions>
            <button className="btn-outline" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Submit Request'}</button>
          </FormActions>
        </div>
      </Modal>
    </div>
  )
}