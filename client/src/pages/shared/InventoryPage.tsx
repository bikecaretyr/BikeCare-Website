import { useEffect, useState } from 'react'
import { parts as partsApi, vendors as vendorsApi, purchases as purchasesApi, branches as branchesApi } from '../../api/client'
import { Spinner, Table, Tr, Td, Modal, FormGrid, Field, FormActions, toast, StatusBadge, fmtDate } from '../../components/ui'
import { useConfirm } from '../../hooks/useConfirm'
import { useData } from '../../hooks/useData'
import { useForm } from '../../hooks/useForm'
import type { Branch, Part, PurchaseEntry, Purchase, Vendor, VendorBatch } from '../../types'

type Tab = 'parts' | 'vendors' | 'purchases'

type PartForm = { partNumber: string; partName: string; brand: string; branch?: string; minStock: string }
type VendorForm = { name: string; phone: string; paymentDueDays: string; vehicleModels: string; branches: string[] }
type PurchaseForm = { vendorId: string; qty: string; purchasePrice: string; sellingPrice: string; notes: string }

interface InventoryPageProps {
  title: string
  showVendorTab: boolean
  showBranch: boolean
}

export function InventoryPage({ title, showVendorTab, showBranch }: InventoryPageProps) {
  const [tab, setTab] = useState<Tab>('parts')
  const [search, setSearch] = useState('')
  const [lowFilter, setLowFilter] = useState('')
  const [partModal, setPartModal] = useState<Part | 'new' | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<Part | null>(null)
  const [vendorModal, setVendorModal] = useState<Vendor | 'new' | null>(null)
  const [batchDetail, setBatchDetail] = useState<Part | null>(null)
  const [saving, setSaving] = useState(false)

  const { confirm, ConfirmDialog } = useConfirm()

  const { data: branchList } = useData(async () => {
    if (!showBranch) return [] as Branch[]
    const d = await branchesApi.list()
    return d.branches
  }, [showBranch])

  const { data: parts, loading: partsLoading, reload: reloadParts } = useData(async () => {
    const params: Record<string, string> = {}
    if (lowFilter) params.lowStock = lowFilter
    const d = await partsApi.list(params)
    return d.parts
  }, [lowFilter])

  const { data: vendors, loading: vendorsLoading, reload: reloadVendors } = useData(async () => {
    const d = await vendorsApi.list()
    return d.vendors
  }, [])

  const { data: purchaseData, loading: purchasesLoading, reload: reloadPurchases } = useData(async () => {
    const d = await purchasesApi.list()
    return { entries: d.entries, purchases: d.purchases }
  }, [])

  useEffect(() => {
    if (tab === 'purchases') {
      reloadPurchases().catch(() => {})
    }
  }, [tab, reloadPurchases])

  const { form: partForm, setForm: setPartForm, set: setPartField, reset: resetPartForm } = useForm<PartForm>({ partNumber: '', partName: '', brand: '', branch: '', minStock: '5' })
  const { form: vendorForm, setForm: setVendorForm, set: setVendorField, reset: resetVendorForm } = useForm<VendorForm>({ name: '', phone: '', paymentDueDays: '30', vehicleModels: '', branches: [] })
  const { form: purchaseForm, setForm: setPurchaseForm, set: setPurchaseField, reset: resetPurchaseForm } = useForm<PurchaseForm>({ vendorId: '', qty: '1', purchasePrice: '', sellingPrice: '', notes: '' })

  const partList = parts ?? []
  const vendorList = vendors ?? []
  const purchaseList = [...(purchaseData?.entries ?? []), ...(purchaseData?.purchases ?? [])]
  const branches = branchList ?? []

  const loadParts = async () => reloadParts().catch(() => {})
  const loadVendors = async () => reloadVendors().catch(() => {})
  const loadPurchases = async () => reloadPurchases().catch(() => {})

  const savePart = async () => {
    if (!partForm.partNumber || !partForm.partName || (showBranch && !partForm.branch)) {
      toast('Part number, name and branch are required', 'error')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        partNumber: partForm.partNumber.toUpperCase().trim(),
        partName: partForm.partName,
        brand: partForm.brand,
        minStock: +partForm.minStock || 5,
      }
      if (showBranch) body.branch = partForm.branch
      if (partModal && partModal !== 'new') {
        await partsApi.update(partModal._id, body)
        toast('Part updated', 'success')
      } else {
        await partsApi.create(body)
        toast('Part created — now add stock via Record Purchase', 'success')
      }
      setPartModal(null)
      resetPartForm()
      await loadParts()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveVendor = async () => {
    if (!vendorForm.name) {
      toast('Vendor name required', 'error')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: vendorForm.name,
        phone: vendorForm.phone,
        paymentDueDays: +vendorForm.paymentDueDays || 30,
        vehicleModels: vendorForm.vehicleModels
          .split(',')
          .map(v => v.trim())
          .filter(Boolean),
        branches: vendorForm.branches,
      }
      if (vendorModal && vendorModal !== 'new') {
        await vendorsApi.update(vendorModal._id, body)
        toast('Vendor updated', 'success')
      } else {
        await vendorsApi.create(body)
        toast('Vendor created', 'success')
      }
      setVendorModal(null)
      resetVendorForm()
      await loadVendors()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const savePurchase = async () => {
    if (!purchaseForm.vendorId || !purchaseForm.qty || !purchaseForm.sellingPrice || !purchaseModal) {
      toast('Vendor, quantity and selling price required', 'error')
      return
    }
    setSaving(true)
    try {
      await purchasesApi.recordStock(purchaseModal._id, {
        vendorId: purchaseForm.vendorId,
        qty: +purchaseForm.qty,
        purchasePrice: +purchaseForm.purchasePrice || 0,
        sellingPrice: +purchaseForm.sellingPrice,
        notes: purchaseForm.notes,
      })
      toast(`Stock added to ${purchaseModal.partNumber} — ${purchaseModal.partName}`, 'success')
      setPurchaseModal(null)
      resetPurchaseForm()
      await loadParts()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeletePart = async (part: Part) => {
    const confirmed = await confirm({
      title: 'Remove part?',
      message: `Remove "${part.partName}" from inventory? This will soft-delete it and it won't appear in the spares picker.`,
      danger: true,
    })
    if (!confirmed) return
    setSaving(true)
    try {
      await partsApi.remove(part._id)
      toast('Part removed', 'success')
      await loadParts()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeactivateBatch = async (part: Part, batch: VendorBatch) => {
    const confirmed = await confirm({
      title: 'Deactivate batch?',
      message: `Deactivate the batch from "${batch.vendorName}"? The remaining stock of ${batch.stock} will no longer count toward total stock.`,
      danger: true,
    })
    if (!confirmed) return
    setSaving(true)
    try {
      await purchasesApi.deactivateBatch(part._id, batch._id)
      toast('Batch deactivated', 'success')
      await loadParts()
      const updated = await partsApi.list({})
      const fresh = updated.parts.find(item => item._id === part._id)
      if (fresh) setBatchDetail(fresh)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filteredParts = partList.filter(part =>
    `${part.partNumber} ${part.partName} ${part.brand || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const overduePurchases = purchaseList.filter(e => !e.paymentPaid && e.paymentDueDate && new Date(e.paymentDueDate) < new Date())
  const dueSoonPurchases = purchaseList.filter(e => {
    if (e.paymentPaid || !e.paymentDueDate) return false
    const days = (new Date(e.paymentDueDate).getTime() - Date.now()) / 86400000
    return days >= 0 && days <= 3
  })

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'parts', label: '📦 Parts', count: partList.length },
    ...(showVendorTab ? [{ key: 'vendors' as Tab, label: '🏭 Vendors', count: vendorList.length }] : []),
    { key: 'purchases' as Tab, label: '📥 Purchases', count: purchaseList.length || undefined },
  ]

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">{title}</h1>
        <div className="flex gap-2">
          {tab === 'parts' && <button className="btn-primary text-xs" onClick={() => { setPartForm({ partNumber: '', partName: '', brand: '', branch: branches[0]?._id || '', minStock: '5' }); setPartModal('new') }}>+ New Part</button>}
          {showVendorTab && tab === 'vendors' && <button className="btn-primary text-xs" onClick={() => { setVendorForm({ name: '', phone: '', paymentDueDays: '30', vehicleModels: '', branches: [] }); setVendorModal('new') }}>+ New Vendor</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(tabItem => (
          <button key={tabItem.key} onClick={() => setTab(tabItem.key)} className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${tab === tabItem.key ? 'border-amber text-amber' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {tabItem.label}
            {tabItem.count !== undefined && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2">{tabItem.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'parts' && (
        <>
          <div className="flex flex-wrap gap-2">
            <input className="input flex-1 min-w-40 text-xs" placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input w-auto text-xs" value={lowFilter} onChange={e => setLowFilter(e.target.value)}>
              <option value="">All stock</option>
              <option value="true">Low stock only</option>
            </select>
          </div>
          <div className="card">
            {partsLoading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (
              <Table headers={[
                'Part No / Name', 'Brand', ...(showBranch ? ['Branch'] : []), 'Total Stock', 'Vendors', 'Min', 'Actions'
              ]} empty={filteredParts.length === 0}>
                {filteredParts.map(part => (
                  <Tr key={part._id}>
                    <Td>
                      <div className="font-heading font-bold text-amber text-sm">{part.partNumber}</div>
                      <div className="text-xs text-gray-300">{part.partName}</div>
                    </Td>
                    <Td className="text-gray-400 text-xs">{part.brand || '—'}</Td>
                    {showBranch && <Td className="text-xs text-gray-400">{(part.branch as Branch)?.name || '—'}</Td>}
                    <Td>
                      <span className={part.totalStock <= part.minStock ? 'text-red-400 font-bold' : 'text-gray-100'}>
                        {part.totalStock}
                        {part.totalStock <= part.minStock && <span className="ml-1 badge bg-red-500/10 text-red-400 text-[10px]">LOW</span>}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {part.vendorBatches.filter(batch => batch.isActive && batch.stock > 0).map(batch => (
                          <span key={batch._id} className="badge bg-blue-500/10 text-blue-300 text-[10px]">
                            {batch.vendorName} · {batch.stock} · ₹{batch.sellingPrice}
                          </span>
                        ))}
                        {part.vendorBatches.filter(batch => batch.isActive && batch.stock > 0).length === 0 && (
                          <span className="text-xs text-gray-600">No active stock</span>
                        )}
                      </div>
                    </Td>
                    <Td className="text-gray-400">{part.minStock}</Td>
                    <Td>
                      <div className="flex gap-1.5 flex-wrap">
                        <button className="btn-primary px-2 py-1 text-[10px]" onClick={() => { resetPurchaseForm(); setPurchaseModal(part) }}>+ Stock</button>
                        <button className="btn-outline px-2 py-1 text-[10px]" onClick={() => setBatchDetail(part)}>Batches</button>
                        <button className="btn-outline px-2 py-1 text-[10px]" onClick={() => { setPartForm({ partNumber: part.partNumber, partName: part.partName, brand: part.brand || '', branch: typeof part.branch === 'object' ? (part.branch as Branch)._id : '', minStock: String(part.minStock) }); setPartModal(part) }}>Edit</button>
                        <button className="btn-danger px-2 py-1 text-[10px]" onClick={() => confirmDeletePart(part)}>Del</button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </div>
        </>
      )}

      {tab === 'vendors' && showVendorTab && (
        <div className="card">
          {vendorsLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <Table headers={['Vendor', 'Phone', 'Due Days', 'Models', 'Branches', 'Actions']} empty={vendorList.length === 0}>
              {vendorList.map(vendor => (
                <Tr key={vendor._id}>
                  <Td className="font-semibold text-sm">{vendor.name}</Td>
                  <Td className="text-sm text-gray-400">{vendor.phone || '—'}</Td>
                  <Td className="text-xs text-gray-400">{vendor.paymentDueDays}</Td>
                  <Td className="text-xs text-gray-400">{vendor.vehicleModels.join(', ') || '—'}</Td>
                  <Td className="text-xs text-gray-400">{vendor.branches.map(branch => typeof branch === 'object' ? branch.name : branch).join(', ') || 'All'}</Td>
                  <Td>
                    <button className="btn-outline px-2 py-1 text-[10px]" onClick={() => { setVendorForm({ name: vendor.name, phone: vendor.phone || '', paymentDueDays: String(vendor.paymentDueDays), vehicleModels: vendor.vehicleModels.join(', '), branches: vendor.branches.map(branch => typeof branch === 'object' ? branch._id : branch) }); setVendorModal(vendor) }}>Edit</button>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {tab === 'purchases' && (
        <div className="card">
          {purchasesLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <Table headers={['Type', 'Details', 'Vendor', 'Qty', 'Total Cost', 'Due Date', 'Paid', 'Actions']} empty={purchaseList.length === 0}>
              {purchaseList.map(entry => {
                const isBulk = 'items' in entry
                const totalQty = isBulk ? entry.items.reduce((sum, item) => sum + item.qty, 0) : entry.qty
                const totalCost = isBulk ? entry.totalCost : entry.purchasePrice * entry.qty
                return (
                  <Tr key={entry._id}>
                    <Td>{isBulk ? 'Bulk Purchase' : 'Single Purchase'}</Td>
                    <Td>
                      {isBulk
                        ? `${entry.items.length} item${entry.items.length > 1 ? 's' : ''}`
                        : typeof entry.part === 'object'
                          ? entry.part.partName
                          : entry.part}
                    </Td>
                    <Td>{typeof entry.vendor === 'object' ? entry.vendor.name : entry.vendor}</Td>
                    <Td>{totalQty}</Td>
                    <Td>₹{totalCost}</Td>
                    <Td>{entry.paymentDueDate ? fmtDate(entry.paymentDueDate) : '—'}</Td>
                    <Td>{entry.paymentPaid ? 'Yes' : 'No'}</Td>
                    <Td>
                      <button className="btn-outline px-2 py-1 text-[10px]" onClick={() => {}}>View</button>
                    </Td>
                  </Tr>
                )
              })}
            </Table>
          )}
        </div>
      )}

      <Modal open={!!partModal} onClose={() => setPartModal(null)} title={partModal === 'new' ? 'Add Part' : 'Edit Part'}>
        <FormGrid>
          <Field label="Part Number" required>
            <input className="input uppercase" value={partForm.partNumber} onChange={e => setPartField('partNumber', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Part Name" required>
            <input className="input" value={partForm.partName} onChange={e => setPartField('partName', e.target.value)} />
          </Field>
          <Field label="Brand">
            <input className="input" value={partForm.brand} onChange={e => setPartField('brand', e.target.value)} />
          </Field>
          {showBranch && (
            <Field label="Branch">
              <select className="input" value={partForm.branch ?? ''} onChange={e => setPartField('branch', e.target.value)}>
                <option value="">Select branch</option>
                {branches.map(branch => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Min Stock">
            <input className="input" type="number" value={partForm.minStock} onChange={e => setPartField('minStock', e.target.value)} />
          </Field>
        </FormGrid>
        <FormActions>
          <button className="btn-outline" onClick={() => setPartModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={savePart} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save'}</button>
        </FormActions>
      </Modal>

      <Modal open={!!purchaseModal} onClose={() => setPurchaseModal(null)} title={`Record Purchase — ${purchaseModal?.partNumber} ${purchaseModal?.partName}`}>
        <FormGrid>
          <Field label="Vendor" required>
            <select className="input" value={purchaseForm.vendorId} onChange={e => setPurchaseField('vendorId', e.target.value)}>
              <option value="">Select vendor</option>
              {vendorList.map(vendor => <option key={vendor._id} value={vendor._id}>{vendor.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity" required>
            <input className="input" type="number" min="1" value={purchaseForm.qty} onChange={e => setPurchaseField('qty', e.target.value)} />
          </Field>
          <Field label="Purchase Price">
            <input className="input" type="number" min="0" value={purchaseForm.purchasePrice} onChange={e => setPurchaseField('purchasePrice', e.target.value)} />
          </Field>
          <Field label="Selling Price" required>
            <input className="input" type="number" min="0" value={purchaseForm.sellingPrice} onChange={e => setPurchaseField('sellingPrice', e.target.value)} />
          </Field>
          <Field label="Notes" span>
            <input className="input" value={purchaseForm.notes} onChange={e => setPurchaseField('notes', e.target.value)} />
          </Field>
        </FormGrid>
        <FormActions>
          <button className="btn-outline" onClick={() => setPurchaseModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={savePurchase} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save'}</button>
        </FormActions>
      </Modal>

      {batchDetail && (
        <Modal open={!!batchDetail} onClose={() => setBatchDetail(null)} title={`Batches — ${batchDetail.partNumber}`} wide>
          <div className="space-y-3">
            {batchDetail.vendorBatches.map(batch => (
              <div key={batch._id} className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-amber">{batch.vendorName}</div>
                    <div className="text-xs text-gray-400">Stock: {batch.stock} · ₹{batch.sellingPrice}</div>
                  </div>
                  <button className="btn-danger px-2 py-1 text-[10px]" onClick={() => confirmDeactivateBatch(batchDetail, batch)}>Deactivate</button>
                </div>
                <div className="text-xs text-gray-500 mt-2">Purchased at {fmtDate(batch.purchasedAt)}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showVendorTab && vendorModal && (
        <Modal open={!!vendorModal} onClose={() => setVendorModal(null)} title={vendorModal === 'new' ? 'New Vendor' : 'Edit Vendor'}>
          <FormGrid>
            <Field label="Vendor Name" required>
              <input className="input" value={vendorForm.name} onChange={e => setVendorField('name', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="input" value={vendorForm.phone} onChange={e => setVendorField('phone', e.target.value)} />
            </Field>
            <Field label="Payment Due Days">
              <input className="input" type="number" value={vendorForm.paymentDueDays} onChange={e => setVendorField('paymentDueDays', e.target.value)} />
            </Field>
            <Field label="Vehicle Models">
              <input className="input" value={vendorForm.vehicleModels} onChange={e => setVendorField('vehicleModels', e.target.value)} placeholder="Comma separated" />
            </Field>
            {showBranch && (
              <Field label="Branches" span>
                <select multiple className="input h-28" value={vendorForm.branches} onChange={e => setVendorField('branches', Array.from(e.target.selectedOptions, option => option.value))}>
                  {branches.map(branch => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                </select>
              </Field>
            )}
          </FormGrid>
          <FormActions>
            <button className="btn-outline" onClick={() => setVendorModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveVendor} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save'}</button>
          </FormActions>
        </Modal>
      )}

      {ConfirmDialog}
    </div>
  )
}
