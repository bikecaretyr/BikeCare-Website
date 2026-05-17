import { useEffect, useState, useCallback } from 'react'
import { branches as branchesApi } from '../../api/client'
import { Spinner, StatusBadge, Modal, FormGrid, Field, FormActions, toast, Confirm } from '../../components/ui'
import type { Branch } from '../../types'

interface ConfirmState { title: string; message: string; onConfirm: () => Promise<void> }

export function AdminBranches() {
  const [list, setList] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Branch | 'new' | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = { name: '', code: '', street: '', city: 'Trichy', pincode: '', phone: '', phoneType: 'landline', whatsapp: '', open: '08:00', close: '20:00', mapsUrl: '' }
  const [form, setForm] = useState(emptyForm)
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const d = await branchesApi.list(); setList(d.branches) }
    catch { /**/ } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  function openEdit(b: Branch) {
    setForm({ name: b.name, code: b.code || '', street: b.address?.street || '', city: b.address?.city || 'Trichy', pincode: b.address?.pincode || '', phone: b.phone || '', phoneType: b.phoneType || 'landline', whatsapp: b.whatsapp || '', open: b.workingHours?.open || '08:00', close: b.workingHours?.close || '20:00', mapsUrl: b.googleMapsUrl || '' })
    setModal(b)
  }

  async function save() {
    if (!form.name) { toast('Branch name required', 'error'); return }
    setSaving(true)
    try {
      const body = { name: form.name, code: form.code.toUpperCase(), address: { street: form.street, city: form.city, pincode: form.pincode }, phone: form.phone, phoneType: form.phoneType, whatsapp: form.whatsapp, googleMapsUrl: form.mapsUrl, workingHours: { open: form.open, close: form.close } }
      if (modal && modal !== 'new') { await branchesApi.update((modal as Branch)._id, body); toast('Updated', 'success') }
      else { await branchesApi.create(body); toast('Branch created', 'success') }
      setModal(null); load()
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setSaving(false) }
  }

  function confirmDeactivate(b: Branch) {
    setConfirmState({
      title: 'Deactivate branch?',
      message: `Deactivate "${b.name}"? Staff will no longer be able to create jobs for this branch.`,
      onConfirm: async () => { await branchesApi.deactivate(b._id); toast('Branch deactivated', 'warn'); load() },
    })
  }

  function confirmDelete(b: Branch) {
    setConfirmState({
      title: 'Delete branch?',
      message: `Permanently delete "${b.name}"? This cannot be undone and will affect all associated records.`,
      onConfirm: async () => { await branchesApi.remove(b._id); toast('Branch deleted', 'success'); load() },
    })
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">🏪 Branches</h1>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setModal('new') }}>+ Add Branch</button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map(b => (
            <div key={b._id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-heading text-base font-semibold">{b.name}</div>
                  <div className="text-xs text-gray-500">{b.code}</div>
                </div>
                <StatusBadge status={b.isActive ? 'Active' : 'Inactive'} />
              </div>
              <div className="text-xs text-gray-400 space-y-0.5 mb-3">
                {b.address?.street && <div>📍 {b.address.street}, {b.address.city}</div>}
                {b.phone && <div>📞 {b.phone}</div>}
                <div>🕐 {b.workingHours?.open} – {b.workingHours?.close}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-outline text-xs px-3 py-1.5" onClick={() => openEdit(b)}>Edit</button>
                {b.isActive
                  ? <button className="btn-danger text-xs px-3 py-1.5" onClick={() => confirmDeactivate(b)}>Deactivate</button>
                  : <>
                    <button className="btn-success text-xs px-3 py-1.5" onClick={async () => { await branchesApi.activate(b._id); toast('Branch activated', 'success'); load() }}>Activate</button>
                    <button className="btn-danger text-xs px-3 py-1.5" onClick={() => confirmDelete(b)}>Delete</button>
                  </>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Add Branch' : 'Edit Branch'}>
        <FormGrid>
          <Field label="Branch Name" required><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Code"><input className="input" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} /></Field>
          <Field label="Street" span><input className="input" value={form.street} onChange={e => set('street', e.target.value)} /></Field>
          <Field label="City"><input className="input" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
          <Field label="Pincode"><input className="input" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value)} /></Field>
          <Field label="Phone Type">
            <select
              className="input"
              value={form.phoneType}
              onChange={e => set('phoneType', e.target.value)}
            >
              <option value="mobile">Mobile</option>
              <option value="landline">Landline</option>
            </select>
          </Field>

          <Field label="Phone">
            <input
              className="input"
              type="tel"
              placeholder={
                form.phoneType === 'landline'
                  ? '0431-2456789'
                  : '9876543210'
              }
              maxLength={15}
              value={form.phone}
              onChange={e => {
                const value = e.target.value.replace(/[^\d+\-\s]/g, '')
                set('phone', value)
              }}
            />
          </Field>
          <Field label="WhatsApp"><input className="input" maxLength={10} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Field>
          <Field label="Opens">
            <div className="relative">
              <input
                id="openTime"
                className="input pr-10"
                type="time"
                value={form.open}
                onChange={e => set('open', e.target.value)}
              />

              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                onClick={() => {
                  const el = document.getElementById('openTime') as HTMLInputElement

                  if (el?.showPicker) {
                    el.showPicker()
                  } else {
                    el.focus()
                  }
                }}
              >
                🕒
              </button>
            </div>
          </Field>

          <Field label="Closes">
            <div className="relative">
              <input
                id="closeTime"
                className="input pr-10"
                type="time"
                value={form.close}
                onChange={e => set('close', e.target.value)}
              />

              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                onClick={() => {
                  const el = document.getElementById('closeTime') as HTMLInputElement

                  if (el?.showPicker) {
                    el.showPicker()
                  } else {
                    el.focus()
                  }
                }}
              >
                🕒
              </button>
            </div>
          </Field>
          <Field label="Google Maps URL" span><input className="input" type="url" value={form.mapsUrl} onChange={e => set('mapsUrl', e.target.value)} /></Field>
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
