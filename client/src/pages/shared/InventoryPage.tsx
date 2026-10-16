import { useEffect, useState, useRef } from 'react'
import { parts as partsApi, vendors as vendorsApi, purchases as purchasesApi, branches as branchesApi } from '../../api/client'
import { Spinner, Table, Tr, Td, Modal, FormGrid, Field, FormActions, toast, StatusBadge, fmtDate } from '../../components/ui'
import { useConfirm } from '../../hooks/useConfirm'
import { useData } from '../../hooks/useData'
import { useForm } from '../../hooks/useForm'
import type { Branch, Part, PurchaseEntry, Purchase, Vendor, VendorBatch } from '../../types'

// ── SearchSelect Component (with proper UX) ────────────────
interface SearchSelectProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
}

function SearchSelect({ value, onChange, options, placeholder = 'Search...', className = '' }: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
  const selected = options.find(opt => opt.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        type="text"
        className={`input text-xs w-full pr-7 transition-all ${
          selected 
            ? 'bg-green-500/10 border-green-500/40 text-green-400 font-medium' 
            : 'bg-surface border-border text-gray-400'
        }`}
        placeholder={selected ? selected.label : placeholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs transition-colors ${
        selected ? 'text-green-400' : 'text-gray-500'
      }`}>▼</div>
      {open && (
        <div className="fixed z-[9999] bg-surface border border-border rounded-lg shadow-xl max-h-60 overflow-auto min-w-[200px]"
          style={{
            top: ref.current ? `${ref.current.getBoundingClientRect().bottom + 4}px` : 0,
            left: ref.current ? `${ref.current.getBoundingClientRect().left}px` : 0,
            width: ref.current ? `${ref.current.offsetWidth}px` : 'auto'
          }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
          ) : (
            filtered.map(opt => (
              <div
                key={opt.value}
                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                  opt.value === value 
                    ? 'bg-green-500/20 text-green-300 font-semibold' 
                    : 'text-gray-200 hover:bg-surface-2'
                }`}
                onClick={() => {
                  onChange(opt.value)
                  setSearch('')
                  setOpen(false)
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

type Tab = 'parts' | 'vendors' | 'purchases'

type PartForm = { partNumber: string; partName: string; brand: string; branch?: string; minStock: string }
type VendorForm = { name: string; phone: string; paymentDueDays: string; vehicleModels: string; branches: string[] }
type PurchaseForm = { vendorId: string; qty: string; purchasePrice: string; sellingPrice: string; notes: string }

type BulkItem = { partId: string; qty: string; purchaseCost: string; sellingPrice: string }
const emptyBulkItem = (): BulkItem => ({ partId: '', qty: '1', purchaseCost: '', sellingPrice: '' })
type BulkPurchaseForm = { vendorId: string; items: BulkItem[]; miscCost: string; notes: string; paymentDueDate: string }

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
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkForm, setBulkForm] = useState<BulkPurchaseForm>({ vendorId: '', items: [emptyBulkItem()], miscCost: '0', notes: '', paymentDueDate: '' })
  const [bulkNewPart, setBulkNewPart] = useState<{ idx: number } | null>(null)
  const [bulkNewPartForm, setBulkNewPartForm] = useState({ partNumber: '', partName: '', brand: '' })
  const [viewPurchase, setViewPurchase] = useState<PurchaseEntry | Purchase | null>(null)

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

  // ── Bulk Purchase ────────────────────────────────────────
  const openBulkModal = () => {
    setBulkForm({ vendorId: '', items: [emptyBulkItem()], miscCost: '0', notes: '', paymentDueDate: '' })
    setBulkModal(true)
  }

  const setBulkField = <K extends keyof BulkPurchaseForm>(key: K, value: BulkPurchaseForm[K]) =>
    setBulkForm(prev => ({ ...prev, [key]: value }))

  const setBulkItemField = (idx: number, key: keyof BulkItem, value: string) =>
    setBulkForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, [key]: value } : item)),
    }))

  const addBulkItem = () => setBulkForm(prev => ({ ...prev, items: [...prev.items, emptyBulkItem()] }))

  const removeBulkItem = (idx: number) =>
    setBulkForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))

  const bulkItemsCost = bulkForm.items.reduce((sum, item) => sum + (+item.purchaseCost || 0) * (+item.qty || 0), 0)
  const bulkTotalCost = bulkItemsCost + (+bulkForm.miscCost || 0)

  const saveBulkPurchase = async () => {
    if (!bulkForm.vendorId) { toast('Select a vendor', 'error'); return }
    const validItems = bulkForm.items.filter(i => i.partId && +i.qty >= 1 && +i.sellingPrice > 0)
    if (validItems.length === 0) { toast('Add at least one valid item with part, quantity and selling price', 'error'); return }

    setSaving(true)
    try {
      await purchasesApi.create({
        vendorId: bulkForm.vendorId,
        items: validItems.map(i => ({
          partId: i.partId,
          qty: +i.qty,
          purchaseCost: +i.purchaseCost || 0,
          sellingPrice: +i.sellingPrice,
        })),
        miscCost: +bulkForm.miscCost || 0,
        totalCost: bulkTotalCost,
        paymentDueDate: bulkForm.paymentDueDate || undefined,
        notes: bulkForm.notes || undefined,
      })
      toast(`Bulk purchase of ${validItems.length} item(s) saved — stock updated`, 'success')
      setBulkModal(false)
      await Promise.all([loadParts(), loadPurchases()])
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Bulk purchase failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Inline New Part (from Bulk Purchase) ─────────────────
  const openBulkNewPart = (idx: number) => {
    setBulkNewPartForm({ partNumber: '', partName: '', brand: '' })
    setBulkNewPart({ idx })
  }

  const saveBulkNewPart = async () => {
    if (!bulkNewPartForm.partNumber || !bulkNewPartForm.partName) {
      toast('Part number and name are required', 'error')
      return
    }
    setSaving(true)
    try {
      const created = await partsApi.create({
        partNumber: bulkNewPartForm.partNumber.toUpperCase().trim(),
        partName: bulkNewPartForm.partName,
        brand: bulkNewPartForm.brand,
        minStock: 5,
      })
      // Refresh parts list so the new part shows in dropdowns
      await loadParts()
      // Auto-select the new part in the row that triggered it
      if (bulkNewPart && created.part) {
        setBulkItemField(bulkNewPart.idx, 'partId', created.part._id)
        toast(`Part ${bulkNewPartForm.partNumber} created and selected`, 'success')
      } else {
        toast(created.message || 'Part request submitted for approval', 'warn')
      }
      setBulkNewPart(null)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to create part', 'error')
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
          {tab === 'purchases' && <button className="btn-primary text-xs" onClick={openBulkModal}>+ Bulk Purchase</button>}
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
                      <button className="btn-outline px-2 py-1 text-[10px]" onClick={() => setViewPurchase(entry)}>View</button>
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

      {/* ── Bulk Purchase Modal ───────────────────────────────── */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Purchase — Multiple Parts from One Vendor" wide>
        <div className="space-y-4">
          {/* Vendor & meta */}
          <FormGrid cols={3}>
            <Field label="Vendor" required>
              <select className="input" value={bulkForm.vendorId} onChange={e => setBulkField('vendorId', e.target.value)}>
                <option value="">Select vendor</option>
                {vendorList.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Payment Due Date">
              <input className="input" type="date" value={bulkForm.paymentDueDate} onChange={e => setBulkField('paymentDueDate', e.target.value)} />
            </Field>
            <Field label="Misc / Transport Cost">
              <input className="input" type="number" min="0" value={bulkForm.miscCost} onChange={e => setBulkField('miscCost', e.target.value)} />
            </Field>
          </FormGrid>

          {/* Items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-200">Purchase Items</h3>
              <button className="btn-outline text-xs px-2 py-1" onClick={addBulkItem}>+ Add Item</button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-2 text-gray-400 text-left">
                    <th className="px-3 py-2 w-[35%]">Part</th>
                    <th className="px-3 py-2 w-[15%]">Qty</th>
                    <th className="px-3 py-2 w-[18%]">Purchase ₹</th>
                    <th className="px-3 py-2 w-[18%]">Selling ₹</th>
                    <th className="px-3 py-2 w-[10%] text-right">Subtotal</th>
                    <th className="px-3 py-2 w-[4%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {bulkForm.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <SearchSelect
                            value={item.partId}
                            onChange={val => setBulkItemField(idx, 'partId', val)}
                            options={partList.map(p => ({ value: p._id, label: `${p.partNumber} — ${p.partName}` }))}
                            placeholder="Type to search parts..."
                            className="flex-1"
                          />
                          <button type="button" className="btn-outline px-1.5 py-0.5 text-[10px] whitespace-nowrap shrink-0" onClick={() => openBulkNewPart(idx)} title="Add new part">+ New</button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input className="input text-xs" type="number" min="1" value={item.qty} onChange={e => setBulkItemField(idx, 'qty', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="input text-xs" type="number" min="0" value={item.purchaseCost} onChange={e => setBulkItemField(idx, 'purchaseCost', e.target.value)} placeholder="0" />
                      </td>
                      <td className="px-3 py-2">
                        <input className="input text-xs" type="number" min="0" value={item.sellingPrice} onChange={e => setBulkItemField(idx, 'sellingPrice', e.target.value)} placeholder="0" />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300 font-mono">
                        ₹{((+item.purchaseCost || 0) * (+item.qty || 0)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {bulkForm.items.length > 1 && (
                          <button className="text-red-400 hover:text-red-300 text-base leading-none" onClick={() => removeBulkItem(idx)} title="Remove item">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes" span>
            <input className="input" value={bulkForm.notes} onChange={e => setBulkField('notes', e.target.value)} placeholder="Optional purchase notes" />
          </Field>

          {/* Totals summary */}
          <div className="bg-surface-2 rounded-xl p-3 flex flex-wrap gap-6 text-sm">
            <div><span className="text-gray-400">Items cost:</span> <span className="font-mono text-gray-100">₹{bulkItemsCost.toLocaleString()}</span></div>
            <div><span className="text-gray-400">Misc cost:</span> <span className="font-mono text-gray-100">₹{(+bulkForm.miscCost || 0).toLocaleString()}</span></div>
            <div className="font-bold"><span className="text-amber">Total:</span> <span className="font-mono text-amber">₹{bulkTotalCost.toLocaleString()}</span></div>
            <div><span className="text-gray-400">Items:</span> <span className="font-mono text-gray-100">{bulkForm.items.filter(i => i.partId).length}</span></div>
          </div>
        </div>
        <FormActions>
          <button className="btn-outline" onClick={() => setBulkModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveBulkPurchase} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save Bulk Purchase'}</button>
        </FormActions>
      </Modal>

      {/* ── Inline New Part Modal (from Bulk Purchase) ────────── */}
      <Modal open={!!bulkNewPart} onClose={() => setBulkNewPart(null)} title="Quick Add Part">
        <p className="text-xs text-gray-400 mb-3">Create a new part to add to this bulk purchase. It will be auto-selected in the item row.</p>
        <FormGrid>
          <Field label="Part Number" required>
            <input className="input uppercase" value={bulkNewPartForm.partNumber} onChange={e => setBulkNewPartForm(prev => ({ ...prev, partNumber: e.target.value.toUpperCase() }))} placeholder="e.g. BRK-PAD-001" />
          </Field>
          <Field label="Part Name" required>
            <input className="input" value={bulkNewPartForm.partName} onChange={e => setBulkNewPartForm(prev => ({ ...prev, partName: e.target.value }))} placeholder="e.g. Front Brake Pad" />
          </Field>
          <Field label="Brand" span>
            <input className="input" value={bulkNewPartForm.brand} onChange={e => setBulkNewPartForm(prev => ({ ...prev, brand: e.target.value }))} placeholder="Optional" />
          </Field>
        </FormGrid>
        <FormActions>
          <button className="btn-outline" onClick={() => setBulkNewPart(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveBulkNewPart} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Create & Select'}</button>
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

      {/* Purchase Detail Modal */}
      {viewPurchase && (() => {
        const isBulk = 'items' in viewPurchase
        const handleMarkPaid = async () => {
          try {
            await purchasesApi.markPaid(viewPurchase._id)
            toast('Marked as paid', 'success')
            setViewPurchase(null)
            reloadPurchases()
          } catch (err: any) {
            toast(err.message || 'Failed to mark as paid', 'error')
          }
        }

        return (
          <Modal open={true} onClose={() => setViewPurchase(null)} title="Purchase Details" wide>
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Type</div>
                  <div className="text-sm font-medium">{isBulk ? 'Bulk Purchase' : 'Single Purchase'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Vendor</div>
                  <div className="text-sm">{typeof viewPurchase.vendor === 'object' ? viewPurchase.vendor.name : viewPurchase.vendor}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Payment Due Date</div>
                  <div className="text-sm">{viewPurchase.paymentDueDate ? fmtDate(viewPurchase.paymentDueDate) : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Payment Status</div>
                  <StatusBadge status={viewPurchase.paymentPaid ? 'Active' : 'Inactive'} />
                </div>
              </div>

              {/* Items */}
              {isBulk ? (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2">Items ({viewPurchase.items.length})</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {viewPurchase.items.map((item, idx) => {
                      const pid = item.partId
                      const partObj = typeof pid === 'object' && pid !== null ? pid as unknown as Part : null
                      const partFromList = typeof pid === 'string' ? parts?.find(p => p._id === pid) : null
                      const partDisplay = partObj
                        ? `${partObj.partName} (${partObj.partNumber})`
                        : partFromList
                          ? `${partFromList.partName} (${partFromList.partNumber})`
                          : String(pid)
                      return (
                        <div key={idx} className="bg-surface/50 rounded-lg p-3 border border-border">
                          <div className="grid grid-cols-4 gap-3 text-xs">
                            <div>
                              <div className="text-gray-500 mb-1">Part</div>
                              <div className="font-medium">{partDisplay}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-1">Quantity</div>
                              <div>{item.qty}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-1">Purchase Cost</div>
                              <div>₹{item.purchaseCost}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-1">Selling Price</div>
                              <div>₹{item.sellingPrice}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Misc Cost</div>
                        <div className="font-medium">₹{viewPurchase.miscCost || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Total Items</div>
                        <div className="font-medium">{viewPurchase.items.reduce((sum, item) => sum + item.qty, 0)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Total Cost</div>
                        <div className="font-medium text-primary">₹{viewPurchase.totalCost}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2">Part Details</div>
                  <div className="bg-surface/50 rounded-lg p-4 border border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Part</div>
                        <div className="font-medium">
                          {typeof viewPurchase.part === 'object' 
                            ? `${viewPurchase.part.partName} (${viewPurchase.part.partNumber})`
                            : viewPurchase.part}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Quantity</div>
                        <div>{viewPurchase.qty}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Purchase Price (per unit)</div>
                        <div>₹{viewPurchase.purchasePrice}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Selling Price (per unit)</div>
                        <div>₹{viewPurchase.sellingPrice}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-500 text-xs mb-1">Total Cost</div>
                        <div className="font-medium text-primary">₹{viewPurchase.purchasePrice * viewPurchase.qty}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewPurchase.notes && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2">Notes</div>
                  <div className="bg-surface/50 rounded-lg p-3 border border-border text-sm text-gray-300">
                    {viewPurchase.notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button className="btn-outline" onClick={() => setViewPurchase(null)}>Close</button>
                {!viewPurchase.paymentPaid && (
                  <button className="btn-primary" onClick={handleMarkPaid}>Mark as Paid</button>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}

      {ConfirmDialog}
    </div>
  )
}
