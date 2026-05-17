import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { bookings as bookingsApi, jobs as jobsApi, branches as branchesApi } from '../../api/client'
import { Spinner, StatusBadge, Empty, Modal, toast, fmtDate } from '../../components/ui'
import { JobForm } from '../../components/JobForm'
import type { Booking, Branch } from '../../types'

export function PortalBookings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [branchList, setBranchList] = useState<Branch[]>([])
  const [initialData, setInitialData] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await bookingsApi.list({ status: 'Pending' })
      setBookings(d.bookings)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    branchesApi.list().then(d => {
      setBranchList(d.branches)
    }).catch(() => {})
  }, [])

  function acceptBooking(booking: Booking) {
    setSelected(booking)
    // Pre-fill form with booking data
    setInitialData({
      vehicleNumber: booking.vehicleNumber || '',
      brand: booking.vehicleBrand || '',
      model: booking.vehicleModel || '',
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      kmReading: '',
      serviceInDate: new Date().toISOString().split('T')[0],
      expectedDelivery: '',
      branch: booking.branch && typeof booking.branch !== 'string'
        ? (booking.branch as Branch)._id
        : (user?.branch && typeof user.branch === 'object' ? (user.branch as Branch)._id : branchList[0]?._id || ''),
      serviceMode: (booking.serviceRequested as any)?.[0]?.name || booking.serviceRequested?.[0] || 'General Service',
      mechanic: user?.name || '',
      complaint: booking.serviceNote || '',
      status: 'Received'
    })
  }

  async function createJob(formData: any) {
    if (!selected) return
    try {
      // First convert the booking to a job
      const convertResult = await bookingsApi.convert(selected._id, {
        mechanic: formData.mechanic,
        serviceMode: formData.serviceMode
      })

      // Then update the job with additional details
      await jobsApi.update(convertResult.job._id, {
        vehicleNumber: formData.vehicleNumber,
        brand: formData.brand,
        model: formData.model,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        kmReading: formData.kmReading,
        serviceInDate: formData.serviceInDate,
        expectedDelivery: formData.expectedDelivery,
        complaint: formData.complaint,
        serviceMode: formData.serviceMode,
        mechanic: formData.mechanic,
        labourCharge: 0,
        waterWash: 0,
        discount: 0,
        paymentMode: 'Cash'
      })

      toast(`Job ${convertResult.job.jobNo} created from booking!`, 'success')
      setSelected(null)
      load()
      navigate('/portal/jobs')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed to create job', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="page-title">📅 Service Bookings</div>
      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : bookings.length === 0 ? <Empty icon="📅" text="No pending bookings" />
        : <div className="space-y-3">{bookings.map(b => (
          <div key={b._id} className="card p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading font-bold text-amber text-sm">{b.bookingRef}</span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="text-sm font-medium">{b.customerName}</div>
                <div className="text-xs text-gray-500">{b.customerPhone}</div>
                <div className="text-xs text-gray-400 mt-1">
                  📍 {(b.branch as Branch)?.name || '—'} · {fmtDate(b.preferredDate)}
                </div>
                {b.serviceNote && <div className="text-xs text-gray-300 mt-1 italic">"{b.serviceNote}"</div>}
                {b.vehicleNumber && <div className="text-xs text-gray-400 mt-1">🚗 {b.vehicleNumber} {b.vehicleBrand || ''}</div>}
              </div>
              <button
                className="btn-primary shrink-0 text-xs px-3 py-1.5"
                onClick={() => acceptBooking(b)}
              >
                Accept →
              </button>
            </div>
          </div>
        ))}</div>
      }

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Accept Booking: ${selected?.bookingRef}`} wide>
        {selected && (
          <div className="space-y-4">
            {/* Booking summary */}
            <div className="bg-surface-2 rounded-lg p-3 text-sm space-y-1">
              <div><span className="text-gray-500">Customer: </span><span className="font-bold">{selected.customerName}</span></div>
              <div><span className="text-gray-500">Phone: </span>{selected.customerPhone}</div>
              <div><span className="text-gray-500">Preferred Date: </span>{fmtDate(selected.preferredDate)}</div>
              {selected.serviceNote && <div><span className="text-gray-500">Service Note: </span>{selected.serviceNote}</div>}
              {selected.vehicleNumber && <div><span className="text-gray-500">Vehicle: </span>{selected.vehicleNumber} {selected.vehicleBrand || ''}</div>}
            </div>

            <p className="text-xs text-amber bg-amber/5 border border-amber/15 rounded-lg px-3 py-2">
              Fill in the additional details to create a job card from this booking.
            </p>

            <JobForm initialData={initialData} onSubmit={createJob} user={user} branchList={branchList} allowSpares={false} />
          </div>
        )}
      </Modal>
    </div>
  )
}