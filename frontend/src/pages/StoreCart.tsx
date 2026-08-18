import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import api from '../services/api'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import CustomerScratchCardModal, { ScratchCardConfig } from '../components/CustomerScratchCardModal'
import {
  Tag, Sparkles, Check, X, MapPin, Zap, ArrowLeft, Trash2, Plus, Minus,
  ShieldCheck, ShoppingBag, CreditCard, ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react'

export default function StoreCart() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return (
    <StoreCartProvider storeSlug={storeSlug}>
      <CartContent />
    </StoreCartProvider>
  )
}

function CartContent() {
  const { storeSlug } = useParams()
  const navigate = useNavigate()
  const cart = useStoreCart()
  const [store, setStore] = useState<any>(null)
  const [error, setError] = useState('')

  const [customerName, setCustomerName] = useState(() => localStorage.getItem('qs_chat_name') || '')
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('qs_chat_phone') || '')
  const [paymentType, setPaymentType] = useState('COD')
  const [orderType, setOrderType] = useState<'HOME_DELIVERY' | 'STORE_PICKUP'>('HOME_DELIVERY')
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('multistore_user_delivery_address') || '')
  const [locationUrl, setLocationUrl] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)

  // Coupons State
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([])
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  const [showScratchModal, setShowScratchModal] = useState(false)
  const [scratchConfig, setScratchConfig] = useState<ScratchCardConfig | null>(null)

  useEffect(() => {
    if (!store?.id) return
    try {
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
      setScratchConfig(config)
    } catch {}
  }, [store?.id])

  useEffect(() => {
    if (customerName.trim()) localStorage.setItem('qs_chat_name', customerName.trim())
    else localStorage.removeItem('qs_chat_name')
  }, [customerName])

  useEffect(() => {
    if (customerPhone.trim()) localStorage.setItem('qs_chat_phone', customerPhone.trim())
    else localStorage.removeItem('qs_chat_phone')
  }, [customerPhone])

  useEffect(() => {
    if (deliveryAddress.trim()) {
      localStorage.setItem('multistore_user_delivery_address', deliveryAddress.trim())
    }
  }, [deliveryAddress])

  useEffect(() => {
    api.get(`/public/stores/${storeSlug}/`)
      .then(res => {
        const data = res.data.data || res.data
        setStore(data)
        if (data?.allow_home_delivery === false && data?.allow_store_pickup !== false) {
          setOrderType('STORE_PICKUP')
        } else {
          setOrderType('HOME_DELIVERY')
        }
        if (data?.name) {
          document.title = `Cart - ${data.name}`
        }
      })
      .catch(() => setError('Store details could not be loaded.'))

    api.get(`/public/stores/${storeSlug}/coupons/`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setAvailableCoupons(res.data)
        } else if (res.data && Array.isArray(res.data.results)) {
          setAvailableCoupons(res.data.results)
        } else {
          setAvailableCoupons([])
        }
      })
      .catch(() => setAvailableCoupons([]))
  }, [storeSlug])

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
    } catch {}
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
      } catch {}
    }

    const handleUpdate = (e: any) => {
      setFlashSale(e.detail)
    }
    window.addEventListener('qs-flash-sale-updated', handleUpdate)
    return () => window.removeEventListener('qs-flash-sale-updated', handleUpdate)
  }, [store?.id, storeSlug])

  // Auto-populate input with claimed coupon only if not manually removed by customer
  useEffect(() => {
    if (!storeSlug) return
    try {
      const isRemoved = sessionStorage.getItem(`qs_user_removed_coupon_${storeSlug}`) === 'true'
      if (isRemoved) return

      const savedClaimed = localStorage.getItem(`qs_claimed_coupon_${storeSlug}`)
      if (savedClaimed && (!appliedCoupons || appliedCoupons.length === 0) && !couponInput) {
        const parsed = JSON.parse(savedClaimed)
        if (parsed?.code) {
          setCouponInput(parsed.code)
        }
      }
    } catch {}
  }, [storeSlug, appliedCoupons, couponInput])

  const applyCouponCode = async (codeToApply: string) => {
    const code = codeToApply.trim().toUpperCase()
    if (!code) {
      setCouponError('Please enter a coupon code.')
      return
    }

    if (appliedCoupons.some(c => c.code?.toUpperCase() === code)) {
      setCouponError(`Coupon ${code} is already applied!`)
      return
    }

    if (storeSlug) {
      try {
        sessionStorage.removeItem(`qs_user_removed_coupon_${storeSlug}`)
      } catch {}
    }

    setCouponError('')
    setCouponSuccess('')
    setValidatingCoupon(true)

    // Load seller-configured scratch card settings if applicable
    let scratchVal = 50
    let scratchType = 'FIXED'
    let scratchMin = 0

    try {
      const scratchSaved = store?.id ? localStorage.getItem(`qs_scratch_config_${store.id}`) : null
      if (scratchSaved) {
        const parsed = JSON.parse(scratchSaved)
        scratchVal = parsed.discountValue || 50
        scratchType = parsed.discountType === 'percentage' ? 'PERCENTAGE' : 'FIXED'
        scratchMin = parsed.minOrder || 0
      }
    } catch {}

    // Check min_order_amount locally if available in availableCoupons
    const localCoupon = (availableCoupons || []).find((c: any) => c.code?.toUpperCase() === code)
    if (localCoupon && localCoupon.min_order_amount && cart.total < Number(localCoupon.min_order_amount)) {
      setCouponError(`Minimum order amount of ₹${Number(localCoupon.min_order_amount).toFixed(2)} required for coupon ${code}. (Current total: ₹${cart.total.toFixed(2)})`)
      setValidatingCoupon(false)
      return
    }

    try {
      const res = await api.post(`/public/stores/${storeSlug}/validate-coupon/`, {
        code,
        subtotal: cart.total,
        items: cart.items.map(item => ({ id: item.id, quantity: item.quantity })),
        is_scratch: scratchConfig?.enabled && scratchConfig?.couponCode?.toUpperCase() === code,
        scratch_discount_value: scratchVal,
        scratch_discount_type: scratchType,
        scratch_min_order: scratchMin
      })

      if (res.data?.valid) {
        const discAmt = Number(res.data.discount_amount || res.data.discount || 0)
        const newCoupon = {
          ...res.data,
          code: res.data.code || code,
          discount_amount: discAmt
        }
        setAppliedCoupons(prev => [...prev.filter(c => c.code?.toUpperCase() !== code), newCoupon])
        setCouponSuccess(`Coupon ${newCoupon.code} applied! Saved ₹${newCoupon.discount_amount.toFixed(2)}`)
        setCouponInput('')
      } else {
        setCouponError(res.data?.detail || `Invalid or expired coupon code ${code}.`)
      }
    } catch (err: any) {
      const backendError = err.response?.data?.detail || err.response?.data?.message
      if (backendError) {
        setCouponError(backendError)
      } else if (scratchConfig?.enabled && scratchConfig?.couponCode?.toUpperCase() === code) {
        if (cart.total < scratchMin) {
          setCouponError(`Minimum order amount of ₹${scratchMin} required for Scratch Card reward coupon.`)
        } else {
          const fallbackDisc = scratchType === 'PERCENTAGE' ? (cart.total * scratchVal) / 100 : scratchVal
          const finalDisc = Math.min(fallbackDisc, cart.total)
          const newCoupon = {
            valid: true,
            code: code,
            discount_amount: finalDisc,
            discount_type: scratchType,
            discount_value: scratchVal
          }
          setAppliedCoupons(prev => [...prev.filter(c => c.code?.toUpperCase() !== code), newCoupon])
          setCouponSuccess(`Coupon ${code} applied! Saved ₹${finalDisc.toFixed(2)}`)
          setCouponInput('')
        }
      } else {
        setCouponError(`Invalid or expired coupon code ${code}.`)
      }
    } finally {
      setValidatingCoupon(false)
    }
  }

  const removeAppliedCoupon = (codeToRemove?: string) => {
    if (!codeToRemove) {
      setAppliedCoupons([])
    } else {
      setAppliedCoupons(prev => prev.filter(c => c.code?.toUpperCase() !== codeToRemove.toUpperCase()))
    }
    setCouponSuccess('')
    setCouponError('')
    setCouponInput('')
    if (storeSlug) {
      try {
        localStorage.removeItem(`qs_claimed_coupon_${storeSlug}`)
        sessionStorage.setItem(`qs_user_removed_coupon_${storeSlug}`, 'true')
      } catch {}
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Your browser does not support location access.')
      return
    }
    setError('')
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        setLocationUrl(mapsUrl)
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
          const place = await response.json()
          const detected = place.display_name || `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setDeliveryAddress(detected)
          localStorage.setItem('multistore_user_delivery_address', detected)
        } catch {
          const fallback = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          setDeliveryAddress(fallback)
          localStorage.setItem('multistore_user_delivery_address', fallback)
        } finally {
          setLocationLoading(false)
        }
      },
      (positionError) => {
        setLocationLoading(false)
        if (positionError.code === positionError.PERMISSION_DENIED)
          setError('Location permission denied. Please allow GPS access in settings.')
        else if (positionError.code === positionError.TIMEOUT)
          setError('Location request timed out. Please try again.')
        else setError('Current location could not be fetched.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function orderOnWhatsApp() {
    const trimmedName = customerName.trim()
    const trimmedPhone = customerPhone.trim()
    const number = String(store?.phone_number || '').replace(/\D/g, '')

    if (!trimmedPhone) {
      setError('WhatsApp phone number is required to place your order.')
      return
    }
    if (!number) {
      setError('This seller has not added a WhatsApp number yet.')
      return
    }

    try {
      localStorage.setItem('qs_chat_name', trimmedName)
      localStorage.setItem('qs_chat_phone', trimmedPhone)

      const flashSaleDiscount = (flashSale?.active && flashSale?.discount > 0)
        ? (cart.total * (flashSale.discount / 100))
        : 0
      const couponDiscount = appliedCoupons.reduce((sum, item) => sum + (Number(item.discount_amount) || Number(item.discount) || 0), 0)
      const totalDiscountAmt = couponDiscount + flashSaleDiscount
      const finalTotal = Math.max(0, cart.total - totalDiscountAmt)
      const appliedCodes = appliedCoupons.map(c => c.code).join(', ')

      const finalDeliveryAddress = orderType === 'STORE_PICKUP'
        ? `🏪 Walk-in Store Pickup (Customer will collect from shop: ${store?.address || store?.name})`
        : deliveryAddress

      const result = await api.post(`/public/stores/${storeSlug}/whatsapp-orders/`, {
        items: cart.items.map(item => ({ id: item.id, quantity: item.quantity })),
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        payment_type: paymentType,
        delivery_address: finalDeliveryAddress,
        location_url: locationUrl,
        coupon_code: appliedCodes,
        discount_amount: totalDiscountAmt,
      })
      const order = result.data
      const orderHistoryKey = `qs_customer_orders_${storeSlug}`
      const savedOrders = JSON.parse(localStorage.getItem(orderHistoryKey) || '[]')
      const entry = { reference: order.reference, total: finalTotal, status: order.status, created_at: order.created_at }
      localStorage.setItem(orderHistoryKey, JSON.stringify([entry, ...savedOrders.filter((item: any) => item.reference !== order.reference)].slice(0, 30)))
      const paymentLabel = order.payment_type === 'ONLINE' ? 'Online Payment' : 'COD'
      const fulfillmentLabel = orderType === 'STORE_PICKUP' ? '🏪 Walk-in Store Pickup' : '🚚 Home Delivery'
      const trackingUrl = `${window.location.origin}/store/${storeSlug}/order/${order.reference}`

      const lines = [
        `🛒 New ${paymentLabel} Order #${order.reference}`,
        `📦 Order Type: ${fulfillmentLabel}`,
        `Customer: ${order.customer_name || 'Not provided'}`,
        ...(order.customer_phone ? [`Phone: ${order.customer_phone}`] : []),
        `Items: ${order.items.map((item: any) => `${item.name} × ${item.quantity}`).join(', ')}`,
        `Subtotal: ₹${cart.total.toFixed(2)}`,
        ...(flashSale?.active && flashSaleDiscount > 0 ? [`⚡ Flash Sale (${flashSale.discount}% OFF): -₹${flashSaleDiscount.toFixed(2)}`] : []),
        ...(appliedCoupons.length > 0 ? [`🎟️ Coupons (${appliedCodes}): -₹${couponDiscount.toFixed(2)}`] : []),
        `Total Payable: ₹${finalTotal.toFixed(2)}`,
        ...(orderType === 'STORE_PICKUP' ? [`Pickup Shop Address: ${store?.address || store?.name}`] : (order.delivery_address ? [`Delivery Address: ${order.delivery_address}`] : [])),
        ...(order.location_url ? [`GPS Location: ${order.location_url}`] : []),
        `\n📌 Track Order Live & Invoice:`,
        `${trackingUrl}`
      ]
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer')

      cart.clear()
      navigate(`/store/${storeSlug}/order/${order.reference}`)
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || 'Order could not be created. Please try again.')
    }
  }

  const mediaUrl = (url: string) => url?.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`
  const flashSaleDiscountAmount = (flashSale?.active && flashSale?.discount > 0) ? (cart.total * (flashSale.discount / 100)) : 0
  const couponDiscountAmount = appliedCoupons.reduce((sum, item) => sum + (Number(item.discount_amount) || Number(item.discount) || 0), 0)
  const discountAmount = couponDiscountAmount + flashSaleDiscountAmount
  const finalTotalAmount = Math.max(0, cart.total - discountAmount)

  // Empty Cart View
  if (!cart.items.length) {
    return (
      <div className="mx-auto min-h-screen w-full bg-slate-50 pb-28 text-xs sm:text-sm font-sans flex flex-col justify-between">
        <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6">
            <Link to={`/store/${storeSlug}`} className="flex items-center gap-2 text-white hover:text-indigo-400">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-bold text-xs sm:text-sm">Back to Store</span>
            </Link>
            <h1 className="font-extrabold text-sm sm:text-base">Shopping Cart</h1>
            <NotificationBellHeader />
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-4xl shadow-inner">
              🛍️
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900">Your Cart is Empty</h2>
              <p className="text-xs text-slate-500 font-medium">
                Looks like you haven't added any products to your cart yet.
              </p>
            </div>
            <Link
              to={`/store/${storeSlug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-xs font-black text-white shadow-md hover:scale-105 transition-all"
            >
              <span>Explore Products</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <CustomerBottomNav storeSlug={storeSlug!} active="cart" />
        <CustomerChatWidget storeSlug={storeSlug!} />
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 pb-44 lg:pb-16 text-xs sm:text-sm font-sans">

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              to={`/store/${storeSlug}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
                {store?.name || 'Store'}
              </p>
              <h1 className="font-extrabold text-xs sm:text-sm text-white">
                My Shopping Cart ({cart.count})
              </h1>
            </div>
          </div>
          <NotificationBellHeader />
        </div>

        {/* Flipkart / Amazon Style Checkout Progress Stepper */}
        <div className="bg-slate-900 border-t border-slate-800/80 px-3 py-1.5 text-[10px] sm:text-xs">
          <div className="mx-auto max-w-7xl flex items-center justify-center gap-4 sm:gap-12">
            <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[9px]">1</span>
              <span>Cart Summary</span>
            </div>
            <span className="h-0.5 w-6 bg-slate-700 sm:w-12 rounded" />
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[9px]">2</span>
              <span>Delivery Details</span>
            </div>
            <span className="h-0.5 w-6 bg-slate-700 sm:w-12 rounded" />
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-slate-400 text-[9px]">3</span>
              <span>Place Order</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (2 COLUMNS ON DESKTOP, SINGLE COLUMN ON MOBILE) */}
      <main className="mx-auto max-w-7xl p-2.5 sm:p-5 lg:pt-6">
        <div className="grid lg:grid-cols-12 lg:gap-6 space-y-4 lg:space-y-0">

          {/* LEFT COLUMN: ITEMS LIST & CUSTOMER DELIVERY FORM */}
          <div className="lg:col-span-7 space-y-3.5">

            {/* Ultra Premium Celebratory Savings Hero Banner */}
            {discountAmount > 0 && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-3.5 sm:p-4 text-white shadow-xl shadow-emerald-600/25 border-2 border-emerald-400 animate-pulse">
                {/* Background Shimmer Effect */}
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner border border-white/30">
                      🎉
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-white tracking-wider uppercase drop-shadow-xs">
                          TOTAL SAVINGS UNLOCKED!
                        </span>
                        <Sparkles className="h-4 w-4 text-amber-300 animate-bounce" />
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-emerald-100 mt-0.5 leading-tight">
                        Woohoo! You are saving <span className="bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-lg font-black text-sm sm:text-base shadow-md inline-block mx-1">₹{discountAmount.toFixed(2)}</span> on this order!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CART ITEMS CARDS LIST */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                <h2 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  <span>Items in Bag ({cart.count})</span>
                </h2>
                <button
                  onClick={() => cart.clear()}
                  className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {cart.items.map((item) => (
                  <div key={item.id} className="p-3 sm:p-4 flex gap-3 items-center hover:bg-slate-50/50 transition-colors">

                    {/* Item Thumbnail */}
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-200/80">
                      {item.image ? (
                        <img
                          src={mediaUrl(item.image)}
                          alt={item.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-3xl">🛍️</span>
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="truncate font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                        {item.name}
                      </h3>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-sm text-slate-950">
                          ₹{item.price}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          In Stock
                        </span>
                      </div>

                      {/* BOGO Offer Active Indicator */}
                      {appliedCoupons.some(c => c.discount_type === 'BOGO' && (!c.product_id || Number(c.product_id) === Number(item.id))) && (
                        <div className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-300 px-2 py-0.5 text-[9px] font-black text-purple-900 shadow-2xs">
                          <span>🎁 Buy 1 Get 1 FREE Applied! (1 Free Item Included)</span>
                        </div>
                      )}

                      {/* Quantity Controller & Remove */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => cart.change(item.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold text-slate-800 hover:bg-slate-200 shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-extrabold text-xs px-1 text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => cart.change(item.id, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold text-slate-800 hover:bg-slate-200 shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => cart.change(item.id, 0)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* CUSTOMER DELIVERY DETAILS FORM */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-3.5">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <span>Delivery Address & Customer Info</span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">Provide details for instant delivery tracking</p>
                </div>
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Zap className="h-3 w-3 fill-emerald-600" /> Express
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Fulfillment Selection (Home Delivery vs Walk-in Store Pickup) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Select Fulfillment Option *</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {store?.allow_home_delivery !== false && (
                      <button
                        type="button"
                        onClick={() => setOrderType('HOME_DELIVERY')}
                        className={`flex items-center justify-center gap-1.5 p-2 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                          orderType === 'HOME_DELIVERY'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs">🚚</span>
                        <span>Home Delivery</span>
                      </button>
                    )}

                    {store?.allow_store_pickup !== false && (
                      <button
                        type="button"
                        onClick={() => setOrderType('STORE_PICKUP')}
                        className={`flex items-center justify-center gap-1.5 p-2 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                          orderType === 'STORE_PICKUP'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs">🏪</span>
                        <span>Walk-in / Pickup</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Full Name</label>
                    <input
                      className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">WhatsApp Phone Number *</label>
                    <input
                      className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      inputMode="tel"
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Payment Preference</label>
                  <select
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                  >
                    <option value="COD">💵 Cash on Delivery / Pay at Shop</option>
                    <option value="ONLINE">💳 Online Payment (UPI / Card / NetBanking)</option>
                  </select>
                </div>

                {orderType === 'STORE_PICKUP' ? (
                  <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏪</span>
                      <span className="text-xs font-black text-amber-900">Walk-in Store Pickup Selected</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Customer will collect order directly from shop. No home delivery address required!
                    </p>
                    <p className="text-xs font-extrabold text-slate-900 bg-white p-2 rounded-lg border border-amber-200/80 mt-1">
                      📍 Store Pickup Location: {store?.address || store?.name || 'Shop Location'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Delivery Address</label>
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={locationLoading}
                        className="text-[10px] font-extrabold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="h-3 w-3 text-amber-500" />
                        <span>{locationLoading ? 'Locating…' : 'Use Current GPS'}</span>
                      </button>
                    </div>
                    <textarea
                      className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none min-h-16"
                      placeholder="House/Flat No., Landmark, Pincode"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: OFFERS, PRICE BREAKDOWN & FINAL CHECKOUT */}
          <div className="lg:col-span-5 space-y-3.5">

            {/* COUPON & STORE OFFERS CARD */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-white p-3.5 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Store Coupons & Offers</h3>
                </div>
                {appliedCoupons.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {appliedCoupons.length} Applied
                  </span>
                )}
              </div>

              {/* Applied Coupons Display Banner if Active */}
              {appliedCoupons.length > 0 && (
                <div className="space-y-1.5 rounded-xl bg-emerald-50 border border-emerald-300 p-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      🎉 {appliedCoupons.length} {appliedCoupons.length === 1 ? 'Coupon' : 'Coupons'} Applied!
                    </span>
                    <span className="text-[11px] text-emerald-700 font-black">
                      Total Savings: ₹{couponDiscountAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {appliedCoupons.map((c) => (
                      <div key={c.code} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {c.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700">
                            {c.discount_type === 'BOGO' ? (
                              <span className="text-purple-700 font-extrabold">🎁 BOGO (Buy 1 Get 1 Free) - Saved ₹{Number(c.discount_amount || 0).toFixed(2)}</span>
                            ) : c.discount_type === 'FREE_DELIVERY' ? (
                              <span className="text-sky-700 font-extrabold">🚚 Free Shipping Coupon Applied</span>
                            ) : (
                              `-₹${Number(c.discount_amount || 0).toFixed(2)}`
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAppliedCoupon(c.code)}
                          className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coupon Input & Available Options */}
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon Code"
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase focus:border-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => applyCouponCode(couponInput)}
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:bg-slate-300 transition-all cursor-pointer shrink-0"
                  >
                    {validatingCoupon ? 'Checking…' : 'APPLY'}
                  </button>
                </div>

                {/* Scratch & Win Coupon Button */}
                {scratchConfig?.enabled && (
                  <button
                    type="button"
                    onClick={() => setShowScratchModal(true)}
                    className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/20 via-indigo-500/10 to-amber-500/20 p-2 border border-amber-400/40 text-xs font-black text-amber-900 hover:scale-[1.01] transition-all cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-600 animate-bounce" />
                      <span>🎁 Scratch & Win Welcome Coupon!</span>
                    </span>
                    <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                      SCRATCH NOW →
                    </span>
                  </button>
                )}

                {/* Available Store Coupons Pill Cards */}
                {(() => {
                  const listToRender = [...availableCoupons]
                  if (scratchConfig?.enabled && scratchConfig?.couponCode) {
                    const exists = listToRender.some(c => c.code?.toUpperCase() === scratchConfig.couponCode.toUpperCase())
                    if (!exists) {
                      listToRender.unshift({
                        id: 'scratch_config_card',
                        code: scratchConfig.couponCode,
                        discount_type: scratchConfig.discountType === 'percentage' ? 'PERCENTAGE' : 'FIXED',
                        discount_value: scratchConfig.discountValue,
                        is_scratch: true
                      })
                    }
                  }

                  const applicableCoupons = listToRender.filter((coupon) => {
                    if (!coupon.product_id) return true
                    return cart.items.some((item) => item.id === coupon.product_id)
                  })

                  if (applicableCoupons.length === 0) return null

                  return (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Available Coupons ({applicableCoupons.length}):</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-none">
                        {applicableCoupons.map((coupon) => {
                          const isCurrent = appliedCoupons.some(c => c.code?.toUpperCase() === coupon.code?.toUpperCase())

                          return (
                            <div
                              key={coupon.id}
                              className={`flex items-center justify-between rounded-xl border p-2 text-xs shadow-2xs transition-all ${
                                isCurrent
                                  ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                                  : coupon.is_scratch 
                                  ? 'bg-amber-50/70 border-amber-300/80' 
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="min-w-0 pr-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded border ${
                                    isCurrent
                                      ? 'text-emerald-900 bg-emerald-200 border-emerald-400'
                                      : coupon.is_scratch 
                                      ? 'text-amber-900 bg-amber-200/80 border-amber-400' 
                                      : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                                  }`}>
                                    {coupon.code}
                                  </span>
                                  {coupon.is_scratch && (
                                    <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 rounded">🎁 Scratch Reward</span>
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-700 truncate mt-0.5">
                                  {coupon.discount_type === 'BOGO' ? (
                                    <span className="text-purple-700 font-extrabold">🎁 Buy 1 Get 1 FREE (BOGO)</span>
                                  ) : coupon.discount_type === 'FREE_DELIVERY' ? (
                                    <span className="text-sky-700 font-extrabold">🚚 Free Doorstep Delivery</span>
                                  ) : coupon.discount_type === 'PERCENTAGE' ? (
                                    `${coupon.discount_value}% OFF`
                                  ) : (
                                    `FLAT ₹${coupon.discount_value} OFF`
                                  )}
                                  {Number(coupon.min_order_amount || 0) > 0 && (
                                    <span className="text-amber-700 font-extrabold ml-1.5">• Min Order ₹{coupon.min_order_amount}</span>
                                  )}
                                </p>
                              </div>

                               {(() => {
                                 const minAmt = Number(coupon.min_order_amount || 0)
                                 const isBelowMin = minAmt > 0 && cart.total < minAmt
                                 const needed = minAmt - cart.total

                                 if (isCurrent) {
                                   return (
                                     <button
                                       type="button"
                                       onClick={() => removeAppliedCoupon(coupon.code)}
                                       className="rounded-lg bg-emerald-600 hover:bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                     >
                                       ✓ APPLIED (✕)
                                     </button>
                                   )
                                 }

                                 if (isBelowMin) {
                                   return (
                                     <button
                                       type="button"
                                       disabled
                                       className="rounded-lg bg-slate-100 text-slate-400 border border-slate-200 px-2 py-1 text-[9px] font-bold shrink-0 cursor-not-allowed"
                                       title={`Add ₹${needed.toFixed(2)} more to unlock this coupon`}
                                     >
                                       Add ₹{needed > 1000 ? Math.round(needed) : needed.toFixed(0)} more
                                     </button>
                                   )
                                 }

                                 return (
                                   <button
                                     type="button"
                                     onClick={() => {
                                       setCouponInput(coupon.code)
                                       applyCouponCode(coupon.code)
                                     }}
                                     className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-extrabold text-white hover:bg-indigo-500 cursor-pointer shrink-0 shadow-2xs"
                                   >
                                     + APPLY
                                   </button>
                                 )
                               })()}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* FLIPKART STYLE PRICE DETAILS CARD */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Price Details ({cart.count} {cart.count === 1 ? 'item' : 'items'})
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Price ({cart.count} items):</span>
                  <span className="font-bold text-slate-900">₹{cart.total.toFixed(2)}</span>
                </div>

                {flashSale?.active && flashSaleDiscountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-extrabold animate-pulse">
                    <span>⚡ Flash Sale ({flashSale.discount}% OFF):</span>
                    <span>-₹{flashSaleDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                {appliedCoupons.map((c) => (
                  <div key={c.code} className="flex justify-between text-emerald-600 font-extrabold">
                    <span>🎟️ Coupon ({c.code}):</span>
                    <span>-₹{Number(c.discount_amount || 0).toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges:</span>
                  <span className="font-extrabold text-emerald-600 uppercase">FREE</span>
                </div>

                <div className="border-t border-slate-200 pt-2.5 flex justify-between text-sm font-black text-slate-950">
                  <span>Total Payable:</span>
                  <span className="text-indigo-600 text-base">₹{finalTotalAmount.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 p-3 text-center text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-600/20 border border-emerald-400">
                    🎉 Woohoo! You are saving <span className="bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-md text-xs sm:text-sm font-black shadow-xs mx-1 inline-block">₹{discountAmount.toFixed(2)}</span> on this order!
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-800 border border-amber-200">
                  ⚠️ {error}
                </div>
              )}

              {/* CHECKOUT BUTTON (VISIBLE ON ALL MOBILE & DESKTOP SCREENS) */}
              <button
                onClick={orderOnWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500 active:scale-98 transition-all cursor-pointer mt-2"
              >
                <span>Order Now ↗ (₹{finalTotalAmount.toFixed(2)})</span>
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* MOBILE STICKY CHECKOUT BAR (FLOATS ABOVE BOTTOM NAV) */}
      <div className="fixed bottom-[50px] sm:bottom-[58px] left-0 right-0 z-45 lg:hidden bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-3.5 py-2 text-white shadow-[0_-10px_25px_rgba(0,0,0,0.3)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Payable</p>
            <p className="text-sm sm:text-base font-black text-amber-300 leading-none">
              ₹{finalTotalAmount.toFixed(2)}
            </p>
          </div>

          <button
            onClick={orderOnWhatsApp}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span>Order Now ↗</span>
          </button>
        </div>
      </div>

      {/* Scratch Card Modal on Cart Page */}
      {showScratchModal && scratchConfig && store && (
        <CustomerScratchCardModal
          config={scratchConfig}
          storeName={store.name}
          onClaimCoupon={(code) => {
            setCouponInput(code)
            applyCouponCode(code)
          }}
          onClose={() => setShowScratchModal(false)}
        />
      )}

      <CustomerBottomNav storeSlug={storeSlug!} active="cart" />
      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
