import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, KeyRound, Package, Phone, Store } from 'lucide-react'
import api from '../services/api'
import { sendMsg91WidgetOtp, verifyMsg91WidgetOtp } from '../context/AuthContext'

export default function CustomerOrdersHome() {
  const [phone, setPhone] = useState(localStorage.getItem('customer-orders-phone') || '')
  const [otp, setOtp] = useState('')
  const [token, setToken] = useState(localStorage.getItem('customer-orders-token') || '')
  const [otpSent, setOtpSent] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadOrders(customerToken = token) {
    if (!customerToken) return
    setLoading(true)
    try {
      const response = await api.get('/public/customer-orders/', { params: { customer_token: customerToken } })
      setOrders(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Orders load nahi ho paaye.')
      localStorage.removeItem('customer-orders-token')
      setToken('')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (token) loadOrders(token) }, [])

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault()
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) { setError('Valid 10-digit mobile number enter karein.'); return }
    setError('')
    try {
      await sendMsg91WidgetOtp(cleaned)
      setOtpSent(true)
    } catch (err: any) { setError(err?.message || 'OTP send nahi hua.') }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true); setError('')
    try {
      const accessToken = await verifyMsg91WidgetOtp(otp.trim())
      const response = await api.post('/public/customer-orders/verify-phone/', { phone_number: phone.replace(/\D/g, ''), access_token: accessToken })
      localStorage.setItem('customer-orders-phone', phone.replace(/\D/g, ''))
      localStorage.setItem('customer-orders-token', response.data.customer_token)
      setToken(response.data.customer_token)
      setOtpSent(false)
      await loadOrders(response.data.customer_token)
    } catch (err: any) { setError(err?.response?.data?.detail || 'OTP verify nahi hua.') }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center gap-3"><Link to="/customer-home" className="text-sm font-black text-indigo-700">Back</Link><h1 className="text-2xl font-black">My Orders</h1></header>
        {!token ? (
          <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 text-center"><Package className="mx-auto h-10 w-10 text-indigo-600" /><h2 className="mt-3 text-lg font-black">View your orders</h2><p className="mt-1 text-sm text-slate-500">OTP verify karke sirf apne orders dekhein.</p></div>
            {!otpSent ? <form onSubmit={sendOtp} className="space-y-3"><div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} type="tel" placeholder="10-digit mobile number" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm" /></div><button className="w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white">Send OTP</button></form> : <form onSubmit={verifyOtp} className="space-y-3"><div className="relative"><KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} placeholder="Enter OTP" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm" /></div><button disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white">{loading ? 'Verifying...' : 'Verify & View Orders'}</button></form>}
            {error && <p className="mt-3 text-center text-xs font-bold text-rose-600">{error}</p>}
          </section>
        ) : <section className="space-y-3">{orders.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500">No orders found for this mobile number.</div>}{orders.map(order => <Link key={order.reference} to={`/s/${order.store_slug}/order/${order.reference}?token=${order.tracking_token}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Store className="h-4 w-4 text-indigo-600" /><span className="font-black">{order.store_name}</span></div><span className="text-xs font-black text-slate-500">#{order.reference}</span></div><div className="mt-3 flex items-center justify-between text-sm"><span>₹{Number(order.total).toFixed(2)}</span><span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{order.status}</span></div></Link>)}</section>}
      </div>
    </main>
  )
}