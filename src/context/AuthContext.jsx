import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await authAPI.getProfile()
      setUser(data)
      return data
    } catch (err) {
      if (err.response?.status === 401) {
        const refreshed = await tryRefreshToken()
        if (refreshed) {
          try {
            const { data } = await authAPI.getProfile()
            setUser(data); return data
          } catch { clearTokens() }
        } else { clearTokens() }
      } else { clearTokens() }
      return null
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) fetchProfile()
    else setLoading(false)
  }, [])

  async function tryRefreshToken() {
    const refresh = localStorage.getItem('refresh')
    if (!refresh) return false
    try {
      const { data } = await authAPI.refreshToken({ refresh })
      localStorage.setItem('token', data.access)
      if (data.refresh) localStorage.setItem('refresh', data.refresh)
      return true
    } catch { clearTokens(); return false }
  }

  function clearTokens() {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    setUser(null)
  }

  async function login(email, password) {
    const { data } = await authAPI.login({ email, password })
    const access  = data.tokens?.access  || data.access
    const refresh = data.tokens?.refresh || data.refresh
    localStorage.setItem('token', access)
    if (refresh) localStorage.setItem('refresh', refresh)
    await fetchProfile()
    return data
  }

  async function register(formData) {
    const { data } = await authAPI.register(formData)
    const access  = data.tokens?.access  || data.access
    const refresh = data.tokens?.refresh || data.refresh
    if (access) {
      localStorage.setItem('token', access)
      if (refresh) localStorage.setItem('refresh', refresh)
      await fetchProfile()
    }
    return data
  }

  async function logout() {
    try { await authAPI.logout({ refresh: localStorage.getItem('refresh') }) } catch {}
    clearTokens()
  }

  async function updateUser(data) {
    const res = await authAPI.updateProfile(data)
    if (res.data?.email) setUser(res.data)
    else if (res.data?.user) setUser(res.data.user)
    else await fetchProfile()
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refetch: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
