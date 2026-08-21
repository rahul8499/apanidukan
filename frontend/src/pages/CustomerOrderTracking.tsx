import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { StoreCartProvider } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import {
  ArrowLeft, CheckCircle2, Clock, Truck, ShieldCheck, MapPin, Phone,
  Share2, RefreshCw, MessageSquare, ShoppingBag, AlertCircle, Copy, ExternalLink, Zap
} from 'lucide-react'
import { getStoreTheme } from '../utils/storeTheme'

const ORDER_STEPS = [
  { key: 'NEW', label: 'Order Placed', desc: 'Received by store' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Store is preparing your order' },
  { key: 'PAID', label: 'Payment Verified', desc: 'Payment received successfully' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Order delivered successfully!' },
]

export default function CustomerOrderTracking() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return (
    <StoreCartProvider storeSlug={storeSlug}>
      <CustomerOrderTrackingContent />
    </StoreCartProvider>
  )
}

function CustomerOrderTrackingContent() {
  const { storeSlug, reference } = useParams()
  const navigate = useNavigate()
  const [store, setStore] = useState<any>(null)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const trackingToken = new URLSearchParams(window.location.search).get('token') || ''

  const fetchOrder = async () => {
    try {
      const [orderRes, storeRes] = await Promise.allSettled([
        api.get(`/public/stores/${storeSlug}/orders/${reference}/`, { params: { tracking_token: trackingToken } }),
        api.get(`/public/stores/${storeSlug}/`)
      ])

      if (orderRes.status === 'fulfilled') {
        setOrder(orderRes.value.data)
        setError('')
      } else {
        setError('Order details could not be loaded.')
      }

      if (storeRes.status === 'fulfilled') {
        setStore(storeRes.value.data.data || storeRes.value.data)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Order details could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [storeSlug, reference, trackingToken])

  // WebSocket Live Connection + Polling Fallback
  useEffect(() => {
    if (!reference) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/order/${reference}/`

    let socket: WebSocket | null = null

    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        setWsConnected(true)
      }

      function playOrderUpdateChime() {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext
          if (!AudioContext) return
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(523.25, ctx.currentTime)
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12)
          osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24)
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + 0.5)
        } catch {}
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'order_status_updated' && data.order) {
            playOrderUpdateChime()
            setOrder((prev: any) => ({
              ...prev,
              ...data.order,
            }))
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const statusLabel = data.order.status === 'DELIVERED' ? '🎉 Order Delivered!' : data.order.status === 'CONFIRMED' ? '👍 Order Confirmed!' : `Order status updated to ${data.order.status}`
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(`📦 ${statusLabel}`, {
                    body: `Your order #${data.order.reference} status is now: ${data.order.status}`,
                    icon: '/icons/multistore-icon.svg',
                    badge: '/icons/multistore-icon.svg',
                    vibrate: [200, 100, 200]
                  } as any)
                }).catch(() => {
                  new Notification(`📦 ${statusLabel}`, { body: `Your order #${data.order.reference} status: ${data.order.status}`, icon: '/icons/multistore-icon.svg' })
                })
              } else {
                new Notification(`📦 ${statusLabel}`, { body: `Your order #${data.order.reference} status: ${data.order.status}`, icon: '/icons/multistore-icon.svg' })
              }
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e)
        }
      }

      socket.onclose = () => {
        setWsConnected(false)
      }
    } catch (e) {
      console.warn('WS Connection failed, using polling fallback:', e)
    }

    const interval = setInterval(fetchOrder, 5000)

    return () => {
      if (socket) socket.close()
      clearInterval(interval)
    }
  }, [reference, trackingToken])

  const quickReorder = async () => {
    if (!storeSlug || !reference || reordering) return
    setReordering(true)
    setError('')
    try {
      const response = await api.post(`/public/stores/${storeSlug}/orders/${reference}/quick-reorder/`, { tracking_token: trackingToken })
      const newOrder = response.data
      const number = String(order?.store_phone || '').replace(/\D/g, '')
      if (number) {
        const lines = [
          `Quick Reorder #${newOrder.reference}`,
          `Customer: ${newOrder.customer_name || 'Not provided'}`,
          ...(newOrder.customer_phone ? [`Phone: ${newOrder.customer_phone}`] : []),
          `Items: ${newOrder.items.map((item: any) => `${item.name} × ${item.quantity}`).join(', ')}`,
          `Total: ₹${newOrder.total}`,
          ...(newOrder.delivery_address ? [`Delivery Address: ${newOrder.delivery_address}`] : []),
        ]
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer')
      }
      navigate(`/store/${storeSlug}/order/${newOrder.reference}?token=${newOrder.tracking_token}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Some items are no longer available. Please add them from store again.')
    } finally {
      setReordering(false)
    }
  }

  const copyOrderLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full bg-slate-50 p-6 pb-32 text-center flex items-center justify-center">
        <div className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 animate-spin">
            ↻
          </div>
          <p className="text-xs font-bold text-slate-600">Loading live order tracking...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto min-h-screen w-full bg-slate-50 p-4 pb-32">
        <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6">
            <Link to={`/store/${storeSlug}`} className="flex items-center gap-2 text-white hover:text-indigo-400">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-bold text-xs sm:text-sm">Back to Store</span>
            </Link>
            <h1 className="font-extrabold text-sm sm:text-base">Order Status</h1>
            <NotificationBellHeader />
          </div>
        </header>

        <div className="mx-auto max-w-md my-10 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-3xl">
            🔍
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Order Not Found</h2>
          <p className="text-xs text-slate-500 font-medium">{error || 'Invalid or expired order reference.'}</p>
          <Link
            to={`/store/${storeSlug}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-indigo-700 transition-all"
          >
            <span>Return to Store</span>
          </Link>
        </div>

        <CustomerBottomNav storeSlug={storeSlug!} active="orders" />
        <CustomerChatWidget storeSlug={storeSlug!} />
      </div>
    )
  }

  const storeTheme = getStoreTheme(store)
  const isCancelled = order.status === 'CANCELLED'
  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.status)

  return (
    <div className={`mx-auto min-h-screen w-full ${storeTheme.page_bg_class} pb-36 text-xs sm:text-sm font-sans transition-colors duration-300`}>
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              to={`/store/${storeSlug}/orders`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
                {order.store_name || 'Store'}
              </p>
              <h1 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-2">
                <span>Order #{order.reference}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                wsConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
                }`}
              />
              {wsConnected ? 'Live Updates' : 'Auto Sync'}
            </span>
            <NotificationBellHeader />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (2 COLUMNS ON DESKTOP, SINGLE COLUMN ON MOBILE) */}
      <main className="mx-auto max-w-7xl p-3 sm:p-5 lg:pt-6">
        <div className="grid lg:grid-cols-12 lg:gap-6 space-y-4 lg:space-y-0">

          {/* LEFT COLUMN: LIVE STEPPER & DELIVERY ADDRESS */}
          <div className="lg:col-span-7 space-y-3.5">
            
            {/* LIVE STEPPER CARD */}
            <section className={`rounded-2xl border ${storeTheme.card_bg_class} p-4 sm:p-6 shadow-xs space-y-4`}>
              <div className={`flex items-center justify-between border-b pb-3 ${storeTheme.is_dark_mode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div>
                  <h2 className={`font-extrabold ${storeTheme.text_primary_class} text-sm sm:text-base flex items-center gap-1.5`}>
                    <Truck className="h-4 w-4" style={{ color: storeTheme.primary_color }} />
                    <span>Live Order Tracker</span>
                  </h2>
                  <p className={`text-[10px] sm:text-xs ${storeTheme.text_secondary_class} font-medium`}>
                    Order Ref: <span className={`font-mono font-bold ${storeTheme.text_primary_class}`}>#{order.reference}</span>
                  </p>
                </div>

                <button
                  onClick={copyOrderLink}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* ESTIMATED TIME BANNER */}
              <div className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-bold border ${
                order.order_type === 'STORE_PICKUP'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 shrink-0 ${order.order_type === 'STORE_PICKUP' ? 'text-amber-600' : 'text-indigo-600'}`} />
                  <span>
                    {order.order_type === 'STORE_PICKUP' ? 'Ready for Pickup in:' : 'Estimated Delivery Duration:'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-black ${
                    order.order_type === 'STORE_PICKUP' ? 'bg-amber-200/70 text-amber-900' : 'bg-indigo-200/70 text-indigo-900'
                  }`}>
                    {order.order_type === 'STORE_PICKUP' ? '~15-20 mins' : (store?.delivery_estimated_time || '30-45 mins')}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 hidden sm:inline">
                  {order.order_type === 'STORE_PICKUP' ? '🏪 Shop Collection' : '⚡ Doorstep'}
                </span>
              </div>

              {isCancelled ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>Order Cancelled</span>
                  </div>
                  <p className="text-xs text-rose-700 font-medium">
                    This order was cancelled by the store seller. Please contact the store directly via WhatsApp if you need further help.
                  </p>
                </div>
              ) : (
                <div className="pt-2 space-y-6">
                  {(() => {
                    const isPickup = order?.order_type === 'STORE_PICKUP'
                    const stepsToUse = isPickup ? [
                      { key: 'NEW', label: 'Order Placed', desc: 'Received by store' },
                      { key: 'CONFIRMED', label: 'Preparing Order', desc: 'Store is packing your items' },
                      { key: 'PAID', label: 'Ready for Pickup', desc: 'Ready! Collect at store counter' },
                      { key: 'DELIVERED', label: 'Collected', desc: 'Order collected successfully!' },
                    ] : [
                      { key: 'NEW', label: 'Order Placed', desc: 'Received by store' },
                      { key: 'CONFIRMED', label: 'Confirmed & Packing', desc: 'Store is packing your items' },
                      { key: 'PAID', label: 'Out for Delivery', desc: 'Rider is on the way to you' },
                      { key: 'DELIVERED', label: 'Delivered', desc: 'Delivered to your doorstep!' },
                    ]

                    return stepsToUse.map((step, idx) => {
                      const isDone = currentStepIndex >= idx
                      const isCurrent = currentStepIndex === idx

                      return (
                        <div key={step.key} className="flex gap-3.5 relative">
                          {/* Connecting Line */}
                          {idx < stepsToUse.length - 1 && (
                            <div
                              className={`absolute left-4 top-7 -bottom-6 w-0.5 ${
                                currentStepIndex > idx ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            />
                          )}

                          {/* Step Icon */}
                          <div
                            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all duration-300 shrink-0 ${
                              isDone
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>

                          {/* Step Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-extrabold text-xs sm:text-sm ${
                                  isCurrent
                                    ? 'text-emerald-700'
                                    : isDone
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </p>
                              {isCurrent && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 animate-pulse">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">{step.desc}</p>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </section>

            {/* FULFILLMENT & ADDRESS CARD */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  <span>
                    {order.order_type === 'STORE_PICKUP' 
                      ? 'Store Pickup Location & Details' 
                      : 'Home Delivery Address & Details'
                    }
                  </span>
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  order.order_type === 'STORE_PICKUP' 
                    ? 'bg-amber-50 text-amber-900 border-amber-200' 
                    : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                }`}>
                  {order.order_type === 'STORE_PICKUP' ? '🏪 Store Pickup' : '🚚 Home Delivery'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                {order.customer_name && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Customer Name</span>
                    <span className="font-bold text-slate-900">{order.customer_name}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">WhatsApp Phone</span>
                    <span className="font-bold text-slate-900">{order.customer_phone}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Payment Preference</span>
                  <span className="font-bold text-slate-900">
                    {order.payment_type === 'COD' ? '💵 Cash on Delivery / At Shop' : '💳 Online Payment'}
                  </span>
                </div>
              </div>

              {order.order_type === 'STORE_PICKUP' ? (
                <div className="pt-2 border-t border-slate-100 space-y-1.5 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                  <span className="text-amber-900 block text-[11px] font-extrabold uppercase flex items-center gap-1">
                    <span>🏪 Collect from Store Counter</span>
                  </span>
                  <p className="font-bold text-slate-900 text-xs">
                    {order.delivery_address || 'Store Location'}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    ⚡ Show your Order Reference #{order.reference} at the counter to collect your packed order.
                  </p>
                </div>
              ) : (
                order.delivery_address && (
                  <div className="pt-1">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase mb-1">Doorstep Delivery Address</span>
                    <p className="font-medium text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      📍 {order.delivery_address}
                    </p>
                  </div>
                )
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: ACTIONS, QUICK REORDER & ORDER SUMMARY */}
          <div className="lg:col-span-5 space-y-3.5">
            
            {/* ACTION BUTTONS CARD */}
            <div className={`rounded-2xl border ${storeTheme.card_bg_class} p-4 sm:p-5 shadow-xs space-y-3`}>
              <h3 className={`font-bold ${storeTheme.text_primary_class} text-xs sm:text-sm border-b pb-2 ${storeTheme.is_dark_mode ? 'border-slate-800' : 'border-slate-100'}`}>
                Order Actions
              </h3>

              <div className="grid gap-2">
                {order.store_phone && (
                  <a
                    href={`https://wa.me/${order.store_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hi! Checking status for Order #${order.reference}:\n${window.location.origin}/store/${storeSlug}/order/${order.reference}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 px-4 font-black text-xs text-white shadow-xs hover:bg-[#1fba58] transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Message Seller on WhatsApp ↗</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/store/${storeSlug}/order/${order.reference}`
                    const shareMsg = `📦 Track my Order #${order.reference} live here:\n${url}`
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`, '_blank')
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 py-2.5 px-4 font-black text-xs text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-indigo-400" />
                  <span>Share Order Link on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={quickReorder}
                  disabled={reordering}
                  className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${storeTheme.btn_gradient} py-3 px-4 font-black text-xs text-white shadow-md hover:opacity-95 disabled:opacity-60 transition-all cursor-pointer`}
                >
                  <RefreshCw className={`h-4 w-4 ${reordering ? 'animate-spin' : ''}`} />
                  <span>{reordering ? 'Creating Quick Reorder…' : 'Quick Reorder Same Items'}</span>
                </button>
              </div>
            </div>

            {/* ORDER ITEMS & PRICE BREAKDOWN */}
            <div className={`rounded-2xl border ${storeTheme.card_bg_class} p-4 sm:p-5 shadow-xs space-y-3`}>
              <h3 className={`font-bold ${storeTheme.text_primary_class} text-xs sm:text-sm border-b pb-2 flex items-center gap-1.5 ${storeTheme.is_dark_mode ? 'border-slate-800' : 'border-slate-100'}`}>
                <ShoppingBag className="h-4 w-4" style={{ color: storeTheme.primary_color }} />
                <span>Purchased Items Summary</span>
              </h3>

              <div className="divide-y divide-slate-100 space-y-2 pt-1">
                {Array.isArray(order.items) &&
                  order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between pt-2 text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 truncate">
                          {item.name || item.product_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Qty: {item.quantity || 1} × ₹{Number(item.price || 0).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-black text-slate-950 shrink-0">
                        ₹{((Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-slate-200 pt-2.5 space-y-1.5 text-xs">
                {(() => {
                  const subtotal = Array.isArray(order.items)
                    ? order.items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0)
                    : Number(order.total) || 0

                  return (
                    <>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                      </div>

                      {order.order_type && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Fulfillment Mode:</span>
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            {order.order_type === 'STORE_PICKUP' ? '🏪 Store Pickup' : '🚚 Home Delivery'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-600">
                        <span>Delivery Charges:</span>
                        <span className="font-bold text-slate-900">
                          {order.order_type === 'STORE_PICKUP' 
                            ? 'FREE (Pickup)' 
                            : Number(order.delivery_fee) > 0 
                              ? `₹${Number(order.delivery_fee).toFixed(2)}` 
                              : 'FREE'
                          }
                        </span>
                      </div>

                      {Number(order.discount_amount) > 0 && (
                        <div className="flex items-center justify-between text-emerald-600 font-bold">
                          <span>Discount Applied:</span>
                          <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
                        </div>
                      )}

                      {Number(order.wallet_points_redeemed) > 0 && (
                        <div className="flex items-center justify-between text-amber-600 font-bold">
                          <span>🪙 Store Coins Used:</span>
                          <span>-₹{Number(order.wallet_points_redeemed).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-600">
                        <span>Estimated Time:</span>
                        <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-[11px]">
                          {order.order_type === 'STORE_PICKUP' 
                            ? '🏪 Ready in ~15-20 mins' 
                            : `⏱️ ${store?.delivery_estimated_time || '30-45 mins'}`
                          }
                        </span>
                      </div>

                      <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-black text-slate-950">
                        <span>Total Paid / Payable</span>
                        <span className="text-indigo-600 text-base">₹{Number(order.total).toFixed(2)}</span>
                      </div>

                      {Number(order.wallet_cashback_earned) > 0 && (
                        <div className="rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/40 p-3 text-center text-xs font-black text-amber-950 shadow-xs space-y-0.5">
                          <p className="flex items-center justify-center gap-1">
                            <span>🪙</span>
                            <span>Cashback Reward Unlocked!</span>
                          </p>
                          <p className="text-[11px] text-amber-800 font-bold">
                            You earned <span className="text-amber-950 font-black">+₹{Number(order.wallet_cashback_earned).toFixed(2)} Store Coins</span> for your next purchase!
                          </p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

          </div>

        </div>
      </main>

      <CustomerBottomNav storeSlug={storeSlug!} active="orders" />
      <CustomerChatWidget storeSlug={storeSlug!} orderReference={reference} />
    </div>
  )
}
