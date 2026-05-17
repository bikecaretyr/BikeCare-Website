import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'

export default function SuperAdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { superAdminLogin }     = useAuth()
  const navigate                = useNavigate()

  async function submit() {
    if (!username || !password) { setError('Credentials required'); return }
    setLoading(true); setError('')
    try {
      await superAdminLogin(username, password)
      navigate('/admin/dashboard', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Access denied')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050709] via-[#090b10] to-[#050709] px-4">
      {/* Matrix-style grid overlay */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,255,80,.015) 0px,rgba(0,255,80,.015) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(0,255,80,.015) 0px,rgba(0,255,80,.015) 1px,transparent 1px,transparent 40px)' }} />

      <div className="w-full max-w-sm relative">
        <div className="bg-[#0d1117] border border-[#21292e] rounded-xl p-8 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(0,200,80,.05)' }}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">⚡</div>
            <h1 className="font-heading text-2xl font-bold text-[#00c864] tracking-widest">SUPER ADMIN</h1>
            <p className="text-xs text-[#3d5e44] uppercase tracking-widest mt-1 font-mono">Developer Access Only</p>
          </div>

          <div className="bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2 text-xs text-red-400 text-center mb-5 font-mono">
            ⚠ All access attempts are logged with IP and timestamp
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-3 py-2 mb-4 font-mono text-center">{error}</div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#3d5e44] mb-1">Username</label>
              <input className="w-full bg-[#0a0e10] border border-[#21292e] rounded-lg px-3 py-2.5 text-gray-100 text-sm font-mono outline-none focus:border-[#00c864] focus:ring-2 focus:ring-[#00c864]/10 transition-all placeholder:text-[#3d5e44]"
                type="text" autoComplete="off" spellCheck={false}
                value={username} onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#3d5e44] mb-1">Password</label>
              <input className="w-full bg-[#0a0e10] border border-[#21292e] rounded-lg px-3 py-2.5 text-gray-100 text-sm font-mono outline-none focus:border-[#00c864] focus:ring-2 focus:ring-[#00c864]/10 transition-all placeholder:text-[#3d5e44]"
                type="password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            <button className="w-full py-2.5 bg-[#00c864] text-[#050709] font-bold text-sm rounded-lg hover:bg-[#00e070] transition-all font-mono tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={submit} disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'ACCESS SYSTEM →'}
            </button>
          </div>

          <div className="mt-5 text-center text-xs font-mono text-[#3d5e44] space-x-3">
            <a href="/login" className="hover:text-[#00c864] transition-colors">Staff Login</a>
            <span>·</span>
            <a href="/" className="hover:text-[#00c864] transition-colors">Public Site</a>
          </div>
        </div>
      </div>
    </div>
  )
}
