import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'

const statuses = ['NEW', 'CONFIRMED', 'PAID', 'DELIVERED', 'CANCELLED']

export default function SellerOrders() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [orders, setOrders] = useState<any[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'highest_price'>('latest')
  const [copiedRef, setCopiedRef] = useState<string | null>(null)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()

  const load = async () => {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((x: any) => String(x.id) === storeId)
      if (!found) return navigate('/dashboard')
      setCachedStore(found)
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

  const copyRefToClipboard = async (refStr: string) => {
    try {
      await navigator.clipboard.writeText(refStr)
      setCopiedRef(refStr)
      setTimeout(() => setCopiedRef(null), 2000)
    } catch {}
  }

  if (!store) return <div className="p-6 text-xs text-slate-500 font-bold">Loading store orders...</div>

  const isManageInAppOn = Boolean(store.manage_in_app)

  // Executive KPI Calculations
  const validOrders = orders.filter(o => o.status?.toUpperCase() !== 'CANCELLED')
  const totalSalesVolume = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const newOrdersCount = orders.filter(o => o.status?.toUpperCase() === 'NEW').length
  const completedCount = orders.filter(o => ['DELIVERED', 'PAID'].includes(o.status?.toUpperCase())).length
  const avgOrderValue = validOrders.length > 0 ? (totalSalesVolume / validOrders.length) : 0

  // Filter & Search & Sort logic
  let processedOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'ALL' || o.status?.toUpperCase() === statusFilter
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query ||
      (o.reference && o.reference.toLowerCase().includes(query)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
      (o.customer_phone && o.customer_phone.includes(query))
    return matchesStatus && matchesSearch
  })

  if (sortBy === 'latest') {
    processedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else if (sortBy === 'oldest') {
    processedOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  } else if (sortBy === 'highest_price') {
    processedOrders.sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
  }

  const getStatusLeftBorder = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
      case 'DELIVERED':
        return 'border-l-4 border-l-emerald-500'
      case 'CONFIRMED':
        return 'border-l-4 border-l-indigo-500'
      case 'NEW':
        return 'border-l-4 border-l-amber-500'
      case 'CANCELLED':
        return 'border-l-4 border-l-rose-500'
      default:
        return 'border-l-4 border-l-slate-300'
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'CONFIRMED':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'NEW':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'C'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50/80 pb-28 lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle="Orders Management" onStoreUpdate={load} />

      <div className="space-y-4 p-4 sm:p-6">
        {/* Enterprise Dark Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-md border border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-300 border border-teal-400/30 tracking-wider">
                Real-Time Orders Control
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsRefreshingData(true)
                  await load()
                  setTimeout(() => setIsRefreshingData(false), 500)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-900/60 px-3 py-1.5 text-xs font-extrabold text-teal-200 hover:bg-teal-800 hover:text-white transition-all cursor-pointer shadow-xs"
                title="Click to fetch live fresh orders data"
              >
                <span className={`text-sm ${isRefreshingData ? 'animate-spin' : ''}`}>🔄</span>
                <span>Refresh Orders</span>
              </button>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  wsConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {wsConnected ? 'Live Connection' : 'Sync Active'}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-black text-white">{orders.length}</p>
              <p className="text-xs text-indigo-200 font-medium">Total Orders Received</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-indigo-200">In-App Control:</span>
              <span
                className={`font-black px-2.5 py-1 rounded-lg text-white text-[11px] shadow-2xs ${
                  isManageInAppOn ? 'bg-teal-600' : 'bg-slate-800 border border-slate-700'
                }`}
              >
                {isManageInAppOn ? '✓ ACTIVE' : 'OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Executive KPI Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Gross Sales</span>
            <p className="mt-0.5 text-base font-black text-slate-900">₹{totalSalesVolume.toFixed(2)}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Valid Orders</span>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">New Pending</span>
              {newOrdersCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>}
            </div>
            <p className="mt-0.5 text-base font-black text-amber-950">{newOrdersCount}</p>
            <span className="text-[10px] text-amber-700 font-bold">Action Needed</span>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Completed</span>
            <p className="mt-0.5 text-base font-black text-emerald-950">{completedCount}</p>
            <span className="text-[10px] text-emerald-700 font-bold">Paid / Delivered</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Avg Order Value</span>
            <p className="mt-0.5 text-base font-black text-slate-900">₹{avgOrderValue.toFixed(0)}</p>
            <span className="text-[10px] text-slate-500 font-bold">Per Order</span>
          </div>
        </div>

        {/* Live Search & Smart Sort Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer Name or Phone..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
          >
            <option value="latest">Sort: Latest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="highest_price">Sort: Highest Price</option>
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['ALL', ...statuses].map(st => {
            const count = st === 'ALL' ? orders.length : orders.filter(o => o.status?.toUpperCase() === st).length
            const isActive = statusFilter === st
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{st}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Error notification if any */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-900 shadow-2xs flex items-center justify-between animate-in fade-in">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 font-extrabold">✕</button>
          </div>
        )}

        {/* Manage in App OFF Alert Banner */}
        {!isManageInAppOn && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-amber-950 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-extrabold text-xs text-amber-950">In-App Status Control Disabled</p>
                <p className="mt-0.5 text-xs text-amber-800 leading-relaxed font-medium">
                  Enable <strong>'Manage in App'</strong> in Store Setup to directly change order status, trigger customer updates & live chat.
                </p>
                <Link
                  to={`/stores/${store.id}/manage`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                >
                  Go to Store Setup ➔
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {processedOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <div className="text-4xl">📦</div>
            <h2 className="mt-3 text-base font-extrabold text-slate-900">
              {searchQuery ? 'No matching orders found' : statusFilter === 'ALL' ? 'No Orders Yet' : `No ${statusFilter} Orders`}
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Customer orders placed on your storefront link will appear here instantly in real-time.
            </p>
          </div>
        ) : (
          processedOrders.map((order) => {
            const currentStatusUpper = order.status?.toUpperCase() || 'NEW'

            return (
              <article
                key={order.id}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all space-y-3.5 ${getStatusLeftBorder(order.status)}`}
              >
                {/* Card Header: Order Reference & Status Controls */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyRefToClipboard(order.reference)}
                        className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[11px] font-mono font-bold text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1 cursor-pointer"
                        title="Click to Copy Order #"
                      >
                        <span>#{order.reference}</span>
                        <span className="text-[10px] text-indigo-400">{copiedRef === order.reference ? '✓ Copied' : '📋'}</span>
                      </button>
                      <span className="text-[11px] font-medium text-slate-400">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xl font-black text-slate-900">
                      ₹{order.total}
                    </p>
                  </div>

                  {/* Status selector (when Manage in App is ON) or Static Badge (when OFF) */}
                  {isManageInAppOn ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Update Status
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="rounded-xl border border-slate-300 bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status} className="bg-white text-slate-900 font-bold">
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold border ${getStatusBadgeStyle(order.status)}`}>
                      {order.status}
                    </span>
                  )}
                </div>

                {/* Visual Order Progress Timeline Bar */}
                {currentStatusUpper !== 'CANCELLED' && (
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span className={currentStatusUpper === 'NEW' ? 'text-amber-600 font-black' : 'text-slate-600'}>1. Placed</span>
                      <span className={currentStatusUpper === 'CONFIRMED' ? 'text-indigo-600 font-black' : 'text-slate-600'}>2. Confirmed</span>
                      <span className={['PAID', 'DELIVERED'].includes(currentStatusUpper) ? 'text-emerald-600 font-black' : 'text-slate-600'}>3. Paid / Delivered</span>
                    </div>
                    <div className="flex h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          currentStatusUpper === 'NEW' ? 'w-1/3 bg-amber-500' :
                          currentStatusUpper === 'CONFIRMED' ? 'w-2/3 bg-indigo-600' :
                          'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Customer Details with Initial Avatar */}
                <div className="rounded-xl bg-slate-50/70 p-3 text-xs text-slate-700 space-y-2 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-xs shadow-2xs shrink-0">
                      {getInitials(order.customer_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-900 truncate">
                        {order.customer_name || 'Customer'}
                      </p>
                      {order.customer_phone && (
                        <p className="font-mono text-[11px] text-indigo-700 font-bold">
                          📞 {order.customer_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1">
                    {order.payment_type && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-500">Payment:</span>
                        <span className="font-bold text-slate-900">{order.payment_type === 'COD' ? '💵 Cash on Delivery' : '💳 Online Payment'}</span>
                      </div>
                    )}
                    {order.delivery_address && (
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-500 block">Delivery Address:</span>
                        <span className="font-medium text-slate-800">{order.delivery_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items Breakdown */}
                <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100 space-y-1">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Items ({order.items?.length || 0}):</p>
                  {Array.isArray(order.items) &&
                    order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700 py-0.5">
                        <span className="font-medium">• {item.name || item.product_name || 'Product'} × {item.quantity}</span>
                        <span className="font-extrabold text-slate-900">₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                </div>

                {/* Action Toolbar: Live Chat, WhatsApp, Phone Call, Live Tracking */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startDirectChat(order)}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 px-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    💬 Live Chat
                  </button>

                  {order.customer_phone && (
                    <>
                      <a
                        className="rounded-xl bg-emerald-600 py-2.5 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all flex items-center gap-1 cursor-pointer"
                        href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp ↗
                      </a>
                      <a
                        className="rounded-xl bg-slate-100 border border-slate-200 py-2.5 px-3 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                        href={`tel:${order.customer_phone}`}
                      >
                        📞 Call
                      </a>
                    </>
                  )}

                  <Link
                    to={`/store/${store.slug}/order/${order.reference}`}
                    target="_blank"
                    className="rounded-xl bg-slate-900 py-2.5 px-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all flex items-center gap-1"
                  >
                    Tracking ↗
                  </Link>
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="orders" />
    </main>
  )
}
