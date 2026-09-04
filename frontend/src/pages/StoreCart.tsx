import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import api from '../services/api'
import { sendMsg91WidgetOtp, verifyMsg91WidgetOtp } from '../context/AuthContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import CustomerScratchCardModal, { ScratchCardConfig } from '../components/CustomerScratchCardModal'
import InstallAppButton from '../pwa/InstallAppButton'
import {
  Tag, Sparkles, Check, X, MapPin, Zap, ArrowLeft, Trash2, Plus, Minus,
  ShieldCheck, ShoppingBag, CreditCard, ChevronRight, CheckCircle2, AlertCircle, Smartphone
} from 'lucide-react'
import StoreOfflinePage from './StoreOfflinePage'
import { isStoreOffline } from '../utils/storeStatus'
import { getBusinessType, formatUnitDisplay, getCartLabels } from '../utils/businessTypes'

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
  const [storeOffline, setStoreOffline] = useState(false)

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    localStorage.getItem('multistore-installed-type') === 'customer'
  )

  const [customerName, setCustomerName] = useState(() => localStorage.getItem('qs_chat_name') || '')
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('qs_chat_phone') || '')
  const [paymentType, setPaymentType] = useState('COD')
  const [orderType, setOrderType] = useState<'HOME_DELIVERY' | 'STORE_PICKUP'>('HOME_DELIVERY')
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('multistore_user_delivery_address') || '')
  const [locationUrl, setLocationUrl] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [checkoutOtp, setCheckoutOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [checkoutVerificationToken, setCheckoutVerificationToken] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [utrInput, setUtrInput] = useState('')
  const [showOnlineQrModal, setShowOnlineQrModal] = useState(false)
  
  let cartLabels = getCartLabels(store?.business_type)
  
  // ⚡ HYBRID SMART CART LOGIC: If a Photo Studio cart only has physical products (Album, Frame), revert to normal Order labels!
  if (store?.business_type === 'PHOTO_STUDIO') {
    const hasService = cart.items.some(item => ['day', 'hour', 'event', 'shoot', 'session', 'month'].includes(item.unit?.toLowerCase() || ''))
    if (!hasService) {
      cartLabels = getCartLabels('GENERAL') // Fallback to ADD, Shopping Cart, Order etc.
    }
  }

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
    } catch { }
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
      .catch((error) => {
        if (isStoreOffline(error)) {
          setStoreOffline(true)
          document.title = 'Store Under Maintenance'
        } else {
          setError('Store details could not be loaded.')
        }
      })

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
    } catch { }
    return { active: false, discount: 25, title: '⚡ EVENING CLEARANCE FLASH SALE IS LIVE!' }
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
    } catch { }
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
      } catch { }
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
    } catch { }

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
      } catch { }
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

  async function sendCheckoutOtp() {
    const phone = customerPhone.trim()
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) { setError('Enter a valid 10-digit phone number first.'); return }
    setOtpLoading(true); setError('')
    try { await sendMsg91WidgetOtp(phone); await api.post(`/public/stores/${storeSlug}/checkout-phone/send-otp/`, { phone_number: phone }); setOtpSent(true); setCheckoutVerificationToken('') }
    catch (err: any) { setError(err?.response?.data?.detail || err?.message || 'Could not send OTP.') }
    finally { setOtpLoading(false) }
  }

  async function verifyCheckoutOtp() {
    setOtpLoading(true); setError('')
    try { const accessToken = await verifyMsg91WidgetOtp(checkoutOtp); const response = await api.post(`/public/stores/${storeSlug}/checkout-phone/verify-otp/`, { phone_number: customerPhone.trim(), access_token: accessToken }); setCheckoutVerificationToken(response.data.verification_token); setOtpSent(false) }
    catch (err: any) { setError(err?.response?.data?.detail || 'Invalid or expired OTP.') }
    finally { setOtpLoading(false) }
  }

  async function handlePlaceOrder(openWhatsApp: boolean = true) {
    const trimmedName = customerName.trim()
    const trimmedPhone = customerPhone.trim()
    const number = String(store?.phone_number || '').replace(/\D/g, '')

    if (!trimmedPhone) {
      setError('Mobile phone number is required to place your order.')
      return
    }
    if (!checkoutVerificationToken) {
      setError('Verify your phone number with OTP before placing the order.')
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
      const appliedCodes = appliedCoupons.map(c => c.code).join(', ')

      const finalDeliveryAddress = orderType === 'STORE_PICKUP'
        ? (cartLabels.addButton === 'BOOK' 
            ? `📸 Studio/Shop Visit (Customer will visit the studio/shop: ${store?.address || store?.name})`
            : `🏪 Walk-in Store Pickup (Customer will collect from shop: ${store?.address || store?.name})`)
        : deliveryAddress

      const result = await api.post(`/public/stores/${storeSlug}/whatsapp-orders/`, {
        items: cart.items.map(item => ({ id: item.id, quantity: item.quantity })),
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        checkout_verification_token: checkoutVerificationToken,
        payment_type: paymentType,
        utr_number: utrInput.trim(),
        delivery_address: finalDeliveryAddress,
        location_url: locationUrl,
        coupon_code: appliedCodes,
        discount_amount: totalDiscountAmt,
      })
      const order = result.data
      if (trimmedPhone) {
        localStorage.setItem(`qs_customer_phone_${storeSlug}`, trimmedPhone)
        localStorage.setItem(`qs_chat_phone`, trimmedPhone)
      }

      if (openWhatsApp && number) {
        const paymentLabel = order.payment_type === 'ONLINE' ? 'Online payment' : 'Cash on delivery'
        const fulfillmentLabel = orderType === 'STORE_PICKUP' ? 'Store pickup' : 'Home delivery'
        const itemLines = order.items.map((item: any) => {
          const unitPrice = Number(item.price || 0)
          const quantity = Number(item.quantity || 1)
          return `• ${item.name || 'Item'} × ${quantity} ${formatUnitDisplay(item.unit) || ''} — ₹${(unitPrice * quantity).toFixed(2)}`
        })
        const itemSubtotal = order.items.reduce((total: number, item: any) => total + (Number(item.price || 0) * Number(item.quantity || 1)), 0)

        const bTypeConfig = getBusinessType(store?.business_type)
        const lines = [
          `*NEW ORDER* #${order.reference}`,
          '',
          '*Customer details*',
          `Name: ${order.customer_name || 'Customer'}`,
          `Phone: ${order.customer_phone || trimmedPhone} (Verified ✓)`,
          ...(customNote.trim() && bTypeConfig.customFieldLabel ? [`*${bTypeConfig.customFieldLabel}*: ${customNote.trim()}`] : []),
          '',
          '*Order items*',
          ...itemLines,
          '',
          '*Payment & delivery*',
          `Payment: ${paymentLabel}`,
          `Fulfilment: ${fulfillmentLabel}`,
          ...(orderType === 'STORE_PICKUP'
            ? [`${cartLabels.addButton === 'BOOK' ? 'Service at' : 'Pickup from'}: ${store?.address || store?.name || 'Store location'}`]
            : [`${cartLabels.addButton === 'BOOK' ? 'Venue Address' : 'Delivery address'}: ${order.delivery_address || 'Not provided'}`]),
          ...(order.location_url ? [`Location: ${order.location_url}`] : []),
          '',
          '*Bill summary*',
          `Items subtotal: ₹${itemSubtotal.toFixed(2)}`,
          ...(Number(order.discount_amount || 0) > 0 ? [`Discount: -₹${Number(order.discount_amount).toFixed(2)}`] : []),
          ...(Number(order.delivery_fee || 0) > 0 ? [`Delivery fee: ₹${Number(order.delivery_fee).toFixed(2)}`] : []),
          `*Total payable: ₹${Number(order.total).toFixed(2)}*`,
          '',
          'Please confirm this order with the customer.'
        ]
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer')
      }

      cart.clear()
      navigate(`/store/${storeSlug}/order/${order.reference}?token=${order.tracking_token}`)

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
  if (storeOffline) {
    return <StoreOfflinePage />
  }

  if (!cart.items.length) {
    return (
      <div className="mx-auto min-h-screen w-full bg-slate-50 pb-28 text-xs sm:text-sm font-sans flex flex-col justify-between">
        <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6">
            <Link to={`/store/${storeSlug}`} className="flex items-center gap-2 text-white hover:text-indigo-400">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-bold text-xs sm:text-sm">Back to Store</span>
            </Link>
            <h1 className="font-extrabold text-sm sm:text-base">{cartLabels.cartTitle}</h1>
            <NotificationBellHeader />
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-4xl shadow-inner">
              🛍️
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900">Your {cartLabels.cartTitle} is Empty</h2>
              <p className="text-xs text-slate-500 font-medium">
                Looks like you haven't added any products to your {cartLabels.cartTitle.toLowerCase()} yet.
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
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xs sm:text-sm text-white">
                  My {cartLabels.cartTitle} ({cart.count})
                </h1>
                {isStandalone ? (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                    <Smartphone className="h-2.5 w-2.5 text-emerald-400" />
                    <span>ANDROID PWA APP</span>
                  </span>
                ) : (
                  <InstallAppButton storeSlug={storeSlug!} variant="header_pill" />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isStandalone && (
              <span className="sm:hidden flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                <Smartphone className="h-2.5 w-2.5 text-emerald-400" />
                <span>APP MODE</span>
              </span>
            )}
            <NotificationBellHeader />
          </div>
        </div>

        {/* Flipkart / Amazon Style Checkout Progress Stepper */}
        <div className="bg-slate-900 border-t border-slate-800/80 px-3 py-1.5 text-[10px] sm:text-xs">
          <div className="mx-auto max-w-7xl flex items-center justify-center gap-4 sm:gap-12">
            <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[9px]">1</span>
              <span>{cartLabels.cartTitle} Summary</span>
            </div>
            <span className="h-0.5 w-6 bg-slate-700 sm:w-12 rounded" />
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[9px]">2</span>
              <span>Details</span>
            </div>
            <span className="h-0.5 w-6 bg-slate-700 sm:w-12 rounded" />
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-slate-400 text-[9px]">3</span>
              <span>Submit {cartLabels.addButton === 'BOOK' ? 'Booking' : cartLabels.addButton === 'ENQUIRE' ? 'Inquiry' : 'Order'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (2 COLUMNS ON DESKTOP, SINGLE COLUMN ON MOBILE) */}
      <main className="mx-auto max-w-7xl p-2.5 sm:p-5 lg:pt-6">
        <div className="grid lg:grid-cols-12 lg:gap-6 space-y-4 lg:space-y-0">

          {/* LEFT COLUMN: ITEMS LIST & CUSTOMER DELIVERY FORM */}
          <div className="lg:col-span-7 space-y-3.5">

            {/* Sleek Compact Celebratory Savings Strip */}
            {discountAmount > 0 && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-3 py-2 text-white shadow-md border border-emerald-400/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm shadow-inner border border-white/30">
                    🎉
                  </span>
                  <div className="min-w-0 truncate">
                    <p className="text-[11px] sm:text-xs font-black text-white truncate leading-none">
                      <span className="text-amber-300 uppercase tracking-wide mr-1">SAVINGS UNLOCKED!</span>
                      <span>You save</span>
                      <span className="bg-amber-300 text-slate-950 font-black px-1.5 py-0.5 rounded-md text-xs shadow-xs mx-1 inline-block">
                        ₹{discountAmount.toFixed(2)}
                      </span>
                      <span>on this order</span>
                    </p>
                  </div>
                </div>
                <Sparkles className="h-4 w-4 text-amber-300 shrink-0 animate-bounce" />
              </div>
            )}

            {/* CART ITEMS CARDS LIST */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                <h2 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  <span>Items in {cartLabels.cartTitle.split(' ').pop()} ({cart.count})</span>
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

                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-black text-sm text-slate-950">
                          ₹{item.price}
                        </span>
                        {item.unit && (
                          <span className="text-[9.5px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                            /{formatUnitDisplay(item.unit)}
                          </span>
                        )}
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
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => cart.change(item.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold text-slate-800 hover:bg-slate-200 shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-extrabold text-xs px-1 text-slate-900 flex items-baseline gap-0.5">
                            {item.quantity}
                            {item.unit && <span className="text-[9.5px] font-bold text-slate-600">{formatUnitDisplay(item.unit)}</span>}
                          </span>
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
                        className={`flex items-center justify-center gap-1.5 p-2 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${orderType === 'HOME_DELIVERY'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        <span className="text-xs">{cartLabels.addButton === 'BOOK' ? '📍' : '🚚'}</span>
                        <span>{cartLabels.addButton === 'BOOK' ? 'At My Location' : 'Home Delivery'}</span>
                      </button>
                    )}

                    {store?.allow_store_pickup !== false && (
                      <button
                        type="button"
                        onClick={() => setOrderType('STORE_PICKUP')}
                        className={`flex items-center justify-center gap-1.5 p-2 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${orderType === 'STORE_PICKUP'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        <span className="text-xs">{cartLabels.addButton === 'BOOK' ? '📸' : '🏪'}</span>
                        <span>{cartLabels.addButton === 'BOOK' ? 'At Studio / Shop' : 'Walk-in / Pickup'}</span>
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
                      onChange={(e) => { setCustomerPhone(e.target.value); setCheckoutVerificationToken(''); setOtpSent(false) }}
                    />
                    {checkoutVerificationToken ? <p className="mt-1 text-[10px] font-bold text-emerald-600">✓ Phone number verified</p> : !otpSent ? (
                      <button type="button" onClick={sendCheckoutOtp} disabled={otpLoading} className="mt-1 text-[10px] font-extrabold text-indigo-600 hover:underline disabled:opacity-50">{otpLoading ? 'Sending OTP…' : 'Verify phone with OTP'}</button>
                    ) : (
                      <div className="mt-1 flex gap-1.5"><input value={checkoutOtp} onChange={(e) => setCheckoutOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="Enter OTP" className="min-w-0 flex-1 rounded-lg border border-indigo-200 p-2 text-xs" /><button type="button" onClick={verifyCheckoutOtp} disabled={otpLoading || checkoutOtp.length < 4} className="rounded-lg bg-indigo-600 px-2 text-[10px] font-bold text-white disabled:opacity-50">{otpLoading ? '…' : 'Verify'}</button></div>
                    )}
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

                {paymentType === 'ONLINE' && (
                  <div className="space-y-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                        <span>⚡ Direct Merchant UPI Payment</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        0% Gateway Fee
                      </span>
                    </div>

                    {store?.upi_id ? (
                      <div className="space-y-2.5">
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          Pay directly to <strong className="text-slate-900">{store.upi_name || store.name}</strong> (<span className="font-mono text-indigo-700 font-bold">{store.upi_id}</span>):
                        </p>

                        {/* Mobile App Deep-Link Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          <a
                            href={`intent://pay?pa=${encodeURIComponent(store.upi_id)}&pn=${encodeURIComponent(store.upi_name || store.name)}&am=${finalTotalAmount.toFixed(2)}&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nfc.phone;end`}
                            className="flex items-center justify-center gap-1 rounded-xl bg-white border border-slate-200 p-2 text-[10px] font-black text-slate-800 hover:bg-slate-50 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <span>🔵 GPay</span>
                          </a>
                          <a
                            href={`intent://pay?pa=${encodeURIComponent(store.upi_id)}&pn=${encodeURIComponent(store.upi_name || store.name)}&am=${finalTotalAmount.toFixed(2)}&cu=INR#Intent;scheme=upi;package=com.phonepe.app;end`}
                            className="flex items-center justify-center gap-1 rounded-xl bg-purple-700 text-white p-2 text-[10px] font-black hover:bg-purple-800 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <span>🟣 PhonePe</span>
                          </a>
                          <a
                            href={`intent://pay?pa=${encodeURIComponent(store.upi_id)}&pn=${encodeURIComponent(store.upi_name || store.name)}&am=${finalTotalAmount.toFixed(2)}&cu=INR#Intent;scheme=upi;package=net.one97.paytm;end`}
                            className="flex items-center justify-center gap-1 rounded-xl bg-sky-500 text-white p-2 text-[10px] font-black hover:bg-sky-600 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <span>🔷 Paytm</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setShowOnlineQrModal(true)}
                            className="flex items-center justify-center gap-1 rounded-xl bg-slate-900 text-white p-2 text-[10px] font-black hover:bg-slate-800 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <span>📲 QR / Any UPI</span>
                          </button>
                        </div>

                        {/* UTR Entry Field */}
                        <div className="pt-1">
                          <label className="text-[11px] font-bold text-slate-800 block">
                            12-Digit UPI Transaction UTR / Ref No. (Optional)
                          </label>
                          <input
                            type="text"
                            value={utrInput}
                            onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                            placeholder="e.g. 423456789012"
                            className="w-full mt-1 rounded-xl border border-indigo-200 bg-white p-2.5 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                          />
                          <p className="text-[9.5px] text-slate-500 mt-1">
                            Enter the 12-digit UTR from your payment receipt to attach instant proof!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-indigo-100 text-[11px] text-slate-600">
                        <p className="font-bold text-slate-800">ℹ️ Online Payment Info</p>
                        <p className="mt-0.5">Store owner will provide their official UPI QR code / details on WhatsApp upon order submission.</p>
                      </div>
                    )}
                  </div>
                )}

                {orderType === 'STORE_PICKUP' ? (
                  <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cartLabels.addButton === 'BOOK' ? '📸' : '🏪'}</span>
                      <span className="text-xs font-black text-amber-900">
                        {cartLabels.addButton === 'BOOK' ? 'At Studio / Shop Selected' : 'Walk-in Store Pickup Selected'}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">
                      {cartLabels.addButton === 'BOOK' 
                        ? 'You will visit the studio/shop for the service. No venue address required!'
                        : 'Customer will collect order directly from shop. No home delivery address required!'}
                    </p>
                    <p className="text-xs font-extrabold text-slate-900 bg-white p-2 rounded-lg border border-amber-200/80 mt-1">
                      📍 {cartLabels.addButton === 'BOOK' ? 'Studio/Shop Location' : 'Store Pickup Location'}: {store?.address || store?.name || 'Shop Location'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">
                        {cartLabels.addButton === 'BOOK' ? 'Venue / Location Address' : 'Delivery Address'}
                      </label>
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={locationLoading}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="h-3 w-3" />
                        <span>{locationLoading ? 'Locating...' : 'Use GPS Location'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      placeholder="Street address, house no, landmark, city"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                    />
                  </div>
                )}

                {/* Category-Specific Custom Note / Details Field */}
                {store && getBusinessType(store.business_type).customFieldLabel && (
                  <div className="space-y-1 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-3 border border-indigo-200/80 shadow-2xs">
                    <label className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <span>{getBusinessType(store.business_type).icon}</span>
                      <span>{getBusinessType(store.business_type).customFieldLabel}</span>
                      <span className="text-[9px] font-normal text-indigo-600">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-indigo-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
                      placeholder={getBusinessType(store.business_type).customFieldPlaceholder}
                      value={customNote}
                      onChange={e => setCustomNote(e.target.value)}
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
                              className={`flex items-center justify-between rounded-xl border p-2 text-xs shadow-2xs transition-all ${isCurrent
                                ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                                : coupon.is_scratch
                                  ? 'bg-amber-50/70 border-amber-300/80'
                                  : 'bg-white border-slate-200'
                                }`}
                            >
                              <div className="min-w-0 pr-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded border ${isCurrent
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

              {/* CLEAR TWO CHECKOUT OPTIONS (WHATSAPP vs DIRECT WEB ORDER) */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Select {cartLabels.addButton === 'BOOK' ? 'Booking' : cartLabels.addButton === 'ENQUIRE' ? 'Inquiry' : 'Order'} Mode / {cartLabels.addButton === 'BOOK' ? 'बुकिंग' : cartLabels.addButton === 'ENQUIRE' ? 'चौकशी' : 'ऑर्डर'} करण्याची पद्धत निवडा:
                </p>

                {/* Option 1: WhatsApp Order */}
                <button
                  onClick={() => handlePlaceOrder(true)}
                  className="w-full flex items-center justify-between gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 p-3 text-white shadow-md transition-all cursor-pointer border border-emerald-400/50 active:scale-98"
                >
                  <div className="flex items-center gap-2.5 text-left min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg shadow-inner">
                      💬
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-xs text-white truncate">
                        {cartLabels.addButton === 'BOOK' ? 'Book' : cartLabels.addButton === 'ENQUIRE' ? 'Inquire' : 'Order'} via WhatsApp (व्हॉट्सॲप {cartLabels.addButton === 'BOOK' ? 'बुकिंग' : cartLabels.addButton === 'ENQUIRE' ? 'चौकशी' : 'ऑर्डर'})
                      </h4>
                      <p className="text-[9.5px] text-emerald-100 font-medium truncate">
                        {cartLabels.addButton === 'BOOK' ? 'बुकिंग' : cartLabels.addButton === 'ENQUIRE' ? 'चौकशी' : 'ऑर्डर'} मेसेज दुकानदाराच्या व्हॉट्सॲपवर पाठवा
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-black bg-white/20 px-2 py-1 rounded-lg">
                    ₹{finalTotalAmount.toFixed(2)} ↗
                  </span>
                </button>

                {/* Option 2: Direct Web Order */}
                <button
                  onClick={() => handlePlaceOrder(false)}
                  className="w-full flex items-center justify-between gap-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 p-3 text-white shadow-md transition-all cursor-pointer border border-indigo-400/50 active:scale-98"
                >
                  <div className="flex items-center gap-2.5 text-left min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg shadow-inner">
                      💳
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-xs text-white truncate">
                        Direct Web {cartLabels.addButton === 'BOOK' ? 'Booking' : cartLabels.addButton === 'ENQUIRE' ? 'Inquiry' : 'Order'} (डायरेक्ट ऑनलाईन {cartLabels.addButton === 'BOOK' ? 'बुकिंग' : cartLabels.addButton === 'ENQUIRE' ? 'चौकशी' : 'ऑर्डर'})
                      </h4>
                      <p className="text-[9.5px] text-indigo-100 font-medium truncate">व्हॉट्सॲपशिवाय थेट साईटवरूनच {cartLabels.addButton === 'BOOK' ? 'बुकिंग' : cartLabels.addButton === 'ENQUIRE' ? 'चौकशी' : 'ऑर्डर'} करा</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-black bg-white/20 px-2 py-1 rounded-lg">
                    ₹{finalTotalAmount.toFixed(2)} ↗
                  </span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

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

      {/* CUSTOMER BOTTOM NAV WITH INTEGRATED ULTRA-MICRO MOBILE CHECKOUT BAR */}
      <CustomerBottomNav
        storeSlug={storeSlug!}
        active="cart"
        topBar={
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 py-0">
            <div className="flex items-center gap-1.5 leading-none min-w-0">
              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-tight shrink-0">
                {isStandalone ? '📱 Total:' : 'Total:'}
              </span>
              <span className="text-xs font-black text-emerald-400 shrink-0">
                ₹{finalTotalAmount.toFixed(2)}
              </span>
              {discountAmount > 0 && (
                <span className="text-[7.5px] font-black text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1 py-0.2 rounded truncate">
                  Saved ₹{Math.round(discountAmount)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handlePlaceOrder(true)}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 px-2 py-1 text-[9.5px] font-black text-white cursor-pointer active:scale-95"
                title={`${cartLabels.addButton === 'BOOK' ? 'Book' : cartLabels.addButton === 'ENQUIRE' ? 'Inquire' : 'Order'} via WhatsApp`}
              >
                <span>💬 WhatsApp</span>
              </button>
              <button
                onClick={() => handlePlaceOrder(false)}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 px-2 py-1 text-[9.5px] font-black text-white cursor-pointer active:scale-95"
                title={`Direct Web ${cartLabels.addButton === 'BOOK' ? 'Booking' : cartLabels.addButton === 'ENQUIRE' ? 'Inquiry' : 'Order'}`}
              >
                <span>💳 Web {cartLabels.addButton === 'BOOK' ? 'Book' : cartLabels.addButton === 'ENQUIRE' ? 'Inquire' : 'Order'}</span>
              </button>
            </div>
          </div>
        }
      />
      {/* ONLINE PAYMENTS DYNAMIC UPI QR MODAL */}
      {showOnlineQrModal && store?.upi_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>📲 Scan UPI QR Code to Pay</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOnlineQrModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-indigo-200 bg-white p-2 shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${store.upi_id}&pn=${store.upi_name || store.name}&am=${finalTotalAmount.toFixed(2)}&cu=INR`)}`}
                  alt="Merchant UPI QR Code"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 space-y-0.5 text-xs">
                <p className="font-extrabold text-indigo-950">{store.upi_name || store.name}</p>
                <p className="font-mono text-[11px] text-indigo-700 font-bold">{store.upi_id}</p>
                <p className="text-sm font-black text-slate-900 mt-1">Amount: ₹{finalTotalAmount.toFixed(2)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOnlineQrModal(false)}
              className="w-full rounded-2xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-md transition-all cursor-pointer"
            >
              Done & Return to Checkout
            </button>
          </div>
        </div>
      )}

      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
