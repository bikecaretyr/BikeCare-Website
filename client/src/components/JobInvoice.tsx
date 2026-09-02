import { useEffect, useState } from 'react'
import type { JobCard, SpareItem } from '../types'

interface InvoiceSaveData {
  labourCharge: number
  waterWash: number
  discount: number
  paymentMode: string
  workDone: string
  sparesUsed: Array<{
    partId?: string
    partNumber: string
    partName: string
    vendorBatchId?: string
    vendorName: string
    qty: number
    sellingPrice: number
  }>
}

interface JobInvoiceProps {
  job: JobCard
  onClose: () => void
  onSave?: (data: InvoiceSaveData) => Promise<void>
}

interface LabourRow {
  id: string
  description: string
  amount: number
}

interface PartRow {
  id: string
  partNumber: string
  partName: string
  vendorName: string
  qty: number
  unitPrice: number
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function safeNumber(value: string | number | undefined) {
  const n = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function JobInvoice({ job, onClose, onSave }: JobInvoiceProps) {
  const [labourRows, setLabourRows] = useState<LabourRow[]>([
    { id: '1', description: 'Labour Charge', amount: job.labourCharge },
    { id: '2', description: 'Water Wash', amount: job.waterWash },
  ])
  const [partRows, setPartRows] = useState<PartRow[]>(
    (job.sparesUsed ?? []).map((item, index) => ({
      id: String(index),
      partNumber: item.partNumber || '',
      partName: item.partName,
      vendorName: item.vendorName || '',
      qty: item.qty,
      unitPrice: item.sellingPrice,
    }))
  )
  const [discount, setDiscount] = useState<number>(job.discount)
  const [paymentMode, setPaymentMode] = useState(job.paymentMode)
  const [workDone, setWorkDone] = useState(job.workDone || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setLabourRows([
      { id: '1', description: 'Labour Charge', amount: job.labourCharge },
      { id: '2', description: 'Water Wash', amount: job.waterWash },
    ])
    setPartRows((job.sparesUsed ?? []).map((item, index) => ({
      id: String(index),
      partNumber: item.partNumber || '',
      partName: item.partName,
      vendorName: item.vendorName || '',
      qty: item.qty,
      unitPrice: item.sellingPrice,
    })))
    setDiscount(job.discount)
    setPaymentMode(job.paymentMode)
    setWorkDone(job.workDone || '')
  }, [job])

  const labourTotal = labourRows
    .filter(row => row.description !== 'Water Wash')
    .reduce((sum, row) => sum + safeNumber(row.amount), 0)

  const waterWashTotal = labourRows
    .filter(row => row.description === 'Water Wash')
    .reduce((sum, row) => sum + safeNumber(row.amount), 0)
  const sparesTotal = partRows.reduce((sum, row) => sum + safeNumber(row.qty) * safeNumber(row.unitPrice), 0)
  const subtotal = labourTotal + waterWashTotal + sparesTotal
  const total = Math.max(0, subtotal - safeNumber(discount))

  const paidAmount = safeNumber(job.paidAmount)
  const balanceAmount = safeNumber(job.balanceAmount)

  const branch = typeof job.branch === 'string' ? undefined : job.branch
  const invoiceDate = job.actualDelivery || job.serviceInDate || new Date().toISOString()
  const invoiceDateLabel = new Date(invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const branchAddress = [branch?.address?.street, branch?.address?.city].filter(Boolean).join(', ')

  const updateLabour = (id: string, field: 'description' | 'amount', value: string) => {
    setLabourRows(rows => rows.map(row => row.id === id ? {
      ...row,
      [field]: field === 'amount' ? safeNumber(value) : value,
    } : row))
  }

  const updatePart = (id: string, field: 'qty' | 'unitPrice' | 'partNumber' | 'partName' | 'vendorName', value: string) => {
    setPartRows(rows => rows.map(row => row.id === id ? {
      ...row,
      [field]: field === 'qty' || field === 'unitPrice' ? safeNumber(value) : value,
    } : row))
  }

  const addLabourRow = () => {
    setLabourRows(rows => [...rows, { id: `${Date.now()}-${rows.length}`, description: 'Miscellaneous', amount: 0 }])
  }

  const addPartRow = () => {
    setPartRows(rows => [...rows, {
      id: `${Date.now()}-${rows.length}`,
      partNumber: '', partName: '', vendorName: '', qty: 1, unitPrice: 0,
    }])
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    setSaveError('')
    try {
      const labourCharge = labourRows
        .filter(row => row.description !== 'Water Wash')
        .reduce((sum, row) => sum + safeNumber(row.amount), 0)
      const waterWash = labourRows
        .filter(row => row.description === 'Water Wash')
        .reduce((sum, row) => sum + safeNumber(row.amount), 0)

      const originalSpares = job.sparesUsed ?? []
      const sparesUsed = partRows
        .filter(row => row.partName || row.partNumber)
        .map((row, index) => {
          const original = originalSpares[index]
          return {
            partId: original?.partId,
            partNumber: row.partNumber,
            partName: row.partName,
            vendorBatchId: original?.vendorBatchId,
            vendorName: row.vendorName,
            qty: safeNumber(row.qty),
            sellingPrice: safeNumber(row.unitPrice),
          }
        })

      await onSave({
        labourCharge,
        waterWash,
        discount: safeNumber(discount),
        paymentMode,
        workDone,
        sparesUsed,
      })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id="bms-invoice-wrapper" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 print:p-0">
      <style>{`
        @media print {
          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #bms-invoice-wrapper,
          #bms-invoice-wrapper * {
            visibility: visible !important;
          }

          #bms-invoice-wrapper {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          #bms-invoice {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: none !important;
            padding: 5mm !important;
            font-size: 10px !important;
          }

          #bms-invoice .overflow-x-auto {
            overflow: visible !important;
          }

          #bms-invoice table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
          }

          #bms-invoice table thead {
            display: table-header-group !important;
          }

          #bms-invoice table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #bms-invoice table th,
          #bms-invoice table td {
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
            white-space: normal !important;
          }

          #bms-invoice table input,
          #bms-invoice table select {
            box-sizing: border-box !important;
            min-width: 0 !important;
            width: 100% !important;
          }

          #bms-invoice .mt-8 {
            margin-top: 10px !important;
          }

          #bms-invoice .mt-6 {
            margin-top: 8px !important;
          }

          #bms-invoice textarea {
            rows: 2;
            height: 36px !important;
          }

          #bms-invoice table th,
          #bms-invoice table td {
            padding: 3px 4px !important;
            font-size: 10px !important;
          }

          #bms-invoice input,
          #bms-invoice select,
          #bms-invoice textarea {
            font-size: 10px !important;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>
      <div id="bms-invoice" className="mx-auto w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl text-gray-900 font-sans print:border-0 print:shadow-none print:bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-3xl font-bold text-[#D97706]">Balaji Motors Bike Care</div>
            <div className="mt-1 text-sm text-gray-500">Workshop Invoice</div>
            {branch && (
              <div className="mt-4 text-sm text-gray-700 space-y-1">
                <div>{branch.name}</div>
                {branchAddress && <div>{branchAddress}</div>}
                {branch?.phone && <div>Phone: {branch.phone}</div>}
              </div>
            )}
          </div>
          <div className="space-y-2 text-right text-sm text-gray-700">
            <div><span className="font-semibold text-black">Invoice:</span> {job.jobNo}</div>
            <div><span className="font-semibold text-black">Date:</span> {invoiceDateLabel}</div>
            <div><span className="font-semibold text-black">Vehicle:</span> {job.vehicleNumber}</div>
            <div><span className="font-semibold text-black">Customer:</span> {job.customerName || '—'}{job.customerPhone ? ` / ${job.customerPhone}` : ''}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] text-gray-700">
          <div className="space-y-0.5">
            <div className="font-semibold text-gray-900">Vehicle Number</div>
            <div>{job.vehicleNumber}</div>
          </div>
          <div className="space-y-0.5">
            <div className="font-semibold text-gray-900">Brand / Model</div>
            <div>{job.brand} {job.model || ''}</div>
          </div>
          <div className="space-y-0.5">
            <div className="font-semibold text-gray-900">KM Reading</div>
            <div>{job.kmReading != null ? `${job.kmReading.toLocaleString('en-IN')} km` : '—'}</div>
          </div>
          <div className="space-y-0.5">
            <div className="font-semibold text-gray-900">Service Type</div>
            <div>{job.serviceMode}</div>
          </div>
          <div className="space-y-0.5">
            <div className="font-semibold text-gray-900">Mechanic</div>
            <div>{job.mechanic}</div>
          </div>
          <div className="space-y-0.5">
            <div className="font-semibold text-gray-900">Engine Oil</div>
            <div>{job.engineOil || '—'}</div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="font-semibold text-gray-900">Complaint</div>
            <div>{job.complaint || '—'}</div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="font-semibold text-gray-900">Work Done</div>
            <textarea
              className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
              value={workDone}
              onChange={e => setWorkDone(e.target.value)}
              rows={1}
            />
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gray-900">Services / Labour</div>
            <button type="button" className="btn-outline text-xs px-3 py-1 print:hidden" onClick={addLabourRow}>+ Add row</button>
          </div>
          <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-700">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {labourRows.map((row, index) => (
                <tr key={row.id} className="border-b border-gray-200">
                  <td className="py-3 pr-3 text-gray-500">{index + 1}</td>
                  <td className="py-3 pr-3">
                    <input
                      className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
                      value={row.description}
                      onChange={e => updateLabour(row.id, 'description', e.target.value)}
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input
                      className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-right text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
                      value={row.amount}
                      onChange={e => updateLabour(row.id, 'amount', e.target.value)}
                      type="number"
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gray-900">Parts Used</div>
            <button type="button" className="btn-outline text-xs px-3 py-1 print:hidden" onClick={addPartRow}>+ Add part</button>
          </div>
          <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-700">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Part No</th>
                <th className="py-2 pr-3">Part Name</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {partRows.map((row, index) => (
                <tr key={row.id} className="border-b border-gray-200">
                  <td className="py-3 pr-3 text-gray-500">{index + 1}</td>
                  <td className="py-3 pr-3">
                    <input
                      className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
                      value={row.partNumber}
                      onChange={e => updatePart(row.id, 'partNumber', e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
                      value={row.partName}
                      onChange={e => updatePart(row.id, 'partName', e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3 w-24">
                    <input
                      className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-right text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
                      type="number"
                      min="0"
                      value={row.qty}
                      onChange={e => updatePart(row.id, 'qty', e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3 w-32">
                    <input
                      className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-right text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
                      type="number"
                      min="0"
                      value={row.unitPrice}
                      onChange={e => updatePart(row.id, 'unitPrice', e.target.value)}
                    />
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900">{formatMoney(row.qty * row.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-2 sm:grid-cols-[1fr_220px]">
          <div className="space-y-3 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">Payment</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Payment Mode</div>
                <select
                  className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-gray-900 focus:border-gray-600 outline-none w-full print:border-0"
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as JobCard['paymentMode'])}
                >
                  {['Cash', 'UPI', 'Card', 'Credit'].map(mode => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </div>
              <div>
                <div>
                  <div className="text-xs text-gray-500">Payment Status</div>

                  <div className="mt-1 space-y-1">
                    <div
                      className={`text-sm font-semibold ${
                        job.paymentStatus === 'Paid'
                          ? 'text-green-600'
                          : job.paymentStatus === 'Partial'
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {job.paymentStatus}
                    </div>

                    <div className="space-y-0.5 text-xs">
                      <div>
                        Paid:
                        <span className="ml-1 font-semibold text-green-700">
                          {formatMoney(paidAmount)}
                        </span>
                      </div>

                      <div>
                        Balance:
                        <span className="ml-1 font-semibold text-red-600">
                          {formatMoney(balanceAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <div className="flex justify-between py-1">
              <span>Labour:</span>
              <span>{formatMoney(labourTotal)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span>Water Wash:</span>
              <span>{formatMoney(waterWashTotal)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span>Spares:</span>
              <span>{formatMoney(sparesTotal)}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-gray-200 pt-2"><span>Subtotal:</span><span>{formatMoney(subtotal)}</span></div>
            <div className="flex justify-between py-1 items-center">
              <span>Discount:</span>
              <input
                className="bg-transparent border-0 p-0 text-smborder-dashed border-gray-300 p-1 text-sm text-right text-gray-900 focus:border-gray-600 outline-none w-24 print:border-0"
                type="number"
                min="0"
                value={discount}
                onChange={e => setDiscount(safeNumber(e.target.value))}
              />
            </div>
            <div className="mt-2 border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
              <div className="flex justify-between">TOTAL:</div>
              <div className="mt-1 text-xl">{formatMoney(total)}</div>
            </div>
          </div>
        </div>
        {job.paymentHistory?.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 font-semibold text-gray-900">
              Payment History
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Mode</th>
                    <th className="px-4 py-2 text-left">Note</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {job.paymentHistory.map((payment, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2">
                        {new Date(payment.paidAt).toLocaleDateString('en-IN')}
                      </td>

                      <td className="px-4 py-2">
                        {payment.mode}
                      </td>

                      <td className="px-4 py-2">
                        {payment.note || '—'}
                      </td>

                      <td className="px-4 py-2 text-right font-semibold text-green-700">
                        {formatMoney(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-8 space-y-4 text-sm text-gray-700">
          <div>Thank you for choosing Balaji Motors!</div>
          <div>{branch?.whatsapp ? `WhatsApp: ${branch.whatsapp}` : branch?.phone ? `Phone: ${branch.phone}` : ''}</div>
          <div className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 text-sm">
              <div className="text-gray-500">Customer Signature</div>
              <div className="h-10 w-64 border-b border-gray-300"></div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-gray-500">Authorised Signatory</div>
              <div className="h-10 w-64 border-b border-gray-300"></div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3 print:hidden">
          {saveError && (
            <div className="flex-1 text-sm text-red-400">{saveError}</div>
          )}
          <button className="btn-outline px-4 py-2" type="button" onClick={onClose}>Close</button>
          {onSave && (
            <button
              className="btn-primary px-4 py-2"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : '💾 Save'}
            </button>
          )}
          <button className="btn-primary px-4 py-2" type="button" onClick={() => window.print()}>Print</button>
        </div>
      </div>
    </div>
  )
}
