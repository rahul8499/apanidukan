import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

type User = { id: number; email: string; first_name?: string; last_name?: string; is_staff?: boolean }

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (data: any) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: any }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/auth/me/').then(res => setUser(res.data.data || res.data)).catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        delete api.defaults.headers.common['Authorization']
        setUser(null)
      })
    } else {
      setUser(null)
    }
  }, [])

  async function login(email: string, password: string): Promise<User> {
    const res = await api.post('/auth/login/', { email, password })
    const { access, refresh } = res.data
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`
    const me = await api.get('/auth/me/')
    const user = me.data.data || me.data
    setUser(user)
    return user
  }

  async function register(data: any) {
    await api.post('/auth/register/', data)
    await login(data.email, data.password)
  }

  function logout() {
    const refresh = localStorage.getItem('refresh_token')
    if (refresh) api.post('/auth/logout/', { refresh }).catch(() => { })
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
