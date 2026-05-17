import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth, defaultRoute } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }   = useAuth()
  const navigate    = useNavigate()

  async function submit() {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')
    try {
      const data = await login(email, password)
      navigate(defaultRoute((data as { user: import('../../types').User }).user), { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#090b10] via-surface to-[#0a0d0b] px-4">
      <div className="w-full max-w-sm">
        <div className="card p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber to-orange-600 flex items-center justify-center text-2xl mx-auto mb-4">🏍</div>
            </Link>
            <h1 className="font-heading text-2xl font-bold">Balaji Motors BMS</h1>
            <p className="text-sm text-gray-400 mt-1">Staff Login</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
          )}

          <div className="space-y-3">
            <div>
              <label className="form-label">Email Address</label>
              <input className="input" type="email" autoComplete="email" placeholder="you@balajimotor.in"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input className="input pr-16" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
                <button type="button" className="absolute inset-y-0 right-2 flex items-center px-2 text-xs font-semibold text-gray-400 hover:text-gray-100"
                  onClick={() => setShowPassword(prev => !prev)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button className="btn-primary w-full py-2.5 mt-1" onClick={submit} disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Sign In →'}
            </button>
          </div>

          <div className="mt-5 text-center text-xs text-gray-600 space-x-4">
            <Link to="/" className="hover:text-amber transition-colors">← Customer site</Link>
            <Link to="/superadmin" className="hover:text-gray-400 transition-colors">SuperAdmin</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
