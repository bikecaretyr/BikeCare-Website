import { useEffect, useState, useCallback } from 'react'
import { bookings as bookingsApi, jobs as jobsApi } from '../../api/client'
import { Spinner, StatusBadge, Table, Tr, Td, Modal, FormGrid, Field, FormActions, toast, fmtDate } from '../../components/ui'
import type { Booking } from '../../types'

const BRANDS = ['Hero','Honda','Bajaj','TVS','Yamaha','Suzuki','Royal Enfield','KTM','Ather','Other']
const MODES  = ['General Service','Engine Repair','Tyre Change','Electrical Work','Body Work','Full Service','Other']

export function ManagerBookings() {
  const [list, setList]       = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusF, setStatusF] = useState('Pending')
  const [selected, setSel]    = useState<Booking | null>(null)
  const [rejectModal, setRejectModal] = useState<string | null>(null)  // fix: replace window.prompt with modal
  const [rejectNote, setRejectNote]   = useState('')
  const [sub, setSub]         = useState(false)

  const [form, setForm] = useState({
    vehicleNumber: '', brand: '', model: '', customerName: '', customerPhone: '',
    kmReading: '', serviceInDate: '', expectedDelivery: '',
    serviceMode: 'General Service', mechanic: '', complaint: '', status: 'Received',
  })
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const d = await bookingsApi.list({ status: statusF }); setList(d.bookings) }
    catch { /**/ } finally { setLoading(false) }
  }, [statusF])
  useEffect(() => { load() }, [load])

  function startConvert(booking: Booking) {
    setSel(booking)
    setForm({
      vehicleNumber: booking.vehicleNumber || '',
      brand: booking.vehicleBrand || '',
      model: '',
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      kmReading: '',
      serviceInDate: new Date().toISOString().split('T')[0],
      expectedDelivery: '',
      serviceMode: 'General Service',
      mechanic: '',
      complaint: booking.serviceNote || '',
      status: 'Received',
    })
  }

  // fix: renamed from confirm() → confirmBooking() to avoid shadowing window.confirm
  async function confirmBooking(id: string) {
    try {
      await bookingsApi.update(id, { status: 'Confirmed' })
      toast('Booking confirmed', 'success')
      load()
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'error') }
  }

  // fix: replaced window.prompt with a proper modal
  async function rejectBooking() {
    if (!rejectModal) return
    try {
      await bookingsApi.update(rejectModal, { status: 'Rejected', adminNote: rejectNote })
      toast('Booking rejected', 'success')
      setRejectModal(null)
      setRejectNote('')
      load()
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'error') }
  }

  async function convert() {
    if (!selected) return
    if (!form.vehicleNumber) { toast('Vehicle number required', 'error'); return }
    if (!form.brand)         { toast('Brand required', 'error'); return }
    if (!form.mechanic)      { toast('Mechanic name required', 'error'); return }
    setSub(true)
    try {
      const convertResult = await bookingsApi.convert(selected._id, {
        mechanic: form.mechanic,
        serviceMode: form.serviceMode,
      })
      await jobsApi.update(convertResult.job._id, {
        vehicleNumber: form.vehicleNumber,
        brand: form.brand,
        model: form.model,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        kmReading: form.kmReading ? +form.kmReading : undefined,
        serviceInDate: form.serviceInDate,
        expectedDelivery: form.expectedDelivery || undefined,
        complaint: form.complaint,
        labourCharge: 0, waterWash: 0, sparesCost: 0, discount: 0, paymentMode: 'Cash',
      })
      toast(`Job ${convertResult.job.jobNo} created from booking!`, 'success')
      setSel(null); load()
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setSub(false) }
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <h1 className="page-title">📅 Service Bookings</h1>
      <div className="flex gap-2">
        <select className="input w-auto text-xs" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <button className="btn-outline px-3 text-xs" onClick={load}>↺</button>
      </div>

      <div className="card">
        {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
          <Table headers={['Ref','Customer','Phone','Vehicle','Date','Status','Actions']} empty={list.length === 0}>
            {list.map(b => (
              <Tr key={b._id} onClick={() => startConvert(b)}>
                <Td><span className="font-heading font-bold text-amber text-sm">{b.bookingRef}</span></Td>
                <Td className="font-semibold text-sm">{b.customerName}</Td>
                <Td className="text-sm">{b.customerPhone}</Td>
                <Td className="text-sm">{b.vehicleNumber || '—'}</Td>
                <Td className="text-xs">{fmtDate(b.preferredDate)}</Td>
                <Td><StatusBadge status={b.status} /></Td>
                <Td>
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    {b.status === 'Pending' && (
                      <>
                        {/* fix: was calling confirm() which shadowed window.confirm — now confirmBooking() */}
                        <button className="btn-success px-2 py-1 text-xs" onClick={() => confirmBooking(b._id)}>✓</button>
                        {/* fix: was window.prompt — now opens reject modal */}
                        <button className="btn-danger px-2 py-1 text-xs" onClick={() => { setRejectModal(b._id); setRejectNote('') }}>✕</button>
                      </>
                    )}
                    {b.status === 'Confirmed' && !b.convertedToJobCard && (
                      <button className="btn-primary px-2 py-1 text-xs" onClick={() => startConvert(b)}>→ Job</button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      {/* Reject modal — replaces window.prompt */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Booking">
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Optionally provide a reason — this will be visible in the booking record.</p>
          <Field label="Reason (optional)">
            <textarea className="input resize-none" rows={3}
              placeholder="e.g. Slot unavailable, customer did not respond..."
              value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
          </Field>
          <FormActions>
            <button className="btn-outline" onClick={() => setRejectModal(null)}>Cancel</button>
            <button className="btn-danger" onClick={rejectBooking}>Reject Booking</button>
          </FormActions>
        </div>
      </Modal>

      {/* Convert booking → job card modal */}
      <Modal open={!!selected && selected.status !== 'Pending'} onClose={() => setSel(null)}
        title={`Convert Booking: ${selected?.bookingRef}`} wide>
        {selected && (
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-lg p-3 text-sm space-y-1">
              <div><span className="text-gray-500">Customer: </span><span className="font-bold">{selected.customerName}</span></div>
              <div><span className="text-gray-500">Phone: </span>{selected.customerPhone}</div>
              <div><span className="text-gray-500">Preferred Date: </span>{fmtDate(selected.preferredDate)}</div>
              {selected.serviceNote && <div><span className="text-gray-500">Note: </span>{selected.serviceNote}</div>}
              {selected.vehicleNumber && <div><span className="text-gray-500">Vehicle: </span>{selected.vehicleNumber} {selected.vehicleBrand || ''}</div>}
            </div>
            <p className="text-xs text-amber bg-amber/5 border border-amber/15 rounded-lg px-3 py-2">
              Fill in the details below to create a job card from this booking.
            </p>
            <FormGrid>
              <Field label="Vehicle Number" required>
                <input className="input uppercase" value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Brand" required>
                <select className="input" value={form.brand} onChange={e => set('brand', e.target.value)}>
                  <option value="">Select</option>
                  {BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Model">
                <input className="input" value={form.model} onChange={e => set('model', e.target.value)} />
              </Field>
              <Field label="KM Reading">
                <input className="input" type="number" value={form.kmReading} onChange={e => set('kmReading', e.target.value)} />
              </Field>
              <Field label="Mechanic" required>
                <input className="input" value={form.mechanic} onChange={e => set('mechanic', e.target.value)} />
              </Field>
              <Field label="Service Date">
                <input className="input" type="date" value={form.serviceInDate} onChange={e => set('serviceInDate', e.target.value)} />
              </Field>
              <Field label="Expected Delivery">
                <input className="input" type="date" value={form.expectedDelivery} onChange={e => set('expectedDelivery', e.target.value)} />
              </Field>
              <Field label="Service Mode">
                <select className="input" value={form.serviceMode} onChange={e => set('serviceMode', e.target.value)}>
                  {MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Additional Notes" span>
                <textarea className="input resize-none" rows={2} value={form.complaint} onChange={e => set('complaint', e.target.value)} />
              </Field>
            </FormGrid>
            <FormActions>
              <button className="btn-outline" onClick={() => setSel(null)}>Cancel</button>
              <button className="btn-primary" onClick={convert} disabled={sub}>
                {sub ? <Spinner size="sm" /> : '→ Create Job Card'}
              </button>
            </FormActions>
          </div>
        )}
      </Modal>
    </div>
  )
}
