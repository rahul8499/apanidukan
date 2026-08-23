import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StoreCartProvider } from '../context/StoreCartContext'
import api from '../services/api'
import { sendMsg91WidgetOtp, verifyMsg91WidgetOtp } from '../context/AuthContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import {
  ArrowLeft, Search, Clock, CheckCircle2,
  ChevronRight, MessageSquare, ShoppingBag, Truck, XCircle, Package,
  ShieldCheck, Lock, Smartphone, RefreshCw, KeyRound, LogOut, Phone
} from 'lucide-react'
import { getStoreTheme } from '../utils/storeTheme'
import StoreOfflinePage from './StoreOfflinePage'
import { isStoreOffline } from '../utils/storeStatus'

const mediaUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/api\/?$/, '')
  if (apiBase) {
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`
  }
  return url.startsWith('/') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url.startsWith('/') ? '' : '/'}${url}`
}

const getItemImageUrl = (item: any, productMap?: Record<string | number, any>) => {
  if (!item) return ''
  const pId = item.product_id || item.id || item.product || item.product?.id
  const matchedProd = productMap && pId ? productMap[pId] : null

  const raw = item.image || 
              item.product_image || 
              item.image_url || 
              item.primary_image || 
              item.product?.image || 
              item.product?.product_image || 
              item.product?.image_url || 
              item.product?.primary_image ||
              item.product_details?.image ||
              item.product_details?.primary_image ||
              matchedProd?.image ||
              matchedProd?.product_image ||
              matchedProd?.primary_image
  if (!raw) return ''
  return mediaUrl(raw)
}

export default function CustomerOrders() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return (
    <StoreCartProvider storeSlug={storeSlug}>
      <CustomerOrdersContent storeSlug={storeSlug} />
    </StoreCartProvider>
  )
}

function CustomerOrdersContent({ storeSlug }: { storeSlug: string }) {
  const [store, setStore] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [productMap, setProductMap] = useState<Record<string | number, any>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL')
  
  const [customerPhone, setCustomerPhone] = useState(() => 
    localStorage.getItem(`qs_customer_phone_${storeSlug}`) || localStorage.getItem(`qs_chat_phone`) || ''
  )
  const [isPhoneVerified, setIsPhoneVerified] = useState(() => 
    Boolean(localStorage.getItem(`qs_customer_phone_${storeSlug}`))
  )

  const [phoneInput, setPhoneInput] = useState(customerPhone)
  const [otpInput, setOtpInput] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [showPhoneSync, setShowPhoneSync] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [displayCount, setDisplayCount] = useState(10)
  const [storeOffline, setStoreOffline] = useState(false)

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )

  const fetchDynamicOrders = async (phoneToQuery?: string) => {
    const targetPhone = phoneToQuery || customerPhone
    if (!targetPhone) {
      setOrders([])
      return
    }

    setIsSyncing(true)
    try {
      const storeRes = await api.get(`/public/stores/${storeSlug}/`)
      setStore(storeRes.data.data || storeRes.data)
    } catch (error) {
      if (isStoreOffline(error)) {
        setStoreOffline(true)
      }
    }

    try {
      const prodRes = await api.get(`/public/stores/${storeSlug}/products/`)
      if (Array.isArray(prodRes.data)) {
        const map: Record<string | number, any> = {}
        prodRes.data.forEach((p: any) => {
          if (p.id) map[p.id] = p
        })
        setProductMap(map)
      }
    } catch { }

    try {
      const res = await api.get(`/public/stores/${storeSlug}/customer-orders/`, {
        params: { phone: targetPhone }
      })
      const liveOrders = Array.isArray(res.data) ? res.data : []
      setOrders(liveOrders)
    } catch {
      setOrders([])
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (customerPhone && isPhoneVerified) {
      fetchDynamicOrders(customerPhone)
    }
  }, [storeSlug, customerPhone, isPhoneVerified])

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleaned = phoneInput.trim().replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setOtpError('Please enter a valid 10-digit WhatsApp mobile number.')
      return
    }

    setOtpLoading(true)
    setOtpError('')
    try {
      await sendMsg91WidgetOtp(cleaned)
      await api.post(`/public/stores/${storeSlug}/checkout-phone/send-otp/`, { phone_number: cleaned })
      setOtpSent(true)
    } catch (err: any) {
      setOtpError(err?.response?.data?.detail || err?.message || 'Could not send OTP. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!otpInput.trim() || otpInput.trim().length < 4) {
      setOtpError('Please enter the valid OTP received on your mobile.')
      return
    }

    const cleanedPhone = phoneInput.trim().replace(/\D/g, '')
    setOtpLoading(true)
    setOtpError('')

    try {
      const accessToken = await verifyMsg91WidgetOtp(otpInput.trim())
      await api.post(`/public/stores/${storeSlug}/checkout-phone/verify-otp/`, {
        phone_number: cleanedPhone,
        access_token: accessToken
      })

      localStorage.setItem(`qs_customer_phone_${storeSlug}`, cleanedPhone)
      localStorage.setItem(`qs_chat_phone`, cleanedPhone)
      setCustomerPhone(cleanedPhone)
      setIsPhoneVerified(true)
      setOtpSent(false)
      setShowPhoneSync(false)
      fetchDynamicOrders(cleanedPhone)
    } catch (err: any) {
      setOtpError(err?.response?.data?.detail || 'Invalid or expired OTP. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleLogoutPhone = () => {
    localStorage.removeItem(`qs_customer_phone_${storeSlug}`)
    setCustomerPhone('')
    setIsPhoneVerified(false)
    setPhoneInput('')
    setOtpInput('')
    setOtpSent(false)
    setOrders([])
  }

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery.trim() || 
      order.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some((i: any) => i.name?.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (activeFilter === 'ACTIVE') return order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
    if (activeFilter === 'DELIVERED') return order.status === 'DELIVERED'
    if (activeFilter === 'CANCELLED') return order.status === 'CANCELLED'
    return true
  })

  const paginatedOrders = filteredOrders.slice(0, displayCount)

  const storeTheme = getStoreTheme(store)

  const getStatusDisplay = (status: string, createdAt: string) => {
    const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'
    switch (status) {
      case 'DELIVERED':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
          title: `Delivered on ${formattedDate}`,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        }
      case 'CANCELLED':
        return {
          icon: <XCircle className="h-4 w-4 text-rose-500 shrink-0" />,
          title: 'Cancelled',
          badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
        }
      case 'CONFIRMED':
        return {
          icon: <Truck className="h-4 w-4 text-sky-500 shrink-0 animate-bounce" />,
          title: 'Preparing & Packing',
          badgeBg: 'bg-sky-500/10 text-sky-600 border-sky-500/20'
        }
      default:
        return {
          icon: <Clock className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />,
          title: 'Order Placed & Processing',
          badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        }
    }
  }

  return (
    <div className={`mx-auto min-h-screen w-full ${storeTheme.page_bg_class} pb-32 text-xs sm:text-sm font-sans transition-colors duration-300`}>
      {storeOffline && <StoreOfflinePage />}
      {!storeOffline && (
        <>
          {/* RETAIL ADAPTIVE HEADER NAVBAR */}
          <header className={`sticky top-0 z-40 border-b shadow-md backdrop-blur-xl ${storeTheme.header_bg_class}`}>
            <div className="mx-auto flex max-w-4xl items-center justify-between px-3.5 py-2.5 sm:px-6">
              <div className="flex items-center gap-3">
                <Link
                  to={`/store/${storeSlug}`}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-current hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                  <p className="text-[9.5px] font-extrabold uppercase opacity-80 tracking-wider">
                    {store?.name || 'Store'}
                  </p>
                  <h1 className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                    <span>My Orders</span>
                    {isPhoneVerified && (
                      <span className="text-[10px] bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                      </span>
                    )}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPhoneVerified && (
                  <>
                    <button
                      onClick={() => fetchDynamicOrders(customerPhone)}
                      title="Refresh Live Orders from Database"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-current hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <span className={`text-xs ${isSyncing ? 'animate-spin' : ''}`}>↻</span>
                    </button>
                    <button
                      onClick={handleLogoutPhone}
                      title="Switch Mobile Account"
                      className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-current hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3 w-3" />
                      <span className="hidden sm:inline">Switch Phone</span>
                    </button>
                  </>
                )}
                <NotificationBellHeader />
              </div>
            </div>

            {/* VERIFIED PHONE STRIP */}
            {isPhoneVerified && customerPhone && (
              <div className="bg-emerald-900/30 border-t border-emerald-500/20 px-3.5 py-1.5 flex items-center justify-between text-xs text-emerald-200 font-medium">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Verified Customer Account: <strong>+91 {customerPhone}</strong></span>
                </div>
                <button
                  onClick={handleLogoutPhone}
                  className="text-[10.5px] font-black text-emerald-300 underline hover:text-white"
                >
                  Change
                </button>
              </div>
            )}

            {/* SEARCH & FILTER STRIP */}
            {isPhoneVerified && (
              <div className={`border-t px-3.5 py-2 ${storeTheme.sub_bar_bg_class}`}>
                <div className="mx-auto max-w-4xl space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-50" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search orders by Order ID or item..."
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 pl-9 pr-3 text-[11px] font-medium text-current placeholder-slate-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                    {[
                      { key: 'ALL', label: 'All Orders' },
                      { key: 'ACTIVE', label: 'In Progress' },
                      { key: 'DELIVERED', label: 'Delivered' },
                      { key: 'CANCELLED', label: 'Cancelled' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key as any)}
                        style={activeFilter === f.key ? { backgroundColor: storeTheme.primary_color } : undefined}
                        className={`rounded-lg px-3 py-1 text-[10.5px] font-black transition-all cursor-pointer whitespace-nowrap border ${
                          activeFilter === f.key
                            ? 'text-white border-transparent shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* MAIN CONTENT CONTAINER */}
          <main className="mx-auto max-w-4xl p-3 sm:p-5 space-y-3.5">
            {!isPhoneVerified ? (
              /* OTP MOBILE VERIFICATION CARD */
              <div className="my-6 max-w-md mx-auto">
                <div className={`rounded-3xl border ${storeTheme.card_bg_class} p-6 sm:p-8 text-center shadow-xl space-y-5 relative overflow-hidden`}>
                  
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
                    <ShieldCheck className="h-8 w-8" />
                  </div>

                  <div className="space-y-1.5">
                    <h2 className={`text-base sm:text-lg font-black ${storeTheme.text_primary_class}`}>
                      Verify Mobile Number
                    </h2>
                    <p className={`text-xs ${storeTheme.text_secondary_class} font-medium leading-relaxed`}>
                      Enter your 10-digit WhatsApp mobile number to verify and securely view your order history & tracking details.
                    </p>
                  </div>

                  {otpError && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-500 font-bold text-center">
                      {otpError}
                    </div>
                  )}

                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-3 pt-1">
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="Enter 10-digit WhatsApp Number"
                          maxLength={10}
                          className="w-full rounded-2xl bg-black/5 dark:bg-white/5 border border-current/15 py-3 pl-10 pr-4 text-xs font-bold text-current placeholder-current/40 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={otpLoading || phoneInput.length < 10}
                        className={`w-full rounded-2xl bg-gradient-to-r ${storeTheme.btn_gradient} text-white font-black py-3 text-xs shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2`}
                      >
                        {otpLoading ? (
                          <span>Sending Verification OTP...</span>
                        ) : (
                          <>
                            <Smartphone className="h-4 w-4" />
                            <span>Send Verification OTP</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-600 font-bold">
                        OTP sent to +91 {phoneInput}. Please enter below:
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Enter 6-digit OTP code"
                          maxLength={6}
                          className="w-full rounded-2xl bg-black/5 dark:bg-white/5 border border-current/15 py-3 pl-10 pr-4 text-xs font-bold tracking-widest text-center text-current placeholder-current/40 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={otpLoading || !otpInput.trim()}
                        className={`w-full rounded-2xl bg-gradient-to-r ${storeTheme.btn_gradient} text-white font-black py-3 text-xs shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2`}
                      >
                        {otpLoading ? (
                          <span>Verifying OTP...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Verify OTP & View Orders</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Change Phone Number
                      </button>
                    </form>
                  )}

                  <div className="pt-2">
                    <Link
                      to={`/store/${storeSlug}`}
                      className={`inline-flex items-center gap-2 rounded-2xl border border-current/20 bg-black/5 dark:bg-white/5 px-6 py-2 text-xs font-black ${storeTheme.text_primary_class} hover:bg-black/10 transition-all`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Back to Store Catalog</span>
                    </Link>
                  </div>

                </div>
              </div>
            ) : (
              /* ORDERS LISTING FOR VERIFIED USER */
              <>
        
        {/* EMPTY STATE OR LOADING */}
        {isSyncing && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-3 my-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-xs font-bold text-slate-500">Loading your orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="space-y-4 my-6">
            <div className={`rounded-3xl border ${storeTheme.card_bg_class} p-6 sm:p-8 text-center shadow-sm space-y-4`}>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-black/5 dark:bg-white/5 text-4xl shadow-inner border border-current/10">
                🛍️
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h2 className={`text-base sm:text-lg font-black ${storeTheme.text_primary_class}`}>
                  {orders.length === 0 ? 'No Orders Yet on this Device' : 'No Matching Orders'}
                </h2>
                <p className={`text-xs ${storeTheme.text_secondary_class} font-medium leading-relaxed`}>
                  {orders.length === 0
                    ? 'Your placed orders will appear here. Placed orders on another browser or phone? Sync using your phone number below!'
                    : 'Try searching with a different order ID or filter tab.'}
                </p>
              </div>

              {/* Phone sync inline box for mobile/PWA users */}
              <form onSubmit={handlePhoneSearchSubmit} className="max-w-md mx-auto pt-2">
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-current/10">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Enter WhatsApp Phone Number..."
                    className="flex-1 rounded-xl bg-transparent px-3 py-1.5 text-xs text-current font-bold placeholder-current/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className={`rounded-xl bg-gradient-to-r ${storeTheme.btn_gradient} text-white font-black px-4 py-2 text-xs shadow-md hover:scale-105 transition-all shrink-0 cursor-pointer flex items-center gap-1`}
                  >
                    <span>{isSyncing ? 'Syncing...' : 'Find My Orders'}</span>
                  </button>
                </div>
              </form>

              <div className="pt-2">
                <Link
                  to={`/store/${storeSlug}`}
                  className={`inline-flex items-center gap-2 rounded-2xl border border-current/20 bg-black/5 dark:bg-white/5 px-6 py-2.5 text-xs font-black ${storeTheme.text_primary_class} hover:bg-black/10 transition-all`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Explore Store</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* CLEAN ADAPTIVE RETAIL ORDER CARDS */
          <div className="space-y-3">
            {paginatedOrders.map((order) => {
              const statusInfo = getStatusDisplay(order.status, order.created_at)
              const itemsList = Array.isArray(order.items) ? order.items : []
              const firstItem = itemsList[0]

              return (
                <div
                  key={order.reference}
                  className={`group relative overflow-hidden rounded-2xl border ${storeTheme.card_bg_class} transition-all duration-200 shadow-sm hover:shadow-md`}
                >
                  {/* Card Header: Status Bar & Reference */}
                  <div className="flex items-center justify-between border-b border-current/10 px-3.5 py-2.5 bg-black/5 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      {statusInfo.icon}
                      <span className={`text-xs font-black ${storeTheme.text_primary_class}`}>
                        {statusInfo.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black opacity-80 bg-black/10 dark:bg-white/10 border border-current/20 px-2 py-0.5 rounded-md">
                        #{order.reference}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Items Preview & Pricing */}
                  <div className="p-3.5 sm:p-4 space-y-3">
                    
                    <div className="flex items-start gap-3">
                      {/* Product Thumbnail Gallery / Multi-Item Strip (LEFT SIDE) */}
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 shrink-0 max-w-[160px] sm:max-w-[220px]">
                        {itemsList.length > 0 ? (
                          itemsList.slice(0, 3).map((item: any, idx: number) => {
                            const imgUrl = getItemImageUrl(item, productMap)
                            return (
                              <div
                                key={idx}
                                className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-1 shadow-xs overflow-hidden group/img"
                              >
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={item.name || 'Product'}
                                    className="h-full w-full object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-105"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const parent = target.parentElement
                                      if (parent && !parent.querySelector('.img-fallback')) {
                                        const fallbackDiv = document.createElement('div')
                                        fallbackDiv.className = 'img-fallback flex flex-col items-center justify-center w-full h-full text-slate-400 text-base font-bold'
                                        fallbackDiv.innerText = '📦'
                                        parent.appendChild(fallbackDiv)
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-slate-400 gap-0.5">
                                    <Package className="h-6 w-6 text-indigo-500/70" />
                                    <span className="text-[8px] font-bold text-slate-400">Item</span>
                                  </div>
                                )}
                                {item.quantity > 1 && (
                                  <span className="absolute bottom-1 right-1 bg-slate-950/90 text-white font-black text-[9.5px] px-1.5 py-0.3 rounded-md shadow-xs ring-1 ring-white/20">
                                    x{item.quantity}
                                  </span>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shadow-xs">
                            <Package className="h-7 w-7 text-indigo-500/70" />
                          </div>
                        )}
                      </div>

                      {/* Items Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className={`text-xs sm:text-sm font-extrabold ${storeTheme.text_primary_class} truncate`}>
                          {itemsList.map((i: any) => i.name).filter(Boolean).join(', ') || `Order #${order.reference}`}
                        </h3>

                        {itemsList.length > 1 && (
                          <p className={`text-[11px] ${storeTheme.text_secondary_class} font-semibold`}>
                            +{itemsList.length - 1} more {itemsList.length - 1 === 1 ? 'item' : 'items'}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          <span className={`text-sm sm:text-base font-black ${storeTheme.text_primary_class}`}>
                            ₹{Number(order.total).toFixed(2)}
                          </span>
                          <span className={`text-[10px] font-bold ${storeTheme.text_secondary_class}`}>
                            • {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>

                      {/* Fulfillment Pill */}
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black border border-current/20 bg-black/5 dark:bg-white/5">
                          {order.order_type === 'STORE_PICKUP' ? '🏪 Pickup' : '🚚 Delivery'}
                        </span>
                      </div>
                    </div>

                    {/* Store Pickup / Delivery Note */}
                    {order.order_type === 'STORE_PICKUP' ? (
                      <p className="text-[10.5px] font-medium bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-amber-700 dark:text-amber-300">
                        📍 Collect at shop: <span className="font-bold">{store?.address || store?.name || 'Store Location'}</span>
                      </p>
                    ) : (
                      <p className="text-[10.5px] font-medium bg-sky-500/10 border border-sky-500/20 p-2 rounded-xl text-sky-800 dark:text-sky-300 flex items-center justify-between">
                        <span>⏱️ Est. Delivery in {store?.delivery_estimated_time || '30-45 mins'}</span>
                        <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(order.delivery_fee) > 0 ? `Fee: ₹${Number(order.delivery_fee).toFixed(0)}` : 'FREE Delivery'}
                        </span>
                      </p>
                    )}

                    {/* Actions Row */}
                    <div className="border-t border-current/10 pt-2.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('qs-open-chat'))}
                        className={`text-[11px] font-extrabold ${storeTheme.text_secondary_class} hover:${storeTheme.text_primary_class} flex items-center gap-1 cursor-pointer`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 opacity-70" />
                        <span>Need Help?</span>
                      </button>

                      <Link
                        to={`/store/${storeSlug}/order/${order.reference}?token=${order.tracking_token}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${storeTheme.btn_gradient} px-4 py-1.5 text-xs font-black text-white shadow-sm hover:opacity-95 active:scale-95 transition-all`}
                      >
                        <span>Track Order Live</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                  </div>

                </div>
              )
            })}

            {/* PAGINATION / LOAD MORE BUTTON */}
            {filteredOrders.length > displayCount && (
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setDisplayCount((prev) => prev + 10)}
                  className={`inline-flex items-center gap-1.5 rounded-2xl border ${storeTheme.card_border_class} bg-white dark:bg-slate-900 px-6 py-2 text-xs font-black ${storeTheme.text_primary_class} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                >
                  <span>Load More Orders (+{filteredOrders.length - displayCount} remaining)</span>
                </button>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </main>
      </>
      )}

      <CustomerBottomNav storeSlug={storeSlug!} active="orders" />
      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
