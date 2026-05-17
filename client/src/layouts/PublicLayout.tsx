import { ReactNode, useState } from 'react'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const links = [
    { href: '/#services', label: 'Services' },
    { href: '/#booking',  label: 'Book Service' },
    { href: '/#track',    label: 'Track Vehicle' },
    { href: '/#branches', label: 'Branches' },
    { href: '/#contact',  label: 'Contact' },
  ]

  return (
    <div className="min-h-full flex flex-col bg-[#090b10]">
      {/* Announcement bar */}
      <div className="bg-amber text-black text-center py-1.5 text-xs font-semibold shrink-0">
        📞 Call for instant booking:&nbsp;
        <a href="tel:04327223224" className="underline">04327 223 224</a>
        &nbsp;|&nbsp;Now serving 2 branches in Trichy
      </div>

      {/* Navbar */}
      <nav className="bg-[#090b10]/95 backdrop-blur border-b border-border sticky top-0 z-50 px-6 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber to-orange-600 flex items-center justify-center text-xl">🏍</div>
            <div>
              <div className="font-heading text-lg font-bold leading-none">Balaji Motors</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-widest">Bike Care</div>
            </div>
          </a>
          <ul className="hidden md:flex items-center gap-7">
            {links.map(l => (
              <li key={l.href}>
                <a href={l.href} className="text-sm font-medium text-gray-400 hover:text-amber transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <a href="/login" className="hidden md:inline-flex btn-outline text-sm px-4 py-2">Staff Login</a>
            <button className="md:hidden btn-ghost p-2 text-xl" onClick={() => setDrawerOpen(true)}>☰</button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setDrawerOpen(false)} />}
      <div className={`fixed top-0 right-0 h-full w-72 bg-surface border-l border-border z-50 flex flex-col p-6 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <button className="self-end text-gray-400 text-2xl mb-6" onClick={() => setDrawerOpen(false)}>✕</button>
        {links.map(l => (
          <a key={l.href} href={l.href} onClick={() => setDrawerOpen(false)}
            className="py-3 text-base font-medium text-gray-300 border-b border-border hover:text-amber transition-colors">
            {l.label}
          </a>
        ))}
        <a href="/login" className="mt-5 btn-primary justify-center">Staff Login</a>
      </div>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border px-6 pt-10 pb-6 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-heading text-xl font-bold mb-2">🏍 Balaji Motors</div>
              <p className="text-xs text-gray-400 leading-relaxed">Trichy's trusted two-wheeler service center since 2007.</p>
            </div>
            {[
              { title: 'Services', links: [['/#services','General Service'],['/#services','Engine Repair'],['/#services','Tyre Change'],['/#services','Electrical Work']] },
              { title: 'Quick Links', links: [['/#booking','Book Service'],['/#track','Track Vehicle'],['/#branches','Our Branches'],['/login','Staff Login']] },
              { title: 'Contact', links: [['tel:04327223224','04327 223 224'],['mailto:bikecaretyr@gmail.com','bikecaretyr@gmail.com']] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(([href, label]) => (
                    <li key={label}><a href={href} className="text-sm text-gray-400 hover:text-amber transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-5 flex flex-wrap justify-between gap-2 text-xs text-gray-600">
            <span>© 2026 Balaji Motors Bike Care. All rights reserved.</span>
            <a href="https://github.com/Yashwanth-10" target="_blank" rel="noreferrer">Built by Dinatos</a>
          </div>
        </div>
      </footer>
      
      {/*
      WhatsApp floating button - Uncomment and update the number to enable
      <a href="https://wa.me/919876500001" target="_blank" rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#25d366] flex items-center justify-center text-2xl shadow-lg shadow-[#25d366]/30 hover:scale-110 transition-transform">
        💬
      </a>
      */}
    </div>
  )
}
