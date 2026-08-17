import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import api from '../services/api'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import { Tag, Sparkles, Check, X, Percent, IndianRupee, MapPin, Zap } from 'lucide-react'

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
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('multistore_user_delivery_address') || '')
  const [locationUrl, setLocationUrl] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)

  // Coupons State
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)

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
      .then(res => setStore(res.data.data || res.data))
      .catch(() => setError('Store details could not be loaded.'))

    api.get(`/public/stores/${storeSlug}/coupons/`)
      .then(res => setAvailableCoupons(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
  }, [storeSlug])

  const applyCouponCode = async (codeToApply: string) => {
    const code = codeToApply.trim().toUpperCase()
    if (!code) {
      setCouponError('Please enter a coupon code.')
      return
    }

    setCouponError('')
    setCouponSuccess('')
    setValidatingCoupon(true)

    try {
      const res = await api.post(`/public/stores/${storeSlug}/validate-coupon/`, {
        code,
        subtotal: cart.total,
        items: cart.items.map(item => ({ id: item.id, quantity: item.quantity }))
      })

      if (res.data?.valid) {
        setAppliedCoupon(res.data)
        setCouponSuccess(`Coupon ${res.data.code} applied! Saved ₹${res.data.discount_amount.toFixed(2)}`)
        setCouponInput('')
      } else {
        setCouponError(res.data?.detail || 'Invalid coupon code.')
      }
    } catch (err: any) {
      setAppliedCoupon(null)
      setCouponError(err.response?.data?.detail || 'Coupon code invalid or subtotal too low.')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const removeAppliedCoupon = () => {
    setAppliedCoupon(null)
    setCouponSuccess('')
    setCouponError('')
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
          setError('Location permission was denied. Allow Location for this site in your browser settings, then try again.')
        else if (positionError.code === positionError.TIMEOUT)
          setError('Location request timed out. Turn on GPS and try again.')
        else setError('Your current location could not be found. Turn on GPS and try again.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function orderOnWhatsApp() {
    const trimmedName = customerName.trim()
    const trimmedPhone = customerPhone.trim()
    const number = String(store?.phone_number || '').replace(/\D/g, '')

    if (!trimmedPhone) {
      setError('WhatsApp phone number is required to place this order and start live chat.')
      return
    }
    if (!number) {
      setError('This seller has not added a WhatsApp order number yet. Please contact the store directly.')
      return
    }

    try {
      localStorage.setItem('qs_chat_name', trimmedName)
      localStorage.setItem('qs_chat_phone', trimmedPhone)

      const discountAmt = appliedCoupon ? appliedCoupon.discount_amount : 0
      const finalTotal = Math.max(0, cart.total - discountAmt)

      const result = await api.post(`/public/stores/${storeSlug}/whatsapp-orders/`, {
        items: cart.items.map(item => ({ id: item.id, quantity: item.quantity })),
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        payment_type: paymentType,
        delivery_address: deliveryAddress,
        location_url: locationUrl,
        coupon_code: appliedCoupon ? appliedCoupon.code : '',
        discount_amount: discountAmt,
      })
      const order = result.data
      const orderHistoryKey = `qs_customer_orders_${storeSlug}`
      const savedOrders = JSON.parse(localStorage.getItem(orderHistoryKey) || '[]')
      const entry = { reference: order.reference, total: finalTotal, status: order.status, created_at: order.created_at }
      localStorage.setItem(orderHistoryKey, JSON.stringify([entry, ...savedOrders.filter((item: any) => item.reference !== order.reference)].slice(0, 30)))
      const paymentLabel = order.payment_type === 'ONLINE' ? 'Online Payment' : 'COD'
      const trackingUrl = `${window.location.origin}/store/${storeSlug}/order/${order.reference}`
      
      const lines = [
        `🛒 New ${paymentLabel} Order #${order.reference}`,
        `Customer: ${order.customer_name || 'Not provided'}`,
        ...(order.customer_phone ? [`Phone: ${order.customer_phone}`] : []),
        `Items: ${order.items.map((item: any) => `${item.name} × ${item.quantity}`).join(', ')}`,
        `Subtotal: ₹${cart.total.toFixed(2)}`,
        ...(appliedCoupon ? [`Coupon (${appliedCoupon.code}): -₹${discountAmt.toFixed(2)}`] : []),
        `Total Payable: ₹${finalTotal.toFixed(2)}`,
        ...(order.delivery_address ? [`Delivery Address: ${order.delivery_address}`] : []),
        ...(order.location_url ? [`Location: ${order.location_url}`] : []),
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

  if (!cart.items.length) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 p-5 pb-32 lg:max-w-none lg:w-full">
        <Link to={`/store/${storeSlug}`} className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
          ← Continue Shopping
        </Link>
        <div className="rounded-3xl border border-slate-200 bg-white mt-6 p-8 text-center shadow-xl space-y-3">
          <div className="text-5xl">🛍️</div>
          <h1 className="text-xl font-black text-slate-900">Your Shopping Cart is Empty</h1>
          <p className="text-xs text-slate-500">Explore products and add items to your cart.</p>
          <Link
            to={`/store/${storeSlug}`}
            className="inline-block rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-black text-white shadow-lg hover:bg-indigo-700 transition-all"
          >
            Browse Products
          </Link>
        </div>
        <CustomerBottomNav storeSlug={storeSlug!} active="cart" />
        <CustomerChatWidget storeSlug={storeSlug!} />
      </div>
    )
  }

  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0
  const finalTotalAmount = Math.max(0, cart.total - discountAmount)

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32 lg:max-w-none lg:w-full">
      <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <Link to={`/store/${storeSlug}`} className="text-xl font-bold hover:text-indigo-300">
            ←
          </Link>
          <div>
            <p className="text-xs font-semibold text-indigo-300">Checkout Cart</p>
            <h1 className="font-extrabold text-base">Order Summary</h1>
          </div>
        </div>
        <NotificationBellHeader />
      </header>

      <main className="space-y-4 p-4">
        {/* Cart Items List */}
        <div className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md flex gap-3.5 items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 border border-slate-200">
                {item.image ? (
                  <img
                    src={item.image.startsWith('http') ? item.image : `${window.location.protocol}//${window.location.hostname}:8000${item.image}`}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🛍️</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-xs text-slate-900">{item.name}</p>
                <p className="mt-0.5 font-black text-sm text-indigo-600">₹{item.price}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => cart.change(item.id, item.quantity - 1)}
                    className="h-7 w-7 rounded-xl bg-slate-100 font-black text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                  >
                    −
                  </button>
                  <span className="font-extrabold text-xs text-slate-900">{item.quantity}</span>
                  <button
                    onClick={() => cart.change(item.id, item.quantity + 1)}
                    className="h-7 w-7 rounded-xl bg-slate-100 font-black text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Flipkart / Amazon Style Coupons & Offers Section */}
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-900">Apply Coupon / Offer Code</h2>
          </div>

          {/* Applied Coupon Display */}
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-300 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs">✓</span>
                <div className="truncate">
                  <p className="text-xs font-black text-emerald-900">Coupon "{appliedCoupon.code}" Applied!</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">You saved ₹{appliedCoupon.discount_amount.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={removeAppliedCoupon}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 cursor-pointer shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. FLAT50)"
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={() => applyCouponCode(couponInput)}
                  disabled={validatingCoupon || !couponInput.trim()}
                  className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 disabled:bg-slate-300 transition-all cursor-pointer shrink-0 shadow-md"
                >
                  {validatingCoupon ? 'Validating…' : 'APPLY'}
                </button>
              </div>

              {couponError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-2xl border border-rose-200">
                  ⚠️ {couponError}
                </p>
              )}

              {/* Available Store Coupons Carousel / Grid */}
              {(() => {
                const applicableCoupons = availableCoupons.filter((coupon) => {
                  if (!coupon.product_id) return true
                  return cart.items.some((item) => item.id === coupon.product_id)
                })

                if (applicableCoupons.length === 0) return null

                return (
                  <div className="space-y-2 pt-1 border-t border-indigo-100">
                    <p className="text-[11px] font-black uppercase text-indigo-900 tracking-wider">Available Store Offers:</p>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {applicableCoupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="flex items-center justify-between rounded-2xl bg-white border border-indigo-200 p-3 shadow-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                              {coupon.code}
                            </span>
                            <p className="mt-1 text-[11px] font-bold text-slate-700">
                              {coupon.discount_type === 'PERCENTAGE'
                                ? `${coupon.discount_value}% OFF`
                                : `FLAT ₹${coupon.discount_value} OFF`}
                              {coupon.product_name ? ` (Only for ${coupon.product_name})` : ''}
                              {coupon.min_order_amount > 0 && ` on orders > ₹${coupon.min_order_amount}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyCouponCode(coupon.code)}
                            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-[11px] font-black text-white shadow-xs hover:opacity-90 cursor-pointer shrink-0"
                          >
                            APPLY
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Customer Details & Checkout Form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Customer Delivery Information</h3>
            <p className="text-xs text-slate-500">Enter details to confirm order via WhatsApp</p>
          </div>

          <div className="grid gap-3">
            <input
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
              inputMode="tel"
              placeholder="WhatsApp number (required)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
            <select
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="ONLINE">Online Payment</option>
            </select>
            <textarea
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none min-h-20"
              placeholder="Delivery address (optional)"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition-all cursor-pointer shadow-md disabled:bg-slate-400"
            >
              <MapPin className="h-4 w-4 text-amber-400" />
              <span>{locationLoading ? 'Getting current address…' : '⌖ Use current address & location'}</span>
            </button>
            <input
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              type="url"
              placeholder="Google Maps location link (optional)"
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
            />
          </div>

          {/* Flipkart Style Price Breakdown */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Total ({cart.count}):</span>
              <span className="font-bold text-slate-900">₹{cart.total.toFixed(2)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-emerald-600 font-extrabold">
                <span>Coupon Discount ({appliedCoupon.code}):</span>
                <span>-₹{appliedCoupon.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee:</span>
              <span className="font-extrabold text-emerald-600 uppercase">FREE</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
              <span>Total Amount Payable:</span>
              <span className="text-indigo-600">₹{finalTotalAmount.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200">{error}</p>}

          <button
            onClick={orderOnWhatsApp}
            className="w-full rounded-2xl bg-[#25D366] py-4 text-sm font-black text-white shadow-xl shadow-emerald-200 hover:bg-[#1fba58] active:scale-98 transition-all cursor-pointer"
          >
            Order on WhatsApp ↗ (₹{finalTotalAmount.toFixed(2)})
          </button>
          <p className="text-center text-[11px] text-slate-500 font-medium">
            Order is saved and seller will receive your WhatsApp order message.
          </p>
        </section>
      </main>

      <CustomerBottomNav storeSlug={storeSlug!} active="cart" />
      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
