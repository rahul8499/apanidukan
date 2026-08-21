import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

export type User = {
  id: number;
  email: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (data: any) => Promise<void>
  logout: () => void
  sendOTP: (phone_number: string) => Promise<{ success: boolean; message: string; user_exists: boolean; phone_number: string }>
  verifyOTP: (phone_number: string, otp: string, access_token?: string) => Promise<{ is_new_user: boolean; user?: User }>
  registerWithOTP: (data: { phone_number: string; otp?: string; first_name: string; last_name: string; store_name: string; category?: string; email?: string }) => Promise<User>
}

declare global {
  interface Window {
    initSendOTP?: (configuration: Record<string, unknown>) => void
    sendOtp?: (identifier: string, success?: (data: any) => void, failure?: (error: any) => void) => void
    verifyOtp?: (otp: string, success?: (data: any) => void, failure?: (error: any) => void) => void
  }
}

const MSG91_WIDGET_ID = (import.meta as any).env?.VITE_MSG91_WIDGET_ID
const MSG91_WIDGET_TOKEN = (import.meta as any).env?.VITE_MSG91_WIDGET_TOKEN
let msg91Ready: Promise<void> | null = null

function msg91Error(error: any): Error {
  return new Error(error?.message || error?.error || 'MSG91 OTP service is unavailable. Please try again.')
}

function ensureMsg91Widget(): Promise<void> {
  if (msg91Ready) return msg91Ready
  if (!MSG91_WIDGET_ID || !MSG91_WIDGET_TOKEN) {
    return Promise.reject(new Error('MSG91 Web Widget is not configured. Add VITE_MSG91_WIDGET_ID and VITE_MSG91_WIDGET_TOKEN to frontend environment.'))
  }
  msg91Ready = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://verify.msg91.com/otp-provider.js'
    script.async = true
    script.onload = () => {
      if (!window.initSendOTP) return reject(new Error('MSG91 Web Widget failed to load.'))
      let captchaContainer = document.getElementById('msg91-captcha')
      if (!captchaContainer) {
        captchaContainer = document.createElement('div')
        captchaContainer.id = 'msg91-captcha'
        captchaContainer.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:calc(100vw - 32px)'
        document.body.appendChild(captchaContainer)
      }
      window.initSendOTP({
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_WIDGET_TOKEN,
        exposeMethods: true,
        captchaRenderId: 'msg91-captcha',
        success: () => undefined,
        failure: () => undefined,
      })
      const startedAt = Date.now()
      const waitForMethods = () => {
        if (window.sendOtp && window.verifyOtp) return resolve()
        if (Date.now() - startedAt > 5000) {
          return reject(new Error('MSG91 Web Widget loaded but did not expose OTP methods. Confirm this is a Web Custom UI widget with Expose Methods enabled.'))
        }
        window.setTimeout(waitForMethods, 100)
      }
      waitForMethods()
    }
    script.onerror = () => reject(new Error('Could not load MSG91 Web Widget. Check internet connection.'))
    document.head.appendChild(script)
  })
  return msg91Ready
}

export async function sendMsg91WidgetOtp(phoneNumber: string) {
  await ensureMsg91Widget()
  await new Promise<void>((resolve, reject) => {
    if (!window.sendOtp) return reject(new Error('MSG91 sendOtp is unavailable.'))
    window.sendOtp('91' + phoneNumber.replace(/\D/g, '').slice(-10), () => resolve(), (error: any) => reject(msg91Error(error)))
  })
}

export async function verifyMsg91WidgetOtp(otp: string): Promise<string> {
  await ensureMsg91Widget()
  const token = await new Promise<string>((resolve, reject) => {
    if (!window.verifyOtp) return reject(new Error('MSG91 verifyOtp is unavailable.'))
    window.verifyOtp(otp, (data: any) => resolve(data?.accessToken || data?.access_token || data?.token || data?.message || data?.data?.accessToken || data?.data?.message || ''), (error: any) => reject(msg91Error(error)))
  })
  if (!token) throw new Error('MSG91 did not return a verification token.')
  return token
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
    const userObj = me.data.data || me.data
    setUser(userObj)
    return userObj
  }

  async function sendOTP(phone_number: string) {
    await sendMsg91WidgetOtp(phone_number)
    const exists = await api.post('/auth/otp/send/', { phone_number, provider_only: true })
    return { success: true, message: 'OTP sent to your mobile number.', phone_number, user_exists: Boolean(exists.data.user_exists) }
  }

  async function verifyOTP(phone_number: string, otp: string, access_token?: string) {
    const verifiedToken = access_token || await verifyMsg91WidgetOtp(otp)
    if (!verifiedToken) throw new Error('MSG91 did not return a verification token.')
    const res = await api.post('/auth/otp/verify/', { phone_number, otp: '', access_token: verifiedToken })
    const data = res.data
    if (!data.is_new_user && data.access) {
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`
      const userObj = data.user
      setUser(userObj)
      return { is_new_user: false, user: userObj }
    }
    return { is_new_user: true }
  }

  async function registerWithOTP(data: { phone_number: string; otp?: string; first_name: string; last_name: string; store_name: string; category?: string; email?: string }): Promise<User> {
    const res = await api.post('/auth/otp/register-complete/', data)
    const resData = res.data
    const { access, refresh, user: userObj } = resData
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`
    setUser(userObj)
    return userObj
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

  return (
    <AuthContext.Provider value={{ user, login, register, logout, sendOTP, verifyOTP, registerWithOTP }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
