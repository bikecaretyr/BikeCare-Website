import type { JobCard, Branch } from '../types'

interface JobIntakePrintProps {
    job: JobCard
    onClose: () => void
}

const today = new Date().toLocaleDateString('en-IN')

export function JobIntakePrint({ job, onClose }: JobIntakePrintProps) {
    const branch = typeof job.branch === 'string' ? undefined : job.branch as Branch | undefined

    return (
        <div id="job-intake-wrapper" className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 print:p-0">
            <style>{`
            @media print {
                body {
                background: white !important;
                }

                body * {
                visibility: hidden !important;
                }

                #job-intake-wrapper,
                #job-intake-wrapper * {
                visibility: visible !important;
                }

                #job-intake-wrapper {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                min-height: 100% !important;
                background: white !important;
                padding: 0 !important;
                overflow: visible !important;
                }

                #job-intake-sheet,
                #job-intake-back {
                width: 194mm !important;
                height: 268mm !important;
                max-height: 268mm !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                margin: 0 auto !important;
                padding: 3mm !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                font-size: 8.5px !important;
                }

                html,
                body {
                margin: 0 !important;
                padding: 0 !important;
                }

                #job-intake-sheet {
                page-break-after: always !important;
                break-after: page !important;
                }

                #job-intake-back {
                margin-top: 0 !important;
                }

                #job-intake-sheet .mt-3,
                #job-intake-back .mt-3 {
                margin-top: 4px !important;
                }

                #job-intake-sheet .p-2,
                #job-intake-back .p-2 {
                padding: 3px !important;
                }

                #job-intake-sheet .h-20 {
                height: 40px !important;
                }

                #job-intake-sheet .h-24 {
                height: 50px !important;
                }

                #job-intake-sheet .min-h-16 {
                min-height: 30px !important;
                }

                #job-intake-sheet .min-h-24 {
                min-height: 40px !important;
                }

                #job-intake-back .h-6 {
                height: 16px !important;
                }

                #job-intake-back .p-1 {
                padding: 2px !important;
                }

                #job-intake-back .mt-4 {
                margin-top: 4px !important;
                }

                #job-intake-back .min-h-20 {
                min-height: 30px !important;
                }

                .no-print {
                display: none !important;
                }

                @page {
                size: A4 portrait;
                margin: 5mm;
                }
            }
            `}</style>

            {/* PAGE 1 — FRONT */}
            <div id="job-intake-sheet" className="mx-auto max-w-5xl bg-white text-black p-5 rounded-lg shadow-xl text-[11px] font-sans">
                <div className="text-center border-b-2 border-black pb-2">
                    <h1 className="text-2xl font-bold">BALAJI MOTORS BIKE CARE</h1>
                    <div className="text-sm font-semibold">{branch?.name || 'Workshop Job Card'}</div>
                    <div>{branch?.address?.street || ''} {branch?.address?.city || ''}</div>
                    <div>Phone: {branch?.phone || '—'} {branch?.whatsapp ? ` | WhatsApp: ${branch.whatsapp}` : ''}</div>
                </div>

                <div className="grid grid-cols-4 gap-2 border-b border-black py-2">
                    <Box label="J.C. No" value={job.jobNo} />
                    <Box label="Date" value={today} />
                    <Box label="Vehicle No" value={job.vehicleNumber} />
                    <Box label="KM Reading" value={job.kmReading ? `${job.kmReading} km` : ''} />

                    <Box label="Customer Name" value={job.customerName || ''} />
                    <Box label="Phone" value={job.customerPhone || ''} />
                    <Box label="Brand / Model" value={`${job.brand} ${job.model || ''}`} />
                    <Box label="Mechanic" value={job.mechanic || ''} />

                    <Box label="Service Type" value={job.serviceMode} />
                    <Box label="Expected Delivery" value={job.expectedDelivery ? new Date(job.expectedDelivery).toLocaleDateString('en-IN') : ''} />
                    <Box label="Engine Oil" value={job.engineOil || ''} />
                    <Box label="Status" value={job.status} />
                </div>

                <Section title="CUSTOMER COMPLAINT / REQUEST">
                    <div className="min-h-16 border border-black p-2">{job.complaint || ''}</div>
                </Section>

                <Section title="ACCESSORIES CHECK">
                    <div className="grid grid-cols-4 gap-2">
                        {['Helmet', 'RC Book', 'Insurance', 'Tool Kit', 'Mirror', 'Side Box', 'Mobile Holder', 'Charger', 'Seat Cover', 'Key Chain', 'Number Plate', 'Others'].map(x => (
                            <Check key={x} label={x} />
                        ))}
                    </div>
                </Section>

                <Section title="FUEL LEVEL">
                    <div className="grid grid-cols-9 gap-1 text-center">
                        {['E', '1', '2', '3', '4', '5', '6', '7', 'F'].map(x => (
                            <div key={x} className="border border-black h-8 flex items-center justify-center">{x}</div>
                        ))}
                    </div>
                </Section>

                <Section title="PHYSICAL / PAINT CONDITION">
                    <div className="grid grid-cols-4 gap-2">
                        {['Dent - D', 'Scratch - S', 'Missing - M', 'Peel Off - P'].map(x => (
                            <Check key={x} label={x} />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <LineBox title="LH Side Notes" />
                        <LineBox title="RH Side Notes" />
                    </div>
                </Section>

                <Section title="WORKSHOP CHECKLIST">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {[
                            'Engine oil check / replace',
                            'Brake check',
                            'Clutch check',
                            'Chain clean & adjust',
                            'Battery check',
                            'Lights / horn check',
                            'Self start check',
                            'Tyre pressure',
                            'Suspension check',
                            'Water wash',
                            'Road test',
                            'Final inspection',
                        ].map(x => (
                            <Check key={x} label={x} />
                        ))}
                    </div>
                </Section>

                <Section title="MANUAL WORK NOTES">
                    <div className="grid grid-cols-3 gap-1">
                        <BigBlank title="Mechanic Notes" />
                        <BigBlank title="Parts / Spares Notes" />
                        <BigBlank title="Supervisor Notes" />
                    </div>
                </Section>

                <Section title="CUSTOMER ACKNOWLEDGEMENT">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border border-black p-2 min-h-24">
                            I acknowledge that the above vehicle has been handed over for service/repair. Delivery time and estimate may change after inspection.
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Signature label="Customer Signature" />
                            <Signature label="Service Advisor Signature" />
                        </div>
                    </div>
                </Section>
            </div>

            {/* PAGE 2 — BACK */}
            <div id="job-intake-back" className="mx-auto mt-4 max-w-5xl bg-white text-black p-5 rounded-lg shadow-xl text-[11px] font-sans print:mt-0 print:shadow-none print:rounded-none">
                <div className="text-center border-b-2 border-black pb-2">
                    <h2 className="text-xl font-bold">WORKSHOP BACK SIDE / FINAL CHECK</h2>
                    <div>J.C. No: <strong>{job.jobNo}</strong> | Vehicle: <strong>{job.vehicleNumber}</strong></div>
                </div>

                <Section title="PARTS USED / SPARES DETAILS">
                    <table className="w-full border-collapse text-[11px]">
                        <thead>
                            <tr>
                                <th className="border border-black p-1">Part No</th>
                                <th className="border border-black p-1">Description</th>
                                <th className="border border-black p-1">Qty</th>
                                <th className="border border-black p-1">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 7 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="border border-black p-1 h-6"></td>
                                    <td className="border border-black p-1"></td>
                                    <td className="border border-black p-1"></td>
                                    <td className="border border-black p-1"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Section>

                <Section title="LABOUR DETAILS">
                    <table className="w-full border-collapse text-[11px]">
                        <thead>
                            <tr>
                                <th className="border border-black p-1">Work Description</th>
                                <th className="border border-black p-1">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="border border-black p-1 h-6"></td>
                                    <td className="border border-black p-1 w-32"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Section>

                <Section title="FINAL INSPECTION">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            'Engine oil checked',
                            'Brake checked',
                            'Clutch checked',
                            'Chain adjusted',
                            'Lights checked',
                            'Horn checked',
                            'Tyre pressure checked',
                            'Road test completed',
                            'Water wash completed',
                            'Customer complaint verified',
                        ].map(x => <Check key={x} label={x} />)}
                    </div>
                </Section>

                <Section title="CUSTOMER CONTACT DETAILS">
                    <div className="grid grid-cols-2 gap-2">
                        <Box label="Person Contacted" value="" />
                        <Box label="Contact By" value="" />
                        <Box label="Date of Contact" value="" />
                        <Box label="Time of Contact" value="" />
                        <Box label="Revised Delivery Time" value="" />
                        <Box label="Revised Estimate Cost" value="" />
                    </div>
                </Section>

                <Section title="TERMS / CUSTOMER DECLARATION">
                    <div className="min-h-20 text-[10px] leading-relaxed">
                        I acknowledge that the vehicle has been serviced/repaired as per the work instructions.
                        I have checked the vehicle condition, received the vehicle, and accept the final delivery.
                        Any additional work or cost has been explained before delivery.
                    </div>
                </Section>

                <div className="grid grid-cols-3 gap-4 mt-4">
                    <Signature label="Customer Signature" />
                    <Signature label="Billing Sign & Seal" />
                    <Signature label="Supervisor Signature" />
                </div>
            </div>

            <div className="no-print mt-5 flex justify-end gap-3">
                <button className="btn-outline px-4 py-2" onClick={onClose}>Close</button>
                <button className="btn-primary px-4 py-2" onClick={() => window.print()}>Print</button>
            </div>
        </div>
    )
}

function Box({ label, value }: { label: string; value?: string }) {
    return (
        <div className="border border-black p-1 min-h-10">
            <div className="text-[9px] font-bold uppercase">{label}</div>
            <div className="text-sm font-semibold">{value || ''}</div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-3">
            <div className="bg-gray-200 border border-black text-center font-bold py-1">{title}</div>
            <div className="border-x border-b border-black p-2">{children}</div>
        </div>
    )
}

function Check({ label }: { label: string }) {
    return (
        <label className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 border border-black" />
            <span>{label}</span>
        </label>
    )
}

function LineBox({ title }: { title: string }) {
    return (
        <div>
            <div className="font-bold mb-1">{title}</div>
            <div className="border border-black h-20" />
        </div>
    )
}

function BigBlank({ title }: { title: string }) {
    return (
        <div>
            <div className="font-bold mb-1">{title}</div>
            <div className="border border-black h-24" />
        </div>
    )
}

function Signature({ label }: { label: string }) {
    return (
        <div className="pt-6">
            <div className="border-t border-black text-center pt-1">{label}</div>
        </div>
    )
}