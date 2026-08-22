import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Menu, Search, ShoppingBag, ShoppingCart, Sparkles, PackageCheck, MessageCircle, X, ChevronRight,
  ShieldCheck, Home, Plus, Minus, Star, MapPin, Zap, TrendingUp, Tag, Layers, Crown, Flag
} from 'lucide-react'
import api from '../services/api'
import InstallAppButton from '../pwa/InstallAppButton'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import AiSearchModal from '../components/AiSearchModal'
import { useNotifications } from '../context/NotificationContext'
import NotificationBellHeader from '../components/NotificationBellHeader'
import CustomerScratchCardModal, { ScratchCardConfig } from '../components/CustomerScratchCardModal'
import { getStoreTheme } from '../utils/storeTheme'
import { setupCustomerStorePwa } from '../pwa/pwaManager'
import StoreOfflinePage from './StoreOfflinePage'
import { isStoreOffline } from '../utils/storeStatus'

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
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('PRODUCT')
  const [reportDetails, setReportDetails] = useState('')
  const [reportContact, setReportContact] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportMessage, setReportMessage] = useState('')

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

  async function submitStoreReport(e: React.FormEvent) {
    e.preventDefault()
    if (reportDetails.trim().length < 10) { setReportMessage('Please add at least 10 characters so our team can review the issue.'); return }
    setReportSubmitting(true); setReportMessage('')
    try {
      await api.post(`/public/stores/${storeSlug}/report/`, { reason: reportReason, details: reportDetails.trim(), contact_phone: reportContact.trim() })
      setReportMessage('Report submitted. Our team will review it.')
      setReportDetails(''); setReportContact('')
    } catch (err: any) { setReportMessage(err?.response?.data?.detail || 'Could not submit the report. Please try again later.') }
    finally { setReportSubmitting(false) }
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
  const [storeOffline, setStoreOffline] = useState(false)

  const { setActiveStoreId } = useNotifications()

  const fetchStoreData = () => {
    if (!storeSlug) return
    setLoading(true)
    setStoreOffline(false)
    api.get(`/public/stores/${storeSlug}/`)
      .then(res => {
        const data = res.data.data || res.data
        setStore(data)
        if (data) {
          setupCustomerStorePwa(data)
          localStorage.setItem('multistore-installed-store-validated', 'true')
        }
        if (data?.id) {
          setActiveStoreId(data.id)
        }
        if (data?.name) {
          document.title = `${data.name} - Online Store`
        }
      })
      .catch((error) => {
        if (isStoreOffline(error)) {
          setStoreOffline(true)
          document.title = 'Store Under Maintenance'
        } else {
          setLoadError(error?.response?.status === 404 ? 'This store is currently set to Draft mode by the seller. The seller needs to turn ON the 🟢 LIVE toggle switch in their dashboard.' : 'Store could not be opened. Please check your network connection.')
        }
      })
      .finally(() => {
        setLoading(false)
      })

    api.get(`/public/stores/${storeSlug}/products/`).then(res => setProducts(res.data)).catch(() => { })
    api.get(`/public/stores/${storeSlug}/categories/`).then(res => setCategories(res.data)).catch(() => { })
    api.get(`/public/stores/${storeSlug}/coupons/`).then(res => setStoreCoupons(Array.isArray(res.data) ? res.data : [])).catch(() => { })
  }

  useEffect(() => {
    fetchStoreData()

    const handleOnline = () => {
      fetchStoreData()
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [storeSlug])

  const [storeCoupons, setStoreCoupons] = useState<any[]>([])
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)

  const [scratchCardModalOpen, setScratchCardModalOpen] = useState(false)
  const [scratchCardConfig, setScratchCardConfig] = useState<ScratchCardConfig | null>(null)

  useEffect(() => {
    if (!store?.id) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const scratchedKey = `qs_scratched_${store.id}`
      const shownKey = `qs_scratch_shown_${store.id}`
      const lastScratched = localStorage.getItem(scratchedKey)
      const alreadyShownInSession = sessionStorage.getItem(shownKey)

      if (lastScratched !== today && !alreadyShownInSession) {
        const configKey = `qs_scratch_config_${store.id}`
        const configSaved = localStorage.getItem(configKey)
        const config: ScratchCardConfig = configSaved ? JSON.parse(configSaved) : {
          enabled: true,
          title: '🎉 Scratch & Win Welcome Gift!',
          rewardText: 'Flat ₹50 OFF on orders above ₹299',
          couponCode: 'LUCKY50',
          discountType: 'fixed',
          discountValue: 50,
          minOrder: 299
        }

        if (config.enabled) {
          setScratchCardConfig(config)
          sessionStorage.setItem(shownKey, 'true')
          const timer = setTimeout(() => {
            setScratchCardModalOpen(true)
          }, 1200)
          return () => clearTimeout(timer)
        }
      }
    } catch { }
  }, [store?.id])

  const handleClaimScratchCoupon = (code: string, discountValue: number, discountType: 'fixed' | 'percentage') => {
    try {
      if (store?.id) {
        const today = new Date().toISOString().split('T')[0]
        localStorage.setItem(`qs_scratched_${store.id}`, today)
        localStorage.setItem(`qs_claimed_coupon_${storeSlug}`, JSON.stringify({ code, discountValue, discountType }))
      }
    } catch { }
  }

  const storeWideCoupon = useMemo(() => {
    return storeCoupons.find((c: any) => !c.product_id)
  }, [storeCoupons])

  const [flashSale, setFlashSale] = useState<any>(() => {
    try {
      const keys = [
        storeSlug ? `qs_flash_sale_${storeSlug}` : null,
        store?.id ? `qs_flash_sale_${store.id}` : null,
        'qs_flash_sale_global'
      ].filter(Boolean)

      for (const k of keys) {
        const item = localStorage.getItem(k as string)
        if (item) return JSON.parse(item)
      }
    } catch { }
    return { active: true, discount: 25, title: '⚡ EVENING CLEARANCE FLASH SALE IS LIVE!' }
  })

  useEffect(() => {
    const keys = [
      storeSlug ? `qs_flash_sale_${storeSlug}` : null,
      store?.id ? `qs_flash_sale_${store.id}` : null,
      'qs_flash_sale_global'
    ].filter(Boolean)

    for (const k of keys) {
      try {
        const item = localStorage.getItem(k as string)
        if (item) {
          setFlashSale(JSON.parse(item))
          break
        }
      } catch { }
    }

    const handleUpdate = (e: any) => {
      setFlashSale(e.detail)
    }
    window.addEventListener('qs-flash-sale-updated', handleUpdate)
    return () => window.removeEventListener('qs-flash-sale-updated', handleUpdate)
  }, [store?.id, storeSlug])

  useEffect(() => {
    if (storeWideCoupon && storeSlug) {
      const shownKey = `store_offer_shown_${storeSlug}`
      const hasBeenShownInSession = sessionStorage.getItem(shownKey)
      if (!hasBeenShownInSession) {
        const timer = setTimeout(() => {
          setShowOfferModal(true)
          sessionStorage.setItem(shownKey, 'true')
        }, 400)
        return () => clearTimeout(timer)
      }
    }
  }, [storeWideCoupon, storeSlug])

  const copyCouponCode = (code: string) => {
    if (storeSlug) {
      sessionStorage.setItem(`store_offer_shown_${storeSlug}`, 'true')
    }
    navigator.clipboard.writeText(code)
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 2200)
  }

  const dismissOfferModal = () => {
    if (storeSlug) {
      sessionStorage.setItem(`store_offer_shown_${storeSlug}`, 'true')
    }
    setShowOfferModal(false)
  }

  const { addNotification } = useNotifications()

  // Real-time WebSocket connection for New Product notifications
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
              body: `Now available for ₹${data.product.price}!`,
              link: `/store/${storeSlug}/product/${data.product.slug}`
            })
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
  const storeTheme = useMemo(() => getStoreTheme(store), [store])

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

  if (storeOffline) {
    return <StoreOfflinePage />
  }

  return (
    <div className={`mx-auto min-h-screen w-full ${storeTheme.page_bg_class} pb-24 lg:pb-12 text-xs sm:text-sm font-sans transition-colors duration-300`}>
      {loading ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-white shadow-xl border border-slate-800 space-y-3 animate-pulse">
            <div className="h-12 w-12 rounded-xl bg-slate-800 mx-auto" />
            <div className="h-4 w-32 bg-slate-800 rounded mx-auto" />
            <div className="h-3 w-40 bg-slate-800/60 rounded mx-auto" />
          </div>
        </div>
      ) : !store ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-5 text-white shadow-xl border border-slate-800 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 mx-auto text-xl">
              🏪
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Store Temporarily Offline</h2>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {loadError || 'Dukaan filhal maintenance ke liye offline hai.'}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-left text-xs text-emerald-200 space-y-1">
              <p className="font-bold text-emerald-300 flex items-center gap-1">
                <span>🛡️</span>
                <span>Pehle ke Orders Safe Hain!</span>
              </p>
              <p className="text-[11px] text-emerald-200/90 leading-snug">
                Seller dwara aapka order normally process ho raha hai.
              </p>
            </div>

            <Link
              to="/orders/track"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md"
            >
              <span>🔍 Track Existing Order</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Draft Preview Banner */}
          {store?.is_published === false && (
            <div className="relative z-50 bg-rose-600 px-3 py-1.5 text-center text-white text-[11px] font-black tracking-wide shadow-md flex items-center justify-center gap-2 border-b border-rose-700">
              <span className="animate-pulse">⚠️ DRAFT PREVIEW MODE</span>
              <span className="font-medium text-rose-100">- Customers see "Under Maintenance"</span>
            </div>
          )}

          {/* Top Promotional Ticker */}
          {storeWideCoupon && (
            <div className="relative z-50 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-3 py-1.5 text-slate-950 font-bold text-[10px] sm:text-xs shadow-xs border-b border-amber-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 mx-auto">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-950 animate-bounce" />
                <span className="truncate">
                  SPECIAL OFFER: Get{' '}
                  <strong className="underline font-black">
                    {storeWideCoupon.discount_type === 'PERCENTAGE'
                      ? `${storeWideCoupon.discount_value}% OFF`
                      : `FLAT ₹${storeWideCoupon.discount_value} OFF`}
                  </strong>{' '}
                  Code:{' '}
                  <span className="font-mono bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                    {storeWideCoupon.code}
                  </span>
                </span>
                <button
                  onClick={() => copyCouponCode(storeWideCoupon.code)}
                  className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-950 px-2 py-0.5 text-[9px] font-black text-amber-300 hover:bg-slate-900 transition-all shrink-0 cursor-pointer"
                >
                  <Tag className="h-2.5 w-2.5 text-amber-400" />
                  <span>{copiedToast ? 'COPIED!' : 'COPY'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BLACK HEADER NAVBAR SECTION                                               */}
          {/* ========================================================================= */}
          <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-2.5 py-2 sm:px-5 sm:py-2.5">

              {/* Left Group: Menu + Store info */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Menu"
                >
                  <Menu className="h-4 w-4" />
                </button>

                <Link to={`/store/${storeSlug}`} className="group flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {store.logo ? (
                      <img
                        src={mediaUrl(store.logo)}
                        alt={store.name}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-cover ring-2 ring-indigo-500/50 shadow-xs"
                      />
                    ) : (
                      <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 font-black text-white text-sm shadow-xs">
                        {store.name[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-slate-950">
                      <span className="h-full w-full rounded-full bg-emerald-500 animate-pulse" />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h1 className="truncate text-sm sm:text-base font-black text-white tracking-tight">
                        {store.name}
                      </h1>
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    </div>
                    <p className="truncate text-[10px] font-semibold text-slate-400 leading-none">
                      {store.description || 'Instant Delivery Store'}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Desktop Search Bar */}
              <div className="hidden lg:flex flex-1 max-w-md mx-3">
                <div className="relative w-full flex items-center">
                  <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      if (aiSearchProducts) setAiSearchProducts(null)
                    }}
                    placeholder="Search products, categories..."
                    className="w-full rounded-xl bg-slate-900 py-1.5 pl-9 pr-16 text-xs text-white placeholder-slate-400 border border-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-12 text-slate-400 hover:text-white p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {/* AI Search disabled
                  <button
                    onClick={() => setAiSearchOpen(true)}
                    className="absolute right-1 flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white hover:opacity-90 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>AI</span>
                  </button>
                  */}
                </div>
              </div>

              {/* Right Tools */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <InstallAppButton storeSlug={storeSlug} />
                <NotificationBellHeader />

                <Link
                  to={`/store/${storeSlug}/cart`}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-xs"
                  title="Shopping Cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cart.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-slate-950 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse">
                      {cart.count}
                    </span>
                  )}
                </Link>
              </div>

            </div>

            {/* Mobile Sub-Header Search Bar */}
            <div className="flex lg:hidden px-2.5 pb-2">
              <div className="relative w-full flex items-center">
                <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (aiSearchProducts) setAiSearchProducts(null)
                  }}
                  placeholder="Search products, categories..."
                  className="w-full rounded-xl bg-slate-900 py-1.5 pl-8 pr-16 text-xs text-white placeholder-slate-400 border border-slate-800 focus:border-indigo-500 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-12 text-slate-400 hover:text-white p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                {/* AI Search disabled
                <button
                  onClick={() => setAiSearchOpen(true)}
                  className="absolute right-1 flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-2 py-1 text-[10px] font-bold text-white shadow cursor-pointer"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>AI</span>
                </button>
                */}
              </div>
            </div>

            {/* Express Location Bar */}
            <div className="w-full bg-slate-900/90 border-t border-slate-800/80 px-3 py-1.5 text-[11px] text-slate-300">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationInput(userLocation)
                    setLocationModalOpen(true)
                  }}
                  className="flex items-center gap-1 min-w-0 truncate text-slate-300 hover:text-white cursor-pointer text-left"
                >
                  <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate text-[11px]">
                    Deliver to <strong className="text-white underline decoration-amber-400/50">{userLocation || 'Select Location'}</strong>
                  </span>
                </button>
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                  <Zap className="h-2.5 w-2.5 fill-emerald-400" /> Express
                </span>
              </div>
            </div>
          </header>

          {/* ========================================================================= */}
          {/* CATEGORIES BAR (PLACED OUTSIDE & DIRECTLY BELOW THE BLACK HEADER SECTION)  */}
          {/* ========================================================================= */}
          <div className={`sticky top-[86px] sm:top-[92px] z-30 w-full ${storeTheme.sub_bar_bg_class} border-b py-2.5 px-3 sm:px-5 shadow-xs transition-colors duration-300`}>
            <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto scrollbar-none py-0.5">

              {/* Category: All */}
              <button
                onClick={() => setActiveCategory('')}
                style={!activeCategory ? { backgroundColor: storeTheme.primary_color } : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${!activeCategory
                  ? 'text-white ring-2 ring-white/20'
                  : storeTheme.is_dark_mode
                    ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                  }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>All</span>
                <span className={`ml-0.5 rounded-full px-2 py-0.2 text-[10px] font-black ${!activeCategory ? 'bg-black/30 text-white' : storeTheme.is_dark_mode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                  {products.length}
                </span>
              </button>

              {/* Dynamic Categories List */}
              {categories.map((c) => {
                const count = products.filter(p => p.category?.slug === c.slug).length
                const isActive = activeCategory === c.slug
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.slug)}
                    style={isActive ? { backgroundColor: storeTheme.primary_color } : undefined}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${isActive
                      ? 'text-white ring-2 ring-white/20'
                      : storeTheme.is_dark_mode
                        ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                  >
                    <span>{c.name}</span>
                    <span className={`rounded-full px-2 py-0.2 text-[10px] font-black ${isActive ? 'bg-black/30 text-white' : storeTheme.is_dark_mode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SLIDE-OUT MENU DRAWER */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-[100] flex font-sans animate-fade-in">
              <div
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              />

              <div className="relative z-[110] flex w-76 max-w-[85vw] flex-col justify-between bg-white p-5 text-slate-900 shadow-2xl border-r border-slate-200/80 h-full overflow-y-auto font-sans">
                <div className="space-y-6">

                  {/* STORE BRAND HEADER */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      {store.logo ? (
                        <img src={mediaUrl(store.logo)} alt="" className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 font-black text-white text-sm shadow-sm border border-slate-100 shrink-0">
                          {store.name[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">{store.name}</h3>
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                          <span>Verified Store</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 border border-slate-200 transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* NAVIGATION LINKS */}
                  <div className="space-y-1.5 text-xs">
                    <p className="px-2 text-[9.5px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Store Navigation
                    </p>

                    <Link
                      to={`/store/${storeSlug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 font-extrabold text-indigo-700 bg-indigo-50/80 border border-indigo-100 hover:bg-indigo-100/60 transition-all shadow-xs"
                    >
                      <Home className="h-4 w-4 text-indigo-600" />
                      <span>Store Home</span>
                    </Link>

                    <Link
                      to={`/store/${storeSlug}/orders`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 font-bold text-slate-700 bg-transparent border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <PackageCheck className="h-4 w-4 text-emerald-600" />
                        <span>My Orders</span>
                      </div>
                      <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Live Tracking
                      </span>
                    </Link>

                    <Link
                      to={`/store/${storeSlug}/cart`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 font-bold text-slate-700 bg-transparent border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-4 w-4 text-purple-600" />
                        <span>Shopping Cart</span>
                      </div>
                      {cart.count > 0 && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                          {cart.count}
                        </span>
                      )}
                    </Link>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        window.dispatchEvent(new CustomEvent('qs-open-chat'))
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 font-bold text-slate-700 bg-transparent border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-4 w-4 text-emerald-500" />
                        <span>Chat with Seller</span>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </button>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        setRequestOpen(true)
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 font-bold text-slate-700 bg-transparent border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>Request Product</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false)
                          setReportOpen(true)
                          setReportMessage('')
                        }}
                        className="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 font-bold text-rose-600 bg-transparent border border-transparent hover:bg-rose-50 hover:border-rose-100 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Flag className="h-4 w-4 text-rose-500" />
                          <span>Report this store</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-rose-400" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* FOOTER ACTIONS */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <InstallAppButton storeSlug={storeSlug} />
                </div>
              </div>
            </div>
          )}

          <main className="p-2.5 sm:p-5 max-w-7xl mx-auto space-y-4">
            {/* AI Search Feedback Banner */}
            {aiSearchProducts && (
              <div className="flex items-center justify-between rounded-xl bg-indigo-900/90 text-white p-3 text-xs shadow-md border border-indigo-500/40">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>AI results for: <strong>"{aiSearchQuery}"</strong></span>
                </div>
                <button onClick={() => setAiSearchProducts(null)} className="font-bold bg-indigo-800 hover:bg-indigo-700 px-2.5 py-1 rounded-lg text-[10px]">Clear</button>
              </div>
            )}

            {/* Glowing Evening Clearance Flash Sale Banner */}
            {flashSale?.active && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 p-2.5 sm:p-4 text-white shadow-xl shadow-rose-500/25 border border-rose-400 animate-pulse">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-white/25 text-sm sm:text-lg font-black shadow-inner">
                      ⚡
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] sm:text-sm font-black text-white tracking-wide uppercase drop-shadow-xs truncate">
                          ⚡ {flashSale.title || 'EVENING CLEARANCE FLASH SALE IS LIVE!'}
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-rose-100 font-bold leading-tight truncate">
                        Flat {flashSale.discount || 25}% OFF on fresh stock till 9:00 PM today!
                      </p>
                    </div>
                  </div>
                  <a
                    href="#products"
                    className="rounded-lg sm:rounded-xl bg-white px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-black text-rose-600 shadow-md hover:bg-rose-50 transition-all shrink-0"
                  >
                    Grab Deals ➔
                  </a>
                </div>
              </div>
            )}

            {/* Ultra-Premium Hero Banner Styled with Store Color Theme */}
            <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${storeTheme.banner_bg_gradient} p-3.5 sm:p-5 text-white shadow-xl border border-white/15`}>
              {/* Background Subtle Ambient Glow with Dynamic Accent */}
              <div
                className="absolute -top-12 -right-12 h-44 w-44 rounded-full blur-2xl pointer-events-none opacity-25"
                style={{ backgroundColor: storeTheme.primary_color }}
              />

              <div className="relative z-10 space-y-2.5">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-600/20 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                    <Crown className="h-3 w-3 text-amber-400 animate-bounce" /> VERIFIED STORE
                  </span>

                  {storeCoupons.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-300 border border-emerald-400/40">
                      <Tag className="h-2.5 w-2.5 text-emerald-400" /> Code "{storeCoupons[0].code}"
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-slate-200 border border-slate-700">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" /> 100% Genuine • COD / UPI
                  </span>
                </div>

                {/* Heading & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
                  <div className="space-y-1 max-w-xl">
                    <h2 className="text-sm sm:text-lg lg:text-xl font-black text-white leading-tight tracking-tight">
                      {store.tagline || `Welcome to ${store.name}`}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-snug">
                      {store.description || 'Order directly from our shop for fast doorstep delivery & verified quality.'}
                    </p>
                  </div>

                  <a
                    href="#products"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-md hover:brightness-110 transition-all shrink-0 self-start sm:self-center cursor-pointer active:scale-95"
                    style={{ backgroundColor: storeTheme.primary_color }}
                  >
                    <span>Explore Shop</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </section>

            {/* Quick Unlisted Product Request Micro-Banner */}
            <div className={`flex items-center justify-between rounded-xl border p-2.5 sm:p-3 shadow-2xs ${storeTheme.is_dark_mode
                ? 'bg-slate-900/80 border-slate-800 text-white'
                : 'bg-white border-slate-200/90 text-slate-900'
              }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-black text-xs shrink-0"
                  style={{ backgroundColor: storeTheme.primary_color }}
                >
                  ⚡
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-black truncate ${storeTheme.text_primary_class}`}>
                    Can't find a product you need?
                  </p>
                  <p className={`text-[10px] font-medium truncate ${storeTheme.text_secondary_class}`}>
                    Request any unlisted item directly from {store.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestOpen(true)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] sm:text-xs font-black text-white shadow-md bg-gradient-to-r ${storeTheme.btn_gradient} transition-all cursor-pointer active:scale-95`}
              >
                Request Product
              </button>
            </div>

            {/* FEATURED PRODUCTS GRID */}
            <section id="products" className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-sm sm:text-base font-bold ${storeTheme.text_primary_class} flex items-center gap-1.5`}>
                    <TrendingUp className="h-4 w-4" style={{ color: storeTheme.primary_color }} />
                    <span>Featured Products</span>
                  </h2>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${storeTheme.accent_badge_class}`}
                >
                  {visibleProducts.length} Items
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
                {visibleProducts.map((p) => {
                  const isOutOfStock = p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) <= 0
                  const cartItem = cart.items.find((item: any) => item.id === p.id)

                  const productCoupons = storeCoupons.filter((c: any) => {
                    if (!c) return false
                    if (c.product_id && (Number(c.product_id) === Number(p.id) || String(c.product_id) === String(p.id))) {
                      return true
                    }
                    if (c.product_name && c.product_name.toLowerCase() === p.name.toLowerCase()) {
                      return true
                    }
                    return false
                  })

                  const storewideCoupons = storeCoupons.filter((c: any) => !c.product_id && !c.product_name)
                  const allApplicableCoupons = [...productCoupons, ...storewideCoupons]

                  // Select ONLY 1 Primary Badge: BOGO > Product Special > First Storewide
                  const primaryCoupon = (() => {
                    if (allApplicableCoupons.length === 0) return null
                    const bogo = allApplicableCoupons.find((c: any) => c.discount_type === 'BOGO')
                    if (bogo) return bogo
                    if (productCoupons.length > 0) return productCoupons[0]
                    return storewideCoupons[0] || allApplicableCoupons[0]
                  })()

                  const extraOffersCount = allApplicableCoupons.length > 1 ? allApplicableCoupons.length - 1 : 0
                  const mockMrp = allApplicableCoupons.length > 0 ? null : Math.round(Number(p.price) * 1.25)

                  return (
                    <div
                      key={p.id}
                      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${storeTheme.is_dark_mode
                          ? 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700 hover:shadow-indigo-500/10'
                          : 'bg-white border-slate-200/90 hover:border-indigo-200 hover:shadow-slate-300/40 shadow-2xs'
                        }`}
                    >
                      <Link to={`/store/${storeSlug}/product/${p.slug}`} className="block relative">
                        {/* Real-App Ultra Deal Overlay Badges */}
                        {primaryCoupon && (
                          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 max-w-[92%] pointer-events-none">
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white shadow-lg backdrop-blur-xs border ${primaryCoupon.discount_type === 'BOGO'
                                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 border-purple-300/80 shadow-purple-600/30 animate-pulse'
                                  : primaryCoupon.discount_type === 'FREE_DELIVERY'
                                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 border-sky-300/80 shadow-sky-500/20'
                                    : (primaryCoupon.product_id || primaryCoupon.product_name)
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-300/80 shadow-amber-500/30'
                                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400/80 shadow-emerald-600/30'
                                }`}
                            >
                              <Tag className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">
                                {primaryCoupon.discount_type === 'BOGO' ? (
                                  '🎁 BUY 1 GET 1 FREE'
                                ) : primaryCoupon.discount_type === 'FREE_DELIVERY' ? (
                                  '🚚 FREE SHIPPING'
                                ) : primaryCoupon.discount_type === 'PERCENTAGE' ? (
                                  `⚡ ${primaryCoupon.discount_value}% OFF`
                                ) : (
                                  `⚡ FLAT ₹${primaryCoupon.discount_value} OFF`
                                )}
                              </span>
                            </span>

                            {extraOffersCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8.5px] font-black text-slate-950 bg-gradient-to-r from-amber-300 to-amber-400 border border-amber-300 shadow-sm w-max">
                                +{extraOffersCount} More {extraOffersCount === 1 ? 'Offer' : 'Offers'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Image Showcase Container */}
                        <div className={`relative flex aspect-[5/4] sm:aspect-square w-full items-center justify-center p-2 overflow-hidden transition-all ${storeTheme.is_dark_mode ? 'bg-slate-950/50 group-hover:bg-slate-950/80' : 'bg-slate-50/90 group-hover:bg-slate-100/80'
                          }`}>
                          {p.image ? (
                            <img
                              src={mediaUrl(p.image)}
                              alt={p.name}
                              className="h-full w-full object-contain p-1 group-hover:scale-108 transition-transform duration-300"
                            />
                          ) : (
                            <span className="text-4xl">🛍️</span>
                          )}

                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                              <span className="bg-rose-600 text-white font-black text-[9px] uppercase px-3 py-1 rounded-full shadow-lg tracking-widest border border-rose-400/40">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title & Pricing Box */}
                        <div className="p-2.5 pb-1 space-y-1">
                          <h3 className={`line-clamp-2 text-xs font-extrabold ${storeTheme.text_primary_class} transition-colors leading-tight min-h-[32px]`}>
                            {p.name}
                          </h3>

                          <div className="flex items-center justify-between gap-1 pt-1">
                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <span className={`text-sm sm:text-base font-black ${storeTheme.text_primary_class}`}>
                                ₹{p.price}
                              </span>
                              {mockMrp && mockMrp > p.price && (
                                <span className="text-[10px] font-semibold text-slate-400 line-through">
                                  ₹{mockMrp}
                                </span>
                              )}
                            </div>

                            {/* Savings percentage tag */}
                            {mockMrp && mockMrp > p.price && (
                              <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                                {Math.round(((mockMrp - p.price) / mockMrp) * 100)}% OFF
                              </span>
                            )}
                          </div>

                          {p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= 5 && (
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                              <p className="text-[9.5px] font-bold text-amber-500">
                                Only {p.stock_quantity} left in stock
                              </p>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Real-App Action Stepper / Add Button (Blinkit / Swiggy Style) */}
                      <div className="p-2 pt-1">
                        {cartItem ? (
                          <div
                            className="flex items-center justify-between rounded-xl p-1 text-white shadow-md transition-all"
                            style={{ backgroundColor: storeTheme.primary_color }}
                          >
                            <button
                              type="button"
                              onClick={() => cart.change(p.id, cartItem.quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/25 hover:bg-black/40 font-black text-sm active:scale-90 transition-transform cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-black text-xs px-2">{cartItem.quantity}</span>
                            <button
                              type="button"
                              onClick={() => cart.change(p.id, cartItem.quantity + 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/25 hover:bg-black/40 font-black text-sm active:scale-90 transition-transform cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isOutOfStock}
                            onClick={() => cart.add({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image })}
                            className={`flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-black text-white shadow-sm disabled:opacity-40 transition-all cursor-pointer active:scale-95 bg-gradient-to-r ${storeTheme.btn_gradient}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{isOutOfStock ? 'Out of Stock' : 'ADD'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {visibleProducts.length === 0 && (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-800">No product found matching your search</p>
                  <button
                    onClick={() => setRequestOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Request product via WhatsApp</span>
                  </button>
                </div>
              )}
            </section>
          </main>

          {/* Modals */}
          {requestOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-xs">
              <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Request product</h3>
                  <button onClick={() => setRequestOpen(false)} className="text-base text-slate-400">✕</button>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <label className="font-bold text-slate-600">Product name</label>
                    <input value={searchTerm || 'Product'} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-lg border p-2 mt-1" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600">Your name</label>
                    <input value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Name" className="w-full rounded-lg border p-2 mt-1" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600">Phone number</label>
                    <input value={requestPhone} onChange={(e) => setRequestPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border p-2 mt-1" inputMode="tel" />
                  </div>
                  <button onClick={submitProductRequest} className="w-full rounded-lg bg-[#075E54] py-2.5 font-bold text-white mt-2">Send WhatsApp Request</button>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Delivery Location</h3>
                  </div>
                  <button onClick={() => setLocationModalOpen(false)} className="text-slate-400">✕</button>
                </div>

                {locationError && (
                  <div className="rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-800">
                    ⚠️ {locationError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={detectGpsLocation}
                  disabled={detectingGps}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span>{detectingGps ? 'Detecting Location…' : 'Use Current Location (GPS)'}</span>
                </button>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Pincode or Address</label>
                  <textarea
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="e.g. 400001, Bandra West, Mumbai"
                    className="w-full mt-1 rounded-xl border p-2 text-xs min-h-16"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setLocationModalOpen(false)}
                    className="w-1/2 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600"
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
                    className="w-1/2 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Store Welcome Offer Modal */}
          {showOfferModal && storeWideCoupon && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md font-sans animate-fade-in">
              <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-950/95 p-6 border border-amber-400/60 shadow-[0_0_50px_rgba(251,191,36,0.25)] text-center space-y-4 font-sans ring-1 ring-amber-400/30">

                {/* Ambient Top Glow */}
                <div className="pointer-events-none absolute -top-12 inset-x-0 h-28 bg-gradient-to-b from-amber-500/30 via-purple-500/10 to-transparent blur-xl" />

                <button
                  onClick={dismissOfferModal}
                  className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer z-10"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 text-3xl shadow-lg shadow-amber-500/20 border border-amber-200">
                  🎁
                </div>

                <div className="relative z-10 space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/40">
                    <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
                    <span>Exclusive Store Offer</span>
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight pt-1">
                    Welcome to {store?.name || 'Store'}!
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Enjoy special storewide savings on your order today.
                  </p>
                </div>

                {/* Offer Card Box */}
                <div className="relative z-10 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-4 border border-amber-400/30 space-y-1 shadow-inner">
                  <p className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                    {storeWideCoupon.discount_type === 'PERCENTAGE'
                      ? `${storeWideCoupon.discount_value}% OFF`
                      : `FLAT ₹${storeWideCoupon.discount_value} OFF`}
                  </p>
                  {storeWideCoupon.min_order_amount > 0 && (
                    <p className="text-[11px] text-slate-400 font-medium">
                      Valid on orders above ₹{storeWideCoupon.min_order_amount}
                    </p>
                  )}
                </div>

                {/* Coupon Code Dotted Ticket */}
                <div
                  onClick={() => copyCouponCode(storeWideCoupon.code)}
                  className="relative z-10 flex items-center justify-between rounded-2xl bg-slate-900/90 px-4 py-2.5 border-2 border-dashed border-amber-400/60 cursor-pointer hover:bg-slate-900 transition-all"
                >
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Coupon Code</span>
                    <span className="font-mono text-sm font-black text-amber-300">
                      {storeWideCoupon.code}
                    </span>
                  </div>
                  <span className="rounded-xl bg-amber-400 px-3 py-1.5 text-[10px] font-black text-slate-950 shadow-xs flex items-center gap-1 hover:bg-amber-300">
                    <Tag className="h-3 w-3" />
                    <span>{copiedToast ? 'COPIED!' : 'COPY CODE'}</span>
                  </span>
                </div>

                <button
                  onClick={() => {
                    copyCouponCode(storeWideCoupon.code)
                    dismissOfferModal()
                  }}
                  className="relative z-10 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                >
                  Apply & Shop Now →
                </button>
              </div>
            </div>
          )}

          {reportOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
              <form onSubmit={submitStoreReport} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3"><div><h3 className="text-base font-black text-slate-900">Report this store</h3><p className="mt-1 text-xs text-slate-500">Reports are reviewed by the platform team. The store is not notified of your identity.</p></div><button type="button" onClick={() => { setReportOpen(false); setReportMessage('') }} className="text-slate-400 hover:text-slate-700">✕</button></div>
                <div className="mt-4 space-y-3">
                  <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800"><option value="FRAUD">Fraud or scam concern</option><option value="PRODUCT">Product or service issue</option><option value="PAYMENT">Payment issue</option><option value="ABUSE">Abusive or inappropriate content</option><option value="OTHER">Other</option></select>
                  <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} required minLength={10} maxLength={1500} placeholder="Explain what happened (minimum 10 characters)" className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800" />
                  <input value={reportContact} onChange={(e) => setReportContact(e.target.value)} inputMode="tel" maxLength={40} placeholder="Your phone number (optional, for follow-up)" className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800" />
                  {reportMessage && <p className="rounded-lg bg-slate-50 p-2 text-xs font-semibold text-slate-700">{reportMessage}</p>}
                  <button disabled={reportSubmitting} className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white disabled:opacity-50">{reportSubmitting ? 'Submitting…' : 'Submit report'}</button>
                </div>
              </form>
            </div>
          )}

          {/* Customer Interactive Scratch Card Reward Modal */}
          {scratchCardModalOpen && scratchCardConfig && store && (
            <CustomerScratchCardModal
              config={scratchCardConfig}
              storeName={store.name}
              onClaimCoupon={handleClaimScratchCoupon}
              onClose={() => setScratchCardModalOpen(false)}
            />
          )}

          {/* Floating Scratch Card Trigger Button */}
          {scratchCardConfig?.enabled && (
            <button
              type="button"
              onClick={() => setScratchCardModalOpen(true)}
              className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-black text-slate-950 shadow-xl shadow-amber-500/30 border border-amber-300/60 hover:scale-105 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-white animate-spin" />
              <span>🎁 Scratch & Win!</span>
            </button>
          )}

          <CustomerBottomNav storeSlug={storeSlug!} active="home" />
          <CustomerChatWidget storeSlug={storeSlug!} />
        </>)}
    </div>
  )
}
