import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { StoreCartProvider } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'

const ORDER_STEPS = [
  { key: 'NEW', label: 'Order Placed', desc: 'Received by store' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Store is preparing your order' },
  { key: 'PAID', label: 'Payment Received', desc: 'Payment verified' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Order complete!' },
]

export default function CustomerOrderTracking() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return <StoreCartProvider storeSlug={storeSlug}><CustomerOrderTrackingContent /></StoreCartProvider>
}

function CustomerOrderTrackingContent() {
  const { storeSlug, reference } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [reordering, setReordering] = useState(false)

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/public/stores/${storeSlug}/orders/${reference}/`)
      setOrder(response.data)
      setError('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Order details could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [storeSlug, reference])

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

    // Polling fallback every 5 seconds to ensure accuracy
    const interval = setInterval(fetchOrder, 5000)

    return () => {
      if (socket) socket.close()
      clearInterval(interval)
    }
  }, [reference])

  const quickReorder = async () => {
    if (!storeSlug || !reference || reordering) return
    setReordering(true)
    setError('')
    try {
      const response = await api.post(`/public/stores/${storeSlug}/orders/${reference}/quick-reorder/`)
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
      navigate(`/store/${storeSlug}/order/${newOrder.reference}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Some items are no longer available. Please add them from the store again.')
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 p-6 pb-32 text-center flex items-center justify-center lg:max-w-none lg:w-full">
        <p className="text-slate-500 font-medium">Loading live order tracking...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 p-6 pb-32 lg:max-w-none lg:w-full">
        <Link to={`/store/${storeSlug}`} className="text-sm font-semibold text-indigo-600">
          ← Back to store
        </Link>
        <div className="premium-card mt-6 p-8 text-center">
          <div className="text-4xl">🔍</div>
          <h1 className="mt-4 text-xl font-bold text-slate-800">Order not found</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'Invalid order reference.'}</p>
        </div>
        <CustomerBottomNav storeSlug={storeSlug!} active="home" />
        <CustomerChatWidget storeSlug={storeSlug!} orderReference={reference} />
      </div>
    )
  }

  const isCancelled = order.status === 'CANCELLED'
  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.status)

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32 lg:max-w-none lg:w-full">
      {/* Top Bar Header */}
      <header className="bg-slate-950 px-5 py-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <Link to={`/store/${storeSlug}`} className="text-xs text-indigo-300 font-semibold hover:underline">
              ← {order.store_name || 'Store'}
            </Link>
            <h1 className="mt-1 text-xl font-bold">Order #{order.reference}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
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
          </div>
        </div>
      </header>

      <main className="space-y-4 p-4">
        {/* Status Tracker Card */}
        <section className="premium-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Order Status</p>
          
          {isCancelled ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
              <p className="font-bold text-base">Order Cancelled</p>
              <p className="mt-1 text-xs text-rose-700">
                This order was cancelled by the store. Please contact the store directly via WhatsApp if you have questions.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {ORDER_STEPS.map((step, idx) => {
                const isDone = currentStepIndex >= idx
                const isCurrent = currentStepIndex === idx

                return (
                  <div key={step.key} className="flex gap-4 relative">
                    {/* Connecting line */}
                    {idx < ORDER_STEPS.length - 1 && (
                      <div
                        className={`absolute left-4 top-8 -bottom-6 w-0.5 ${
                          currentStepIndex > idx ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    {/* Step Icon Indicator */}
                    <div
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                        isDone
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>

                    {/* Step Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-bold text-sm ${
                            isCurrent
                              ? 'text-emerald-700 font-extrabold'
                              : isDone
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 animate-pulse">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Store WhatsApp Contact & Share Tracking Link Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {order.store_phone && (
            <a
              href={`https://wa.me/${order.store_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Hi! Checking status for Order #${order.reference}:\n${window.location.origin}/store/${storeSlug}/order/${order.reference}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 font-extrabold text-xs text-white shadow-md hover:bg-[#1fba58] transition-all"
            >
              <span>💬</span> Message Seller ↗
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/store/${storeSlug}/order/${order.reference}`
              const shareMsg = `📦 Track my Order #${order.reference} live here:\n${url}`
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`, '_blank')
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-extrabold text-xs text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            <span>📲</span> Share Order Link on WhatsApp
          </button>
        </div>

        <button
          type="button"
          onClick={quickReorder}
          disabled={reordering}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>↻</span> {reordering ? 'Creating your reorder…' : 'Quick Reorder'}
        </button>
        <p className="-mt-2 text-center text-xs text-slate-500">Same items, delivery details and latest prices.</p>

        {/* Order Details Breakdown Card */}
        <section className="premium-card p-5 space-y-4">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
            Order Breakdown
          </h2>

          <div className="text-xs space-y-2 text-slate-600">
            {order.customer_name && (
              <div className="flex justify-between">
                <span className="text-slate-400">Customer</span>
                <span className="font-semibold text-slate-800">{order.customer_name}</span>
              </div>
            )}
            {order.customer_phone && (
              <div className="flex justify-between">
                <span className="text-slate-400">Phone</span>
                <span className="font-semibold text-slate-800">{order.customer_phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Method</span>
              <span className="font-semibold text-slate-800">
                {order.payment_type === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment'}
              </span>
            </div>
            {order.delivery_address && (
              <div className="pt-1">
                <span className="text-slate-400 block mb-0.5">Delivery Address</span>
                <span className="font-medium text-slate-800 leading-relaxed block bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {order.delivery_address}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Purchased Items</p>
            <div className="space-y-2">
              {Array.isArray(order.items) &&
                order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {item.name || item.product_name} × {item.quantity}
                    </span>
                    <span className="font-bold text-slate-900">
                      ₹{((Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-200 text-base font-extrabold text-slate-900">
              <span>Total Paid/Due</span>
              <span className="text-indigo-700">₹{order.total}</span>
            </div>
          </div>
        </section>
      </main>

      <CustomerBottomNav storeSlug={storeSlug!} active="home" />
      <CustomerChatWidget storeSlug={storeSlug!} orderReference={reference} />
    </div>
  )
}
