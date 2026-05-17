import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { auth, refreshToken, clearToken, setToken } from '../api/client'
import type { User } from '../types'

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ accessToken: string; user: User }>
  superAdminLogin:(username: string, password: string) => Promise<void>
  logout:         () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate session on load
  useEffect(() => {
    refreshToken()
      .then(() => auth.getMe())
      .then(d => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const data = await auth.login(email, password)
    setToken(data.accessToken)
    setUser(data.user)
    return data
  }

  const superAdminLogin = async (username: string, password: string) => {
    const data = await auth.superAdminLogin(username, password)
    setToken(data.accessToken)
    setUser(data.user)
  }

  const logout = async () => {
    try { await auth.logout() } catch { /* ignore */ }
    clearToken()
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, loading, login, superAdminLogin, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

// Helpers
export const isAdmin      = (u: User | null) => !!u && ['admin', 'superadmin'].includes(u.role)
export const isManager   = (u: User | null) => u?.role === 'manager'
export const isSuperAdmin = (u: User | null) => u?.role === 'superadmin'
export const isEmployee   = (u: User | null) => u?.role === 'employee'

export const defaultRoute = (u: User | null): string => {
  if (!u) return '/login'
  if (u.role === 'employee') return '/portal/dashboard'
  if (u.role === 'manager') return '/manager/dashboard'
  return '/admin/dashboard'
}
