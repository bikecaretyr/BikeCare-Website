import { useEffect, useState } from 'react'
import { pub } from '../../api/client'
import { Spinner, StatusBadge, fmtDate } from '../../components/ui'
import type { Service, Branch, JobCard } from '../../types'

// ── Hero ──────────────────────────────────────────────────
function Hero() {
  const [vehicle, setVehicle] = useState('')
  const [phone, setPhone]     = useState('')
  const [result, setResult]   = useState<JobCard | null>(null)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  async function quickTrack() {
    if (!vehicle && !phone) return
    setLoading(true); setErr(''); setResult(null)
    try {
      const d = await pub.track(vehicle || undefined, phone || undefined)
      if (d.jobs.length) setResult(d.jobs[0])
      else setErr('No records found')
    } catch { setErr('Not found') }
    finally { setLoading(false) }
  }

  return (
    <section className="min-h-[92vh] flex items-center relative overflow-hidden bg-gradient-to-br from-[#090b10] via-surface to-[#1a1200]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(245,158,11,0.07),transparent_60%)]" />
      <div className="absolute right-[-2%] top-1/2 -translate-y-1/2 font-heading text-[clamp(120px,18vw,260px)] font-bold text-amber/[0.04] leading-none pointer-events-none select-none">BMS</div>
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center w-full py-16 relative">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber/10 border border-amber/25 text-amber px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide mb-5">
            ⚡ Trichy's Trusted Bike Care
          </div>
          <h1 className="font-heading text-[clamp(36px,5vw,64px)] font-bold leading-tight mb-4">
            Expert Care<br />for Your <span className="text-amber">Bike</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-7 max-w-md">
            Certified mechanics, genuine parts, transparent pricing.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href="#booking" className="btn-primary px-7 py-3.5 text-base">📅 Book a Service</a>
            <a href="#track"   className="btn-outline px-7 py-3.5 text-base">🔍 Track My Bike</a>
          </div>
          <div className="flex gap-8 mt-10 flex-wrap">
            {[['2+','Branches'],['10K+','Bikes Serviced'],['15+','Mechanics'],['20+yr','Experience']].map(([n,l]) => (
              <div key={l} className="text-center">
                <div className="font-heading text-3xl font-bold text-amber">{n}</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:flex justify-center">
          <div className="card p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-500" /><span className="w-3 h-3 rounded-full bg-amber" /><span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500 ml-1">Quick Vehicle Tracker</span>
            </div>
            <input className="input mb-3 uppercase" placeholder="TN59AB1234" value={vehicle} onChange={e => setVehicle(e.target.value.toUpperCase())} />
            <input className="input mb-3" placeholder="Or your phone number" value={phone} onChange={e => setPhone(e.target.value)} />
            <button className="btn-primary w-full" onClick={quickTrack} disabled={loading}>{loading ? 'Searching...' : 'Check Status'}</button>
            {err && <p className="text-red-400 text-xs mt-3 text-center">{err}</p>}
            {result && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-heading text-base font-bold text-amber">{result.vehicleNumber}</span>
                  <StatusBadge status={result.status} />
                </div>
                <p className="text-xs text-gray-400">{result.jobNo} · {result.serviceMode}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Services ──────────────────────────────────────────────
const SVC_ICONS: Record<string, string> = { General:'🔧',Repair:'⚙️',Electrical:'⚡',Body:'🎨',Tyres:'🛞','Full Service':'🏆',Other:'🔩' }

function Services() {
  const [list, setList]     = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { pub.getServices().then(d => setList(d.services)).catch(() => {}).finally(() => setLoading(false)) }, [])
  return (
    <section id="services" className="py-20 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="section-tag">What We Offer</div>
        <h2 className="section-title">Our Services</h2>
        <p className="text-gray-400 text-base max-w-xl mb-10">Comprehensive two-wheeler care from routine maintenance to full engine overhauls.</p>
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {list.map(s => (
              <div key={s._id} className="bg-[#090b10] border border-border rounded-xl p-5 relative overflow-hidden group hover:-translate-y-1 hover:border-amber/40 hover:shadow-lg hover:shadow-amber/5 transition-all duration-200">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-3xl mb-3">{SVC_ICONS[s.category] || '🔧'}</div>
                <div className="font-heading text-lg font-semibold mb-1">{s.name}</div>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{s.description}</p>
                {/* <div className="font-heading text-xl font-bold text-amber">
                  ₹{s.price.toLocaleString()} <span className="text-xs font-normal text-gray-500">{s.priceType === 'starting_from' ? 'onwards' : ''}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">⏱ ~{s.durationMinutes} mins</div>  */}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── Booking Form ──────────────────────────────────────────
function Booking() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [form, setForm] = useState({ customerName:'', customerPhone:'', customerEmail:'', vehicleNumber:'', vehicleBrand:'', vehicleModel:'', serviceNote:'', preferredDate: new Date().toISOString().split('T')[0], branchId:'' })
  const [loading, setLoading] = useState(false)
  const [ref, setRef]         = useState('')
  const s = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  useEffect(() => { pub.getBranches().then(d => { setBranches(d.branches); if(d.branches[0]) s('branchId', d.branches[0]._id) }).catch(() => {}) }, [])

  async function submit() {
    if (!form.customerName || !form.customerPhone || !form.branchId || !form.preferredDate) { alert('Please fill required fields'); return }
    if (!/^[6-9]\d{9}$/.test(form.customerPhone)) { alert('Enter a valid 10-digit phone number'); return }
    setLoading(true)
    try { const d = await pub.createBooking(form); setRef(d.bookingRef) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <section id="booking" className="py-20 px-6 bg-[#090b10]">
      <div className="max-w-6xl mx-auto">
        <div className="section-tag">Hassle-Free Booking</div>
        <h2 className="section-title">Book Your Service</h2>
        <div className="grid md:grid-cols-2 gap-12 mt-10 items-start">
          <div>
            <p className="text-gray-400 text-base leading-relaxed mb-6">Fill in the form and we'll confirm within 2 hours. No payment needed — pay at the workshop.</p>
            <ul className="space-y-5">
              {[['✅','Free Booking','No advance payment required'],['⚡','Quick Confirmation','Admin confirms within 2 hours'],['🔧','Certified Mechanics','Trained on all major brands'],['📱','Live Status Updates','Track your bike from pickup to delivery']].map(([i,t,d]) => (
                <li key={t} className="flex gap-3 items-start">
                  <span className="text-xl mt-0.5">{i}</span>
                  <div><div className="font-semibold text-sm">{t}</div><div className="text-xs text-gray-400 mt-0.5">{d}</div></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <h3 className="font-heading text-lg font-semibold mb-5">Service Booking Form</h3>
            {ref ? (
              <div className="text-center py-8 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="text-4xl mb-3">🎉</div>
                <div className="font-semibold mb-2">Booking Submitted!</div>
                <div className="font-heading text-2xl font-bold text-green-400">{ref}</div>
                <p className="text-xs text-gray-400 mt-2">We'll call you within 2 hours to confirm.</p>
                <button className="btn-outline mt-4 text-xs" onClick={() => setRef('')}>Book Another</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Name <span className="text-red-400">*</span></label><input className="input" placeholder="Full name" value={form.customerName} onChange={e => s('customerName', e.target.value)} /></div>
                  <div><label className="form-label">Phone <span className="text-red-400">*</span></label><input className="input" placeholder="9876543210" maxLength={10} value={form.customerPhone} onChange={e => s('customerPhone', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Vehicle No</label><input className="input uppercase" placeholder="TN59AB1234" value={form.vehicleNumber} onChange={e => s('vehicleNumber', e.target.value.toUpperCase())} /></div>
                  <div><label className="form-label">Brand</label>
                    <select className="input" value={form.vehicleBrand} onChange={e => s('vehicleBrand', e.target.value)}>
                      <option value="">Select</option>
                      {['Hero','Honda','Bajaj','TVS','Yamaha','Suzuki','Royal Enfield','KTM','Ather','Other'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Model</label><input className="input" placeholder="e.g. Splendor, CB350" value={form.vehicleModel} onChange={e => s('vehicleModel', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Branch <span className="text-red-400">*</span></label>
                    <select className="input" value={form.branchId} onChange={e => s('branchId', e.target.value)}>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Date <span className="text-red-400">*</span></label><input className="input" type="date" value={form.preferredDate} min={new Date().toISOString().split('T')[0]} onChange={e => s('preferredDate', e.target.value)} /></div>
                </div>
                <div><label className="form-label">What needs fixing?</label><textarea className="input resize-none" rows={3} placeholder="Describe the issue..." value={form.serviceNote} onChange={e => s('serviceNote', e.target.value)} /></div>
                <div><label className="form-label">Email (optional)</label><input className="input" type="email" placeholder="yourmail@example.com" value={form.customerEmail} onChange={e => s('customerEmail', e.target.value)} /></div>
                <button className="btn-primary w-full py-3" onClick={submit} disabled={loading}>
                  {loading ? <Spinner size="sm" /> : '📅 Submit Booking Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Track ─────────────────────────────────────────────────
function Track() {
  const [vehicle, setVehicle] = useState('')
  const [phone, setPhone]     = useState('')
  const [jobs, setJobs]       = useState<JobCard[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  async function track() {
    if (!vehicle && !phone) { setErr('Enter vehicle number or phone'); return }
    setLoading(true); setJobs([]); setErr('')
    try {
      const d = await pub.track(vehicle || undefined, phone || undefined)
      setJobs(d.jobs)
      if (!d.jobs.length) setErr('No service records found')
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Not found') }
    finally { setLoading(false) }
  }

  return (
    <section id="track" className="py-20 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="section-tag">Real-Time Status</div>
        <h2 className="section-title">Track Your Vehicle</h2>
        <p className="text-gray-400 text-base mb-8">Enter your vehicle number or registered phone to see service status.</p>
        <div className="bg-[#090b10] border border-border rounded-xl p-7 max-w-lg">
          <div><label className="form-label">Vehicle Number</label><input className="input mb-3 uppercase" placeholder="TN59AB1234" value={vehicle} onChange={e => setVehicle(e.target.value.toUpperCase())} /></div>
          <div className="text-center text-xs text-gray-600 my-3">— or —</div>
          <div><label className="form-label">Phone Number</label><input className="input mb-4" placeholder="9876543210" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <button className="btn-primary w-full" onClick={track} disabled={loading}>{loading ? <Spinner size="sm" /> : '🔍 Check Status'}</button>
          {err && <p className="text-red-400 text-xs mt-3 text-center">{err}</p>}
          {jobs.map(j => (
            <div key={j._id} className="mt-4 bg-surface-2 border border-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-heading text-base font-bold text-amber">{j.vehicleNumber}</span>
                <StatusBadge status={j.status} />
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>📋 {j.jobNo} · 🏍 {j.brand} {j.model || ''}</div>
                <div>🔧 {j.serviceMode} · 👨‍🔧 {j.mechanic}</div>
                <div>📅 In: {fmtDate(j.serviceInDate)}{j.expectedDelivery ? ` · 🚀 Expected: ${fmtDate(j.expectedDelivery)}` : ''}</div>
                <div>📍 {(j.branch as {name:string})?.name || ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Branches ──────────────────────────────────────────────
function BranchSection() {
  const [list, setList]       = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { pub.getBranches().then(d => setList(d.branches)).catch(() => {}).finally(() => setLoading(false)) }, [])
  return (
    <section id="branches" className="py-20 px-6 bg-[#090b10]">
      <div className="max-w-6xl mx-auto">
        <div className="section-tag">Find Us</div>
        <h2 className="section-title">Our Branches</h2>
        {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {list.map(b => (
              <div key={b._id} className="card p-5 hover:border-amber/40 transition-colors">
                <div className="font-heading text-base font-semibold mb-3">📍 {b.name}</div>
                <div className="text-xs text-gray-400 leading-relaxed mb-3">
                  {b.address?.street && <div>{b.address.street}</div>}
                  <div>{b.address?.city} — {b.address?.pincode}</div>
                  {b.phone && <a href={`tel:${b.phone}`} className="text-amber hover:underline mt-1 block">📞 {b.phone}</a>}
                </div>
                <div className="text-xs bg-surface-3 rounded-lg px-3 py-2 text-gray-500 mb-3">🕐 {b.workingHours?.open} – {b.workingHours?.close}</div>
                <div className="flex gap-2 flex-wrap">
                  {b.phone && <button onClick={() => window.location.href=`tel:${b.phone}`} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-green-500/10 text-green-400 hover:brightness-110">📞</button>}
                  {b.whatsapp && <button onClick={() => window.open(`https://wa.me/91${b.whatsapp}`,'_blank')} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#25d366]/10 text-[#25d366] hover:brightness-110">💬</button>}
                  {b.googleMapsUrl && <button onClick={() => window.open(b.googleMapsUrl,'_blank')} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 hover:brightness-110">🗺</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── Why Us ────────────────────────────────────────────────
function WhyUs() {
  return (
    <section className="py-20 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="section-tag">Why Choose Us</div>
        <h2 className="section-title">The Balaji Difference</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {[['🔬','Diagnostic Checkup','Free 21-point inspection with every service'],['⚙️','Genuine Parts','OEM parts from brand distributors'],['💰','Transparent Pricing','No hidden costs. Detailed invoice every time'],['🕐','Express Service','Most services done within 2–4 hours']].map(([i,t,d]) => (
            <div key={t} className="bg-[#090b10] border border-border rounded-xl p-5 text-center hover:border-amber/30 hover:-translate-y-1 transition-all duration-200">
              <div className="text-4xl mb-3">{i}</div>
              <div className="font-heading text-base font-semibold mb-2">{t}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact ───────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name:'', contact:'', message:'' })
  return (
    <section id="contact" className="py-20 px-6 bg-[#090b10]">
      <div className="max-w-6xl mx-auto">
        <div className="section-tag">Get In Touch</div>
        <h2 className="section-title">Contact Us</h2>
        <div className="grid md:grid-cols-2 gap-12 mt-10 items-start">
          <div className="space-y-5">
            {[['📍','Head Office','4HGM+V8H Thuraiyur, Trichy — 621010'],['📞','Phone','04327 223 224','tel:04327223224'],['💬','WhatsApp','+91 98424 19401','https://wa.me/919842419401'],['✉️','Email','bikecaretyr@gmail.com','mailto:bikecaretyr@gmail.com'],['🕐','Hours','Mon–Sat: 9:30 AM – 7:30 PM']].map(([icon,label,val,href]) => (
              <div key={label as string} className="flex gap-3 items-start">
                <span className="text-xl mt-0.5">{icon}</span>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
                  {href ? <a href={href as string} className="text-sm font-medium text-amber hover:underline">{val}</a> : <div className="text-sm font-medium">{val}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="card p-6 space-y-3">
            <h3 className="font-heading text-lg font-semibold">Send us a Message</h3>
            <div><label className="form-label">Name</label><input className="input" placeholder="Your name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><label className="form-label">Phone / Email</label><input className="input" placeholder="Phone or email" value={form.contact} onChange={e => setForm(f=>({...f,contact:e.target.value}))} /></div>
            <div><label className="form-label">Message</label><textarea className="input resize-none" rows={4} placeholder="How can we help?" value={form.message} onChange={e => setForm(f=>({...f,message:e.target.value}))} /></div>
            <button className="btn-primary w-full" onClick={() => { alert('Message sent! We will get back to you shortly.'); setForm({name:'',contact:'',message:''}) }}>Send Message</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Home page ─────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Booking />
      <Track />
      <BranchSection />
      <WhyUs />
      <Contact />
    </>
  )
}
