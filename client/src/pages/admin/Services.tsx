import { useEffect, useState, useCallback } from 'react'
import { services as servicesApi } from '../../api/client'
import { Spinner, Table, Tr, Td, Modal, FormGrid, Field, FormActions, toast, Confirm } from '../../components/ui'
import type { Service } from '../../types'

interface ConfirmState { title: string; message: string; onConfirm: () => Promise<void> }

export function AdminServices() {
  const [list, setList]       = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState<Service | 'new' | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [saving, setSaving]   = useState(false)

  const CATS = ['General','Repair','Electrical','Body','Tyres','Full Service','Other']
  const emptyForm = { name:'', description:'', price:'', priceType:'fixed', category:'General', durationMinutes:'60' }
  const [form, setForm] = useState(emptyForm)
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const d = await servicesApi.list(false); setList(d.services) }
    catch { /**/ } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  function openEdit(s: Service) {
    setForm({ name: s.name, description: s.description || '', price: String(s.price), priceType: s.priceType || 'fixed', category: s.category || 'General', durationMinutes: String(s.durationMinutes || 60) })
    setModal(s)
  }

  async function save() {
    if (!form.name) { toast('Name is required', 'error'); return }
    setSaving(true)
    try {
      const body = { name: form.name, description: form.description, price: +form.price, priceType: form.priceType, category: form.category, durationMinutes: +form.durationMinutes || 60 }
      if (modal && modal !== 'new') { await servicesApi.update((modal as Service)._id, body); toast('Updated', 'success') }
      else { await servicesApi.create(body); toast('Added', 'success') }
      setModal(null); load()
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setSaving(false) }
  }

  function confirmDelete(s: Service) {
    setConfirmState({
      title: 'Delete service?',
      message: `Permanently delete "${s.name}"? This cannot be undone.`,
      onConfirm: async () => { await servicesApi.remove(s._id); toast('Service deleted', 'success'); load() },
    })
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">⚙️ Service Catalog</h1>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setModal('new') }}>+ Add Service</button>
      </div>
      <div className="card">
        {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
          <Table headers={['Name','Category','Price','Duration','Status','Actions']} empty={list.length === 0}>
            {list.map(s => (
              <Tr key={s._id}>
                <Td>
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.description?.slice(0, 50)}{(s.description?.length || 0) > 50 ? '...' : ''}</div>
                </Td>
                <Td><span className="badge bg-blue-500/10 text-blue-400">{s.category}</span></Td>
                <Td><span className="font-heading font-bold text-amber">₹{s.price?.toLocaleString()}</span></Td>
                <Td className="text-sm text-gray-400">{s.durationMinutes} min</Td>
                <Td><span className="badge bg-green-500/10 text-green-400">{s.isActive ? 'Active' : 'Inactive'}</span></Td>
                <Td>
                  <div className="flex gap-1.5">
                    <button className="btn-outline px-2 py-1 text-xs" onClick={() => openEdit(s)}>Edit</button>
                    {s.isActive
                      ? <button className="btn-danger px-2 py-1 text-xs" onClick={async () => { await servicesApi.deactivate(s._id).catch(() => {}); toast('Service deactivated', 'warn'); load() }}>Deactivate</button>
                      : <>
                          <button className="btn-success px-2 py-1 text-xs" onClick={async () => { await servicesApi.activate(s._id).catch(() => {}); toast('Service activated', 'success'); load() }}>Activate</button>
                          <button className="btn-danger px-2 py-1 text-xs" onClick={() => confirmDelete(s)}>Delete</button>
                        </>
                    }
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Add Service' : 'Edit Service'}>
        <FormGrid>
          <Field label="Service Name" required><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Category"><select className="input" value={form.category} onChange={e => set('category', e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Description" span><textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></Field>
          <Field label="Price (₹)"><input className="input" type="number" value={form.price} onChange={e => set('price', e.target.value)} /></Field>
          <Field label="Price Type"><select className="input" value={form.priceType} onChange={e => set('priceType', e.target.value)}><option value="fixed">Fixed</option><option value="starting_from">Starting From</option><option value="on_request">On Request</option></select></Field>
          <Field label="Duration (mins)"><input className="input" type="number" value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)} /></Field>
        </FormGrid>
        <FormActions>
          <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size="sm" /> : '💾 Save'}</button>
        </FormActions>
      </Modal>

      <Confirm
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => { await confirmState?.onConfirm(); setConfirmState(null) }}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        danger
      />
    </div>
  )
}
