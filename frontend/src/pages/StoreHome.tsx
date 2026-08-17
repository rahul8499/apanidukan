import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Menu, Search, ShoppingBag, Sparkles, PackageCheck, MessageCircle, X, ChevronRight,
  ShieldCheck, Home, Plus, Minus, Star, MapPin, Zap, TrendingUp, Tag
} from 'lucide-react'
import api from '../services/api'
import InstallAppButton from '../pwa/InstallAppButton'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import AiAssistantWidget from '../components/AiAssistantWidget'
import AiSearchModal from '../components/AiSearchModal'
import { useNotifications } from '../context/NotificationContext'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function StoreHome() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return <StoreCartProvider storeSlug={storeSlug}><Storefront /></StoreCartProvider>
}

function Storefront() {
  const { storeSlug } = useParams()
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestPhone, setRequestPhone] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [aiSearchOpen, setAiSearchOpen] = useState(false)
  const [aiSearchProducts, setAiSearchProducts] = useState<any[] | null>(null)
  const [aiSearchQuery, setAiSearchQuery] = useState('')

  // Flipkart / Amazon style Delivery Location State
  const [userLocation, setUserLocation] = useState(() => localStorage.getItem('multistore_user_delivery_address') || '')
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [detectingGps, setDetectingGps] = useState(false)
  const [locationError, setLocationError] = useState('')

  function detectGpsLocation() {
    if (!navigator.geolocation) {
      setLocationError('GPS is not supported by your browser.')
      return
    }
    setLocationError('')
    setDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
          const place = await response.json()
          const fullAddr = place.display_name || `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          localStorage.setItem('multistore_user_delivery_address', fullAddr)
          setUserLocation(fullAddr)
          setLocationModalOpen(false)
        } catch {
          const fallback = `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          localStorage.setItem('multistore_user_delivery_address', fallback)
          setUserLocation(fallback)
          setLocationModalOpen(false)
        } finally {
          setDetectingGps(false)
        }
      },
      () => {
        setDetectingGps(false)
        setLocationError('Could not detect location. Please enter pincode or address manually.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function playCustomerChime() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch { }
  }

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!storeSlug) return
    setLoading(true)
    api.get(`/public/stores/${storeSlug}/`)
      .then(res => {
        const data = res.data.data || res.data
        setStore(data)
      })
      .catch((error) => {
        setLoadError(error?.response?.status === 404 ? 'This store is currently set to Draft mode by the seller. The seller needs to turn ON the 🟢 LIVE toggle switch in their dashboard.' : 'Store could not be opened. Please check your network connection.')
      })
      .finally(() => {
        setLoading(false)
      })

    api.get(`/public/stores/${storeSlug}/products/`).then(res => setProducts(res.data)).catch(() => { })
    api.get(`/public/stores/${storeSlug}/categories/`).then(res => setCategories(res.data)).catch(() => { })
    api.get(`/public/stores/${storeSlug}/coupons/`).then(res => setStoreCoupons(Array.isArray(res.data) ? res.data : [])).catch(() => { })
  }, [storeSlug])

  const [storeCoupons, setStoreCoupons] = useState<any[]>([])
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)

  const storeWideCoupon = useMemo(() => {
    return storeCoupons.find((c: any) => !c.product_id)
  }, [storeCoupons])

  useEffect(() => {
    if (storeWideCoupon) {
      const timer = setTimeout(() => setShowOfferModal(true), 400)
      return () => clearTimeout(timer)
    }
  }, [storeWideCoupon])

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 2500)
  }

  const dismissOfferModal = () => {
    setShowOfferModal(false)
  }

  // Customer Real-Time Notification Center State
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; time: string; read: boolean; action?: () => void }[]>([
    {
      id: 'welcome',
      title: '🔔 Store Notifications Active',
      body: `Welcome to store! You will receive real-time alerts for new arrivals, offers & chat replies.`,
      time: 'Just now',
      read: false
    }
  ])
  const [showNotifPopup, setShowNotifPopup] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  async function requestCustomerNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotificationPermission(perm)
      if (perm === 'granted') {
        new Notification('🔔 Notifications Enabled!', {
          body: `You will get real-time alerts for new products & seller chat replies.`,
          icon: '/icons/multistore-icon.svg'
        })
      }
    }
  }

  function testCustomerPushNotification() {
    playCustomerChime()
    const testNotif = {
      id: String(Date.now()),
      title: '🎁 Test Store Offer Notification!',
      body: 'Special Discount: Get 15% OFF on all new arrivals today!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }
    setNotifications(prev => [testNotif, ...prev])
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(testNotif.title, {
        body: testNotif.body,
        icon: '/icons/multistore-icon.svg'
      })
    } else {
      requestCustomerNotificationPermission()
    }
  }

  const { addNotification } = useNotifications()

  // Real-time WebSocket connection for New Product / Offer Arrival notifications
  useEffect(() => {
    if (!store?.id) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/store/${store.id}/`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_product_added' && data.product) {
            playCustomerChime()
            api.get(`/public/stores/${storeSlug}/products/`).then(res => setProducts(res.data)).catch(() => { })
            addNotification({
              type: 'product',
              title: `🎁 New Arrival: ${data.product.name}`,
              body: `Now available in store for ₹${data.product.price}!`,
              link: `/store/${storeSlug}/product/${data.product.slug}`
            })
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(`🎁 New Arrival in Store!`, {
                    body: `${data.product.name} is now available for ₹${data.product.price}!`,
                    icon: '/icons/multistore-icon.svg',
                    badge: '/icons/multistore-icon.svg',
                    vibrate: [150, 100, 150]
                  } as any)
                }).catch(() => {
                  new Notification(`🎁 New Arrival in Store!`, { body: `${data.product.name} - ₹${data.product.price}`, icon: '/icons/multistore-icon.svg' })
                })
              } else {
                new Notification(`🎁 New Arrival in Store!`, { body: `${data.product.name} - ₹${data.product.price}`, icon: '/icons/multistore-icon.svg' })
              }
            }
          }
        } catch { }
      }
    } catch { }
    return () => { socket?.close() }
  }, [store?.id, storeSlug, addNotification])

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = searchTerm.trim()
      if (term.length >= 2 && storeSlug) {
        api.post(`/public/stores/${storeSlug}/record-search/`, { query: term }).catch(() => { })
      }
    }, 1000)
    return () => clearTimeout(handler)
  }, [searchTerm, storeSlug])

  const visibleProducts = aiSearchProducts || (activeCategory ? products.filter(p => p.category?.slug === activeCategory) : products).filter(p => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return [p.name, p.description, p.short_description, p.category?.name].filter(Boolean).join(' ').toLowerCase().includes(q)
  })
  const mediaUrl = (url: string) => url?.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`
  const cart = useStoreCart()

  const submitProductRequest = async () => {
    const trimmedName = requestName.trim()
    const trimmedPhone = requestPhone.trim()
    const requestedItem = searchTerm.trim() || 'Product'

    if (!trimmedName || !trimmedPhone) {
      alert('Please enter your name and phone number before sending the request.')
      return
    }

    const sellerNumber = String(store?.phone_number || '').replace(/\D/g, '')

    try {
      let sid = localStorage.getItem(`qs_chat_session_${storeSlug}`)
      if (!sid) {
        sid = 'cust_' + Math.random().toString(36).substring(2, 11)
        localStorage.setItem(`qs_chat_session_${storeSlug}`, sid)
      }

      await api.post(`/public/stores/${storeSlug}/chat/auto-reply/`, {
        session_id: sid,
        product_name: requestedItem,
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        message: requestMessage.trim() || 'Hello, I want to request this product.'
      })
    } catch (err) {
      console.error('Failed to send auto-reply', err)
    }

    if (!sellerNumber) {
      alert('This seller has not added a WhatsApp number yet. Please contact them directly.')
      setRequestOpen(false)
      setRequestName('')
      setRequestPhone('')
      setRequestMessage('')
      return
    }

    const text = `Hello ${store?.name || 'Seller'}, I want to request this product: ${requestedItem}. My name is ${trimmedName}. My phone number is ${trimmedPhone}. ${requestMessage.trim() ? `Message: ${requestMessage.trim()}` : ''}`
    window.open(`https://wa.me/${sellerNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')

    setRequestOpen(false)
    setRequestName('')
    setRequestPhone('')
    setRequestMessage('')
    setSearchTerm(requestedItem)
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-32 lg:max-w-none lg:w-full">
      {loading ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-8 text-white shadow-2xl border border-slate-800 space-y-4 animate-pulse">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 mx-auto" />
            <div className="h-4 w-32 bg-slate-800 rounded mx-auto" />
            <div className="h-3 w-48 bg-slate-800/60 rounded mx-auto" />
            <div className="pt-4 flex gap-2 justify-center">
              <div className="h-10 w-24 bg-slate-800 rounded-xl" />
              <div className="h-10 w-24 bg-slate-800 rounded-xl" />
            </div>
          </div>
        </div>
      ) : !store ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-white shadow-2xl border border-slate-800 space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mx-auto text-2xl">
              🏪
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">Store Temporarily Offline</h2>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {loadError || 'Dukaan filhal temporary maintenance & stock update ke liye offline hai. Naye orders pause hain.'}
              </p>
            </div>

            {/* Reassurance Alert Box */}
            <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-3.5 text-left text-xs text-emerald-200 space-y-1">
              <p className="font-black text-emerald-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Pehle se kiye gaye Orders Safe Hain!</span>
              </p>
              <p className="text-[11px] text-emerald-200/90 leading-snug">
                Agar aapne is store par order diya hai, toh seller dwara aapka order normally process ho raha hai.
              </p>
            </div>

            <Link
              to="/orders/track"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-500 transition-all shadow-md"
            >
              <span>🔍 Track Existing Order</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Top Golden Platform/Store Offer Announcement Ticker Bar */}
          {storeWideCoupon && (
            <div className="relative z-50 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-2 text-slate-950 font-black text-xs shadow-md border-b border-amber-300 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2 min-w-0 mx-auto">
                <Sparkles className="h-4 w-4 shrink-0 text-slate-950 animate-bounce" />
                <span className="truncate">
                  🎉 TODAY'S SPECIAL OFFER: Get{' '}
                  <strong className="underline decoration-slate-900">
                    {storeWideCoupon.discount_type === 'PERCENTAGE'
                      ? `${storeWideCoupon.discount_value}% OFF`
                      : `FLAT ₹${storeWideCoupon.discount_value} OFF`}
                  </strong>{' '}
                  on all items! Code:{' '}
                  <span className="font-mono bg-slate-950 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-400/40">
                    {storeWideCoupon.code}
                  </span>
                </span>
                <button
                  onClick={() => copyCouponCode(storeWideCoupon.code)}
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-0.5 text-[10px] font-black text-amber-300 hover:bg-slate-900 transition-all cursor-pointer shrink-0"
                >
                  <Tag className="h-3 w-3 text-amber-400" />
                  <span>{copiedToast ? 'COPIED!' : 'COPY CODE'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ULTRA-PREMIUM CUSTOMER HEADER (STICKY NAVBAR FOR WEB & ANDROID PWA)       */}
          {/* ========================================================================= */}
          <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl transition-all">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              
              {/* Left Group: Hamburger Menu + Store Branding */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Open Navigation Menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Store Avatar & Monogram */}
                <Link to={`/store/${storeSlug}`} className="group flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {store.logo ? (
                      <img
                        src={mediaUrl(store.logo)}
                        alt={store.name}
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-md group-hover:scale-105 transition-all"
                      />
                    ) : (
                      <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 font-black text-white text-base shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
                        {store.name[0]?.toUpperCase()}
                      </span>
                    )}
                    {/* Live Online Dot Badge */}
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950 p-0.5">
                      <span className="h-full w-full rounded-full bg-emerald-500 animate-pulse" />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h1 className="truncate text-base sm:text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                        {store.name}
                      </h1>
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" title="Verified Seller" />
                    </div>
                    <p className="flex items-center gap-1 truncate text-[11px] font-medium text-slate-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{store.description || 'Instant Delivery Store'}</span>
                    </p>
                  </div>
                </Link>
              </div>

              {/* Center Group (Desktop View): Integrated Search Bar */}
              <div className="hidden lg:flex flex-1 max-w-md mx-4">
                <div className="relative w-full flex items-center">
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      if (aiSearchProducts) setAiSearchProducts(null)
                    }}
                    placeholder="Search medicines, products, categories..."
                    className="w-full rounded-2xl bg-slate-900/90 py-2 pl-10 pr-20 text-xs text-white placeholder-slate-400 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-14 text-slate-400 hover:text-white p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setAiSearchOpen(true)}
                    className="absolute right-1.5 flex items-center gap-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:opacity-90 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>AI</span>
                  </button>
                </div>
              </div>

              {/* Right Action Tools: Track Order, Notification Bell, PWA, Cart */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Track Order Quick Pill */}
                <Link
                  to={`/store/${storeSlug}/orders`}
                  className="hidden sm:flex h-9 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-xs font-bold text-slate-300 hover:border-slate-700 hover:text-white transition-all shadow-sm"
                  title="My Orders & Tracking"
                >
                  <PackageCheck className="h-4 w-4 text-indigo-400" />
                  <span>Orders</span>
                </Link>

                {/* Real-Time Notification Bell Icon */}
                <div className="shrink-0">
                  <NotificationBellHeader />
                </div>

                {/* PWA App Install Button */}
                <div className="shrink-0">
                  <InstallAppButton storeSlug={storeSlug} />
                </div>

                {/* Real-Time Shopping Cart Counter Badge */}
                <Link
                  to={`/store/${storeSlug}/cart`}
                  className="group relative flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-black text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="relative flex items-center">
                    <ShoppingBag className="h-4 w-4" />
                    {cart.count > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-slate-950 animate-bounce">
                        {cart.count}
                      </span>
                    )}
                  </div>
                  {cart.total > 0 ? (
                    <span className="font-black text-xs tracking-tight">₹{cart.total.toFixed(0)}</span>
                  ) : (
                    <span className="hidden sm:inline font-bold">Cart</span>
                  )}
                </Link>
              </div>

            </div>

            {/* Mobile Sub-Header Search Bar */}
            <div className="flex lg:hidden px-4 pb-3">
              <div className="relative w-full flex items-center">
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (aiSearchProducts) setAiSearchProducts(null)
                  }}
                  placeholder="Search products, categories..."
                  className="w-full rounded-2xl bg-slate-900 py-2.5 pl-10 pr-20 text-xs text-white placeholder-slate-400 border border-slate-800 focus:border-indigo-500 focus:outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-14 text-slate-400 hover:text-white p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setAiSearchOpen(true)}
                  className="absolute right-1.5 flex items-center gap-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1.5 text-xs font-black text-white shadow hover:opacity-90 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>AI</span>
                </button>
              </div>
            </div>

            {/* Flipkart / Amazon Express Location Sub-Bar */}
            <div className="w-full bg-slate-900/90 border-t border-slate-800/80 px-4 py-2 text-xs text-slate-300 overflow-hidden">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setLocationInput(userLocation)
                    setLocationModalOpen(true)
                  }}
                  className="flex items-center gap-1.5 min-w-0 truncate hover:text-white transition-colors cursor-pointer text-left"
                >
                  <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-bounce" />
                  <span className="truncate text-xs font-medium text-slate-300">
                    Deliver to <strong className="text-white font-bold underline decoration-amber-400/50 underline-offset-2">{userLocation || 'Select Location'}</strong>
                  </span>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Zap className="h-3 w-3 fill-emerald-400" /> 10-Min Express
                  </span>
                </div>
              </div>
            </div>

            {/* Categories Smooth Horizontal Scroll Bar */}
            <div className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800/60 py-2 px-4 sm:px-6">
              <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                    !activeCategory
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40 scale-105'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  <span>All Products</span>
                  <span className="ml-1 rounded-full bg-slate-950/60 px-1.5 py-0.2 text-[10px] text-slate-300">
                    {products.length}
                  </span>
                </button>

                {categories.map((c) => {
                  const count = products.filter(p => p.category?.slug === c.slug).length
                  const isActive = activeCategory === c.slug
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.slug)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40 scale-105'
                          : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{c.name}</span>
                      {count > 0 && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isActive ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-950/60 text-slate-400'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </header>

          {/* ========================================================================= */}
          {/* CUSTOMER SIDEBAR SLIDE-OUT NAVIGATION DRAWER                             */}
          {/* ========================================================================= */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex">
              {/* Dark Overlay Backdrop */}
              <div
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
              />

              {/* Slide-out Sidebar Panel */}
              <div className="relative z-10 flex w-80 max-w-[85vw] flex-col justify-between bg-slate-950 p-6 text-white shadow-2xl border-r border-slate-800 h-full overflow-y-auto">
                <div>
                  {/* Sidebar Header & Close Button */}
                  <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      {store.logo ? (
                        <img src={mediaUrl(store.logo)} alt="" className="h-10 w-10 rounded-2xl object-cover ring-2 ring-indigo-500/40" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white">
                          {store.name[0]?.toUpperCase()}
                        </span>
                      )}
                      <div>
                        <h3 className="font-black text-base text-white">{store.name}</h3>
                        <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Verified Store
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Navigation Links Menu */}
                  <div className="mt-6 space-y-1.5">
                    <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                      Navigation Menu
                    </p>

                    <Link
                      to={`/store/${storeSlug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-indigo-400 transition-all"
                    >
                      <Home className="h-4 w-4 text-indigo-400" />
                      <span>Store Home</span>
                    </Link>

                    <a
                      href="#products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-indigo-400 transition-all"
                    >
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>Browse Products</span>
                    </a>

                    <Link
                      to={`/store/${storeSlug}/orders`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-indigo-400 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <PackageCheck className="h-4 w-4 text-emerald-400" />
                        <span>My Orders</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </Link>

                    <Link
                      to={`/store/${storeSlug}/cart`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-indigo-400 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-4 w-4 text-purple-400" />
                        <span>Shopping Cart</span>
                      </div>
                      {cart.count > 0 && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-black text-white">
                          {cart.count}
                        </span>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        window.dispatchEvent(new CustomEvent('qs-open-chat'))
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-indigo-400 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-4 w-4 text-teal-400" />
                        <span>Live Chat & Support</span>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    </button>

                    <Link
                      to="/orders/track"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-indigo-400 transition-all"
                    >
                      <Search className="h-4 w-4 text-cyan-400" />
                      <span>Track Any Order</span>
                    </Link>
                  </div>
                </div>

                {/* Sidebar Footer Reassurance Box */}
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <div className="rounded-2xl bg-indigo-950/50 border border-indigo-500/30 p-3.5 text-xs text-indigo-200 space-y-1">
                    <p className="font-extrabold text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Buyer Protection Enabled</span>
                    </p>
                    <p className="text-[11px] text-indigo-200/80 leading-snug">
                      Orders are processed directly by store seller with live status updates.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>MultiStore Customer App</span>
                    <InstallAppButton storeSlug={storeSlug} />
                  </div>
                </div>
              </div>
            </div>
          )}

        <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          {/* AI Search Feedback Banner */}
          {aiSearchProducts && (
            <div className="flex items-center justify-between rounded-2xl bg-indigo-900/90 text-white p-4 text-sm shadow-xl border border-indigo-500/40">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Showing AI search results for: <strong>"{aiSearchQuery}"</strong></span>
              </div>
              <button onClick={() => setAiSearchProducts(null)} className="font-extrabold bg-indigo-800 hover:bg-indigo-700 px-3 py-1 rounded-xl text-xs">Clear</button>
            </div>
          )}
          {/* Flipkart / Amazon Premium Promo Hero Banner */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl border border-indigo-500/30">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-black text-indigo-300 border border-indigo-400/30">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                    <span>Verified Storefront • Express Delivery</span>
                  </div>
                  {storeCoupons.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-400/40 animate-pulse">
                      <Tag className="h-3.5 w-3.5 text-emerald-400" />
                      <span>
                        OFFER: Use Code "{storeCoupons[0].code}" for{' '}
                        {storeCoupons[0].discount_type === 'PERCENTAGE'
                          ? `${storeCoupons[0].discount_value}% OFF`
                          : `FLAT ₹${storeCoupons[0].discount_value} OFF`}
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                  Shop Top Products directly from {store.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  Fast delivery, verified authentic items, and live order tracking with direct seller WhatsApp support.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <span>Explore Items</span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            
            {/* Background Glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
          </section>

          {/* Amazon / Flipkart Ultra-Premium High-Density Grid */}
          <section id="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <span>Featured Products</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">Top picked items from verified inventory</p>
              </div>

              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                {visibleProducts.length} Available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
              {visibleProducts.map((p) => {
                const isOutOfStock = p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) <= 0
                const cartItem = cart.items.find((item: any) => item.id === p.id)
                const activeCoupon = storeCoupons.find((c: any) => c.product_id === p.id) || storeCoupons.find((c: any) => !c.product_id)
                const mockMrp = activeCoupon ? null : Math.round(Number(p.price) * 1.2)

                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300"
                  >
                    <Link to={`/store/${storeSlug}/product/${p.slug}`} className="block relative">
                      {/* Deal & Active Coupon Badges */}
                      {activeCoupon && (
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2 py-0.5 text-[10px] font-black text-white shadow">
                            <Tag className="h-2.5 w-2.5" />
                            {activeCoupon.discount_type === 'PERCENTAGE'
                              ? `${activeCoupon.discount_value}% OFF`
                              : `FLAT ₹${activeCoupon.discount_value} OFF`}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300 shadow">
                          <Star className="h-2.5 w-2.5 fill-amber-300" />
                          4.8
                        </span>
                      </div>

                      {/* Product Image */}
                      <div className="relative flex h-40 sm:h-44 items-center justify-center bg-slate-50 p-3 overflow-hidden group-hover:bg-indigo-50/20 transition-all">
                        {p.image ? (
                          <img
                            src={mediaUrl(p.image)}
                            alt={p.name}
                            className="h-full w-full object-contain group-hover:scale-108 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-5xl group-hover:scale-110 transition-transform">🛍️</span>
                        )}

                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                            <span className="bg-rose-600 text-white font-black text-[10px] uppercase px-3 py-1 rounded-full shadow tracking-wider">
                              Out of Stock
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Title & Pricing */}
                      <div className="p-3 pb-2 space-y-1">
                        <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                          {p.name}
                        </h3>

                        <div className="flex items-baseline gap-1.5 pt-1">
                          <span className="text-sm sm:text-base font-black text-slate-950">
                            ₹{p.price}
                          </span>
                          {mockMrp > p.price && (
                            <span className="text-[11px] font-medium text-slate-400 line-through">
                              ₹{mockMrp}
                            </span>
                          )}
                        </div>

                        {p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= 10 && (
                          <p className="text-[10px] font-extrabold text-amber-600">
                            🔥 Only {p.stock_quantity} left in stock
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Quantity Controller / Add Button */}
                    <div className="p-3 pt-1">
                      {cartItem ? (
                        <div className="flex items-center justify-between rounded-xl bg-indigo-600 p-1 text-white shadow-md">
                          <button
                            type="button"
                            onClick={() => cart.change(p.id, cartItem.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-700 hover:bg-indigo-800 font-bold active:scale-95 transition-all cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-black text-xs px-2">{cartItem.quantity}</span>
                          <button
                            type="button"
                            onClick={() => cart.change(p.id, cartItem.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-700 hover:bg-indigo-800 font-bold active:scale-95 transition-all cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isOutOfStock}
                          onClick={() => cart.add({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image })}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-xs font-black text-white shadow-md hover:shadow-lg hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none transition-all cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {visibleProducts.length === 0 && (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center space-y-3">
                <p className="text-base font-bold text-slate-800">No product found matching your search</p>
                <p className="text-xs text-slate-500">Need something specific from this store? Send a direct product request to the seller.</p>
                <button
                  onClick={() => setRequestOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-lg hover:bg-emerald-500 transition-all cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Request product via WhatsApp</span>
                </button>
              </div>
            )}
          </section>
        </main>
        {requestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Request product</h3>
                <button onClick={() => setRequestOpen(false)} className="text-xl text-slate-400">✕</button>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Product name</label>
                  <input value={searchTerm || 'Product'} onChange={(e) => setSearchTerm(e.target.value)} className="premium-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Your name</label>
                  <input value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Your name" className="premium-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Phone number</label>
                  <input value={requestPhone} onChange={(e) => setRequestPhone(e.target.value)} placeholder="e.g. 919876543210" className="premium-input mt-1" inputMode="tel" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Message</label>
                  <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Optional note for the seller" className="premium-input mt-1 min-h-20" />
                </div>
                <button onClick={submitProductRequest} className="w-full rounded-xl bg-[#075E54] px-4 py-3 text-sm font-bold text-white">Send request via WhatsApp</button>
              </div>
            </div>
          </div>
        )}
        {aiSearchOpen && (
          <AiSearchModal
            onClose={() => setAiSearchOpen(false)}
            onResults={(results, query) => {
              setAiSearchProducts(results)
              setAiSearchQuery(query)
            }}
          />
        )}
        {locationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-black text-slate-900">Select Delivery Location</h3>
                </div>
                <button onClick={() => setLocationModalOpen(false)} className="text-xl text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
              </div>

              {locationError && (
                <div className="rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200">
                  ⚠️ {locationError}
                </div>
              )}

              <button
                type="button"
                onClick={detectGpsLocation}
                disabled={detectingGps}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-xs font-black text-white shadow-md hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:bg-slate-300 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
                <span>{detectingGps ? 'Detecting Location via GPS…' : 'Use Current Location (GPS)'}</span>
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="shrink-0 px-3 text-[11px] font-bold text-slate-400 uppercase">Or enter manually</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Pincode or Full Address</label>
                <textarea
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. 400001, Bandra West, Mumbai"
                  className="w-full mt-1.5 rounded-2xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none min-h-20"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setLocationModalOpen(false)}
                  className="w-1/2 rounded-2xl bg-slate-100 py-3 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const finalAddr = locationInput.trim() || 'Your Location'
                    localStorage.setItem('multistore_user_delivery_address', finalAddr)
                    setUserLocation(finalAddr)
                    setLocationModalOpen(false)
                  }}
                  className="w-1/2 rounded-2xl bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 cursor-pointer shadow-md"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Golden Store-Wide Welcome Offer Modal Popup */}
        {showOfferModal && storeWideCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 border-2 border-amber-400/50 shadow-2xl text-center space-y-4">
              {/* Confetti & Glow Background */}
              <div className="pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />

              <button
                onClick={dismissOfferModal}
                className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                ✕
              </button>

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 text-3xl shadow-lg shadow-amber-500/30 animate-bounce">
                🎁
              </div>

              <div className="space-y-1">
                <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                  Exclusive Store Promotion
                </span>
                <h3 className="text-xl font-black text-white leading-tight">
                  Welcome Offer at {store?.name}!
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  Enjoy instant savings across all store products today.
                </p>
              </div>

              {/* Discount Value Display Box */}
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 p-4 border border-amber-400/40 space-y-2">
                <p className="text-xs text-amber-300 font-extrabold uppercase tracking-wide">
                  Discount Benefit
                </p>
                <p className="text-2xl font-black text-amber-300">
                  {storeWideCoupon.discount_type === 'PERCENTAGE'
                    ? `${storeWideCoupon.discount_value}% OFF`
                    : `FLAT ₹${storeWideCoupon.discount_value} OFF`}
                </p>
                {storeWideCoupon.min_order_amount > 0 && (
                  <p className="text-[11px] text-slate-400">
                    On minimum order of ₹{storeWideCoupon.min_order_amount}
                  </p>
                )}
              </div>

              {/* Coupon Code Tap to Copy Box */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase text-slate-400">Coupon Code:</p>
                <div
                  onClick={() => copyCouponCode(storeWideCoupon.code)}
                  className="group flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 border border-amber-400/50 hover:border-amber-400 cursor-pointer transition-all shadow-inner"
                >
                  <span className="font-mono text-lg font-black text-amber-300 tracking-wider">
                    {storeWideCoupon.code}
                  </span>
                  <span className="flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1 text-xs font-black text-slate-950 group-hover:scale-105 transition-all">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{copiedToast ? 'COPIED!' : 'COPY'}</span>
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    copyCouponCode(storeWideCoupon.code)
                    dismissOfferModal()
                  }}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                >
                  Shop Now & Save →
                </button>
              </div>
            </div>
          </div>
        )}

        <CustomerBottomNav storeSlug={storeSlug!} active="home" />
        <CustomerChatWidget storeSlug={storeSlug!} />
        <AiAssistantWidget />
      </>)}
    </div>
  )
}
