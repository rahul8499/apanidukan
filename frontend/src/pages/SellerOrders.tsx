import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBellHeader from '../components/NotificationBellHeader'

const statuses = ['NEW', 'CONFIRMED', 'PAID', 'DELIVERED', 'CANCELLED']

export default function SellerOrders() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const auth = useAuth()
  const navigate = useNavigate()

  const load = async () => {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((x: any) => String(x.id) === storeId)
      if (!found) return navigate('/dashboard')
      setStore(found)

      const response = await api.get(`/seller/stores/${storeId}/whatsapp-orders/`)
      setOrders(response.data)
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => {
    load()
  }, [storeId])

  // WebSocket Live Updates Connection
  useEffect(() => {
    if (!storeId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/store/${storeId}/`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        setWsConnected(true)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_order' && data.order) {
            setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)])
          } else if (data.type === 'order_status_updated' && data.order) {
            setOrders((prev) =>
              prev.map((o) => (o.id === data.order.id ? data.order : o))
            )
          }
        } catch (e) {
          console.error('Error parsing WS message:', e)
        }
      }

      socket.onclose = () => {
        setWsConnected(false)
      }
    } catch (e) {
      console.warn('WebSocket connection failed:', e)
    }

    return () => {
      if (socket) socket.close()
    }
  }, [storeId])

  async function updateStatus(id: number, status: string) {
    setErrorMsg('')
    try {
      const response = await api.patch(
        `/seller/stores/${storeId}/whatsapp-orders/${id}/`,
        { status }
      )
      setOrders((current) =>
        current.map((order) => (order.id === id ? response.data : order))
      )
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail ||
          'Could not update status. Check Store Setup settings.'
      )
    }
  }

  async function startDirectChat(order: any) {
    const phone = (order.customer_phone || '').trim()
    if (!phone) {
      setErrorMsg('This order does not have a WhatsApp phone number yet. Add it before starting live chat.')
      return
    }

    try {
      const custName = order.customer_name || `Customer (${phone})`
      const res = await api.post(`/seller/stores/${storeId}/conversations/`, {
        customer_name: custName,
        customer_phone: phone,
      })
      navigate(`/stores/${storeId}/chat?convId=${res.data.id}&orderRef=${order.reference}`)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to start live chat.'
      setErrorMsg(detail)
    }
  }

  if (!store) return <div className="p-6">Loading store orders...</div>

  const isManageInAppOn = Boolean(store.manage_in_app)

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-24 lg:max-w-none lg:w-full">
      <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Seller workspace
          </p>
          <h1 className="mt-1 text-xl font-bold">{store.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBellHeader />
          <button
            onClick={() => {
              auth.logout()
              navigate('/login')
            }}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Header Stats & Live Badge */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo-100">
              Customer Orders
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                wsConnected
                  ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {wsConnected ? 'Live Real-time' : 'Polling Sync'}
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold">{orders.length} total</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-indigo-100">
            <span>Manage in App mode:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md text-white ${
                isManageInAppOn ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              {isManageInAppOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Error notification if any */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Manage in App OFF Alert Banner */}
        {!isManageInAppOn && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold text-sm">Manage in App is OFF</p>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  Status updates are currently disabled. To manage status changes & enable live updates for customers, turn ON <strong>'Manage in App'</strong> in{' '}
                  <Link
                    to={`/stores/${store.id}/manage`}
                    className="font-bold underline text-indigo-700"
                  >
                    Store setup
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="premium-card p-8 text-center">
            <div className="text-4xl">📦</div>
            <h2 className="mt-4 font-bold text-slate-800">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Orders placed by customers on your store storefront will appear here live in real-time.
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="premium-card p-5">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Order #{order.reference}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    ₹{order.total}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Status selector (when Manage in App is ON) or Static Badge (when OFF) */}
                {isManageInAppOn ? (
                  <div className="flex flex-col items-end">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Update status
                    </label>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                    {order.status}
                  </span>
                )}
              </div>

              {/* Customer Details */}
              <div className="mt-3 text-xs text-slate-600 space-y-1">
                {order.customer_name && (
                  <p>
                    <span className="font-semibold text-slate-800">Customer:</span>{' '}
                    {order.customer_name}
                  </p>
                )}
                {order.customer_phone && (
                  <p>
                    <span className="font-semibold text-slate-800">Phone:</span>{' '}
                    {order.customer_phone}
                  </p>
                )}
                {order.payment_type && (
                  <p>
                    <span className="font-semibold text-slate-800">Payment:</span>{' '}
                    {order.payment_type === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                  </p>
                )}
                {order.delivery_address && (
                  <p className="truncate">
                    <span className="font-semibold text-slate-800">Address:</span>{' '}
                    {order.delivery_address}
                  </p>
                )}
              </div>

              {/* Order Items */}
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                <p className="font-bold text-slate-700 mb-1">Items:</p>
                {Array.isArray(order.items) &&
                  order.items.map((item: any, idx: number) => (
                    <p key={idx} className="text-slate-600">
                      • {item.name || item.product_name || 'Product'} × {item.quantity}
                    </p>
                  ))}
              </div>

              {/* Actions: Direct Link to Customer Tracking, WhatsApp Message & Live Chat */}
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startDirectChat(order)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                >
                  💬 Start Live Chat
                </button>
                {order.customer_phone && (
                  <a
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366]/10 px-3 py-2 text-xs font-bold text-[#1fba58] border border-[#25D366]/20 hover:bg-[#25D366]/20"
                    href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp ↗
                  </a>
                )}
                <Link
                  to={`/store/${store.slug}/order/${order.reference}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  🔍 Live Tracking ↗
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-1 border-t bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:left-0 lg:right-0 lg:max-w-none lg:-translate-x-0 lg:mx-auto lg:w-full">
        <Link
          to={`/stores/${store.id}/manage`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Setup
        </Link>
        <span className="flex-1 rounded-xl bg-indigo-50 px-2 py-2 text-center text-xs font-bold text-indigo-700">
          Orders
        </span>
        <Link
          to={`/stores/${store.id}/payments`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Payments
        </Link>
        <Link
          to={`/stores/${store.id}/chat`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Chat
        </Link>
        <Link
          to={`/stores/${store.id}/requests`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Requests
        </Link>
      <Link to={`/stores/${storeId}/analytics`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Analytics</Link></nav>
    </main>
  )
}
