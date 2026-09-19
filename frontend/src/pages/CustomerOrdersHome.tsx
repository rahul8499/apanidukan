import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  KeyRound,
  LogOut,
  Package,
  Phone,
  RotateCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react'
import api from '../services/api'
import { sendMsg91WidgetOtp, verifyMsg91WidgetOtp } from '../context/AuthContext'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'

type OrderFilter = 'all' | 'active' | 'completed'

export default function CustomerOrdersHome() {
  const [phone, setPhone] = useState(localStorage.getItem('customer-orders-phone') || '')
  const [otp, setOtp] = useState('')
  const [token, setToken] = useState(localStorage.getItem('customer-orders-token') || '')
  const [otpSent, setOtpSent] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [resendTimer, setResendTimer] = useState(0)

  // Resend OTP countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  async function loadOrders(customerToken = token) {
    if (!customerToken) return
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/public/customer-orders/', {
        params: { customer_token: customerToken },
      })
      const fetched = Array.isArray(response.data) ? response.data : response.data?.results || []
      setOrders(fetched)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Orders load nahi ho paaye. Please retry karein.')
      if (err?.response?.status === 401) {
        localStorage.removeItem('customer-orders-token')
        setToken('')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadOrders(token)
    }
  }, [])

  async function handleSendOtp(event?: React.FormEvent) {
    if (event) event.preventDefault()
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setError('Kripya valid 10-digit mobile number enter karein.')
      return
    }
    setError('')
    setSendingOtp(true)
    try {
      await sendMsg91WidgetOtp(cleaned)
      setOtpSent(true)
      setResendTimer(30)
    } catch (err: any) {
      setError(err?.message || 'OTP bhejne me dikkat aayi. Please dobara try karein.')
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault()
    if (!otp.trim()) {
      setError('Kripya OTP enter karein.')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const cleaned = phone.replace(/\D/g, '')
      const accessToken = await verifyMsg91WidgetOtp(otp.trim())
      const response = await api.post('/public/customer-orders/verify-phone/', {
        phone_number: cleaned,
        access_token: accessToken,
      })
      const newToken = response.data.customer_token
      localStorage.setItem('customer-orders-phone', cleaned)
      localStorage.setItem('customer-orders-token', newToken)
      setToken(newToken)
      setOtpSent(false)
      setOtp('')
      await loadOrders(newToken)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Galat OTP enter kiya hai. Kripya check karein.')
    } finally {
      setVerifying(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('customer-orders-phone')
    localStorage.removeItem('customer-orders-token')
    setToken('')
    setOrders([])
    setOtpSent(false)
    setOtp('')
    setError('')
  }

  function formatOrderDate(dateStr?: string) {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return dateStr
    }
  }

  function getStatusInfo(status: string) {
    const s = (status || '').toLowerCase()
    if (s === 'delivered') {
      return {
        label: 'Delivered',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        icon: CheckCircle2,
      }
    }
    if (s === 'cancelled') {
      return {
        label: 'Cancelled',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        icon: AlertCircle,
      }
    }
    if (['confirmed', 'paid', 'preparing', 'in_transit'].includes(s)) {
      return {
        label: s.replace('_', ' ').toUpperCase(),
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        icon: Truck,
      }
    }
    return {
      label: s ? s.replace('_', ' ').toUpperCase() : 'PENDING',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80',
      icon: Clock,
    }
  }

  const filteredOrders = useMemo(() => {
    if (filter === 'active') {
      return orders.filter((o) => {
        const s = (o.status || '').toLowerCase()
        return !['delivered', 'cancelled'].includes(s)
      })
    }
    if (filter === 'completed') {
      return orders.filter((o) => {
        const s = (o.status || '').toLowerCase()
        return ['delivered', 'cancelled'].includes(s)
      })
    }
    return orders
  }, [orders, filter])

  const activeCount = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || '').toLowerCase()
      return !['delivered', 'cancelled'].includes(s)
    }).length
  }, [orders])

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-16 sm:pt-18 pb-24 text-slate-900">
      <CustomerAppHeader subtitle="Your orders" />

      <div className="mx-auto max-w-4xl px-3.5 py-3 sm:px-6 sm:py-5">
        {/* Harmonious Apani Dukan Brand Banner */}
        <div className="relative mb-5 overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-4 sm:p-5 text-white shadow-md shadow-orange-500/20">
          {/* Subtle Ambient Highlights */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-amber-300/20 blur-xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-xs shadow-xs">
                <Package className="h-6 w-6 text-white" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    <Sparkles className="h-2.5 w-2.5" />
                    Order Centre
                  </span>
                </div>
                <h1 className="mt-0.5 text-lg sm:text-xl font-black text-white leading-tight">
                  My Orders
                </h1>
                <p className="text-xs text-orange-100/90 leading-tight">
                  Track purchases, live status & receipts across all stores.
                </p>
              </div>
            </div>

            {token && phone && (
              <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl bg-black/15 px-2.5 py-1.5 text-xs ring-1 ring-white/20 backdrop-blur-xs">
                <span className="font-bold text-white/90">📱 +91 {phone}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-black text-white hover:bg-white/30 transition cursor-pointer"
                  title="Switch mobile number"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        </div>

        {/* State 1: Unauthenticated - Sleek OTP Verification Card */}
        {!token ? (
          <section className="mx-auto max-w-md rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs sm:shadow-sm">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-md shadow-orange-500/20 ring-4 ring-orange-50">
                <Package className="h-7 w-7" />
              </div>
              <h2 className="mt-3.5 text-lg font-black text-slate-900">
                View & Track Your Orders
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Apne mobile number se login karke sabhi stores ke orders track karein.
              </p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Mobile Number
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200/90 bg-white shadow-2xs focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200/60 transition">
                    <span className="flex items-center gap-1.5 border-r border-slate-200 bg-slate-50/80 px-3.5 py-3 text-xs font-black text-slate-700 rounded-l-2xl shrink-0">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      type="tel"
                      inputMode="numeric"
                      placeholder="10-digit mobile number"
                      className="w-full bg-transparent py-3 px-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp || phone.replace(/\D/g, '').length !== 10}
                  className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 py-3.5 text-xs sm:text-sm font-black text-white shadow-md shadow-orange-500/25 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sendingOtp ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
                {/* Active Phone Display with Edit */}
                <div className="flex items-center justify-between rounded-xl bg-orange-50/80 p-2.5 border border-orange-200/60 text-xs">
                  <span className="font-bold text-slate-700">
                    OTP sent to <strong>+91 {phone}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false)
                      setOtp('')
                      setError('')
                    }}
                    className="font-black text-orange-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Enter 6-Digit OTP
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      autoFocus
                      type="text"
                      placeholder="••••••"
                      className="w-full rounded-2xl border border-slate-200/90 py-3 pl-10 pr-3 text-center text-lg font-black tracking-[0.4em] text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200/60 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifying || otp.trim().length === 0}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 py-3.5 text-xs sm:text-sm font-black text-white shadow-md shadow-emerald-500/25 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verify & View Orders</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Didn't receive code?</span>
                  {resendTimer > 0 ? (
                    <span className="font-bold text-slate-400">Resend in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={sendingOtp}
                      className="font-black text-orange-600 hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-700 border border-rose-200/70">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>100% Safe & Secure · Direct store tracking</span>
            </div>
          </section>
        ) : (
          /* State 2: Authenticated - Order List with Filters & Modern Cards */
          <div className="space-y-4">
            {/* Top Toolbar: Filter Tabs & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 rounded-2xl bg-white p-1 shadow-2xs border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                    filter === 'all'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('active')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                    filter === 'active'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('completed')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                    filter === 'completed'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Completed ({orders.length - activeCount})
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => loadOrders(token)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600 shadow-2xs transition cursor-pointer"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:border-rose-200 shadow-2xs transition cursor-pointer"
                  title="Sign out of orders"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200/70">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Empty State */}
            {filteredOrders.length === 0 && !loading && (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <h3 className="mt-3.5 text-base font-black text-slate-900">
                  {filter === 'all'
                    ? 'Abhi tak koi orders nahi hain'
                    : filter === 'active'
                    ? 'Koi active order nahi hai'
                    : 'Koi completed order nahi hai'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {filter === 'all'
                    ? `Aapne mobile number +91 ${phone} se abhi tak koi purchase nahi kiya hai.`
                    : 'Aapke sabhi orders complete ya deliver ho chuke hain.'}
                </p>
                <Link
                  to="/customer-stores"
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700 transition active:scale-95"
                >
                  <span>Explore Nearby Stores</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Orders List */}
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const statusInfo = getStatusInfo(order.status)
                const StatusIcon = statusInfo.icon
                const trackingLink = `/s/${order.store_slug}/order/${order.reference}?token=${order.tracking_token}`

                // Preview items if available
                let itemsSummary = ''
                if (Array.isArray(order.items) && order.items.length > 0) {
                  const names = order.items.map((it: any) => {
                    const name = it.name || it.product_name || it.title || 'Item'
                    const qty = it.quantity || it.qty
                    return qty ? `${name} × ${qty}` : name
                  })
                  itemsSummary =
                    names.slice(0, 2).join(', ') +
                    (names.length > 2 ? ` +${names.length - 2} more` : '')
                }

                return (
                  <div
                    key={order.reference || order.id}
                    className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-md hover:border-orange-200 transition-all duration-200"
                  >
                    {/* Top Row: Store Info & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/s/${order.store_slug}`}
                        className="flex items-center gap-2.5 min-w-0 group/store"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover/store:bg-orange-100 transition">
                          <Store className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-black text-slate-900 group-hover/store:text-orange-600 transition">
                            {order.store_name}
                          </h4>
                          <span className="block text-[11px] font-medium text-slate-400">
                            {formatOrderDate(order.created_at)}
                          </span>
                        </div>
                      </Link>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shrink-0 ${statusInfo.badgeClass}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>

                    {/* Middle Info: Reference & Items */}
                    <div className="mt-3 rounded-xl bg-slate-50/70 p-2.5 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-600 font-bold">
                        <span>Order #{order.reference}</span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black text-slate-500 border border-slate-200/60 uppercase">
                          {order.order_type === 'pickup' ? '🛍️ Store Pickup' : '🛵 Home Delivery'}
                        </span>
                      </div>
                      {itemsSummary && (
                        <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500">
                          {itemsSummary}
                        </p>
                      )}
                    </div>

                    {/* Bottom Row: Price & Track Link */}
                    <div className="mt-3 flex items-center justify-between pt-1">
                      <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 leading-none">
                          Total Amount
                        </span>
                        <strong className="text-base font-black text-slate-900 leading-tight">
                          ₹{Number(order.total || 0).toFixed(2)}
                        </strong>
                      </div>

                      <Link
                        to={trackingLink}
                        className="inline-flex items-center gap-1 rounded-xl bg-orange-50 hover:bg-orange-100 px-3.5 py-2 text-xs font-black text-orange-600 transition active:scale-95 cursor-pointer"
                      >
                        <span>Track Order</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <CustomerAppBottomNav active="orders" />
    </main>
  )
}
