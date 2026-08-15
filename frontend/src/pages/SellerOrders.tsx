import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { SlidersHorizontal, X } from 'lucide-react'

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
  const [showFilterModal, setShowFilterModal] = useState(false)
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
        {/* Enterprise Dark Hero Header — Modernized & Compact for Mobile */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-3.5 sm:p-5 text-white shadow-xl border border-indigo-500/30 backdrop-blur-xl">
          {/* Neon Glow background reflections */}
          <div className="absolute -top-12 -right-12 h-36 sm:h-48 w-36 sm:w-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-36 sm:h-48 w-36 sm:w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            {/* Top Bar: Status Badge + Refresh + Connection Pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-teal-300 border border-teal-400/30 tracking-wider shadow-xs">
                ⚡ ORDERS CONTROL
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingData(true)
                    await load()
                    setTimeout(() => setIsRefreshingData(false), 500)
                  }}
                  className="flex items-center gap-1 rounded-xl border border-teal-500/40 bg-teal-950/70 px-2.5 py-1 text-[11px] sm:text-xs font-extrabold text-teal-300 hover:bg-teal-900 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Refresh live orders"
                >
                  <span className={`text-xs ${isRefreshingData ? 'animate-spin' : ''}`}>🔄</span>
                  <span className="font-extrabold">Refresh</span>
                </button>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold ${
                    wsConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                    }`}
                  />
                  <span>{wsConnected ? 'LIVE' : 'SYNC'}</span>
                </span>
              </div>
            </div>

            {/* Main Stats Row */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
              <div className="flex items-baseline gap-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-white leading-none">{orders.length}</p>
                  <p className="text-[10px] sm:text-xs text-indigo-200/90 font-bold mt-0.5">Total Received</p>
                </div>
                <div className="h-7 w-[1px] bg-slate-800 mx-1 hidden xs:block" />
                <div className="hidden xs:block">
                  <p className="text-lg sm:text-2xl font-black text-emerald-300 leading-none">₹{totalSalesVolume.toFixed(0)}</p>
                  <p className="text-[10px] sm:text-xs text-slate-300 font-bold mt-0.5">Total Revenue</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-indigo-200">Mode</span>
                <span
                  className={`font-black px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] border shadow-sm ${
                    isManageInAppOn
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {isManageInAppOn ? '🟢 IN-APP' : '⚪ WHATSAPP'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Executive KPI Metrics Summary Cards — Web Large / Mobile Compact */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white py-2 px-3 sm:p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider">Gross Sales</span>
            <p className="my-0.5 text-sm sm:text-2xl font-black text-slate-900 truncate">₹{totalSalesVolume.toFixed(2)}</p>
            <span className="text-[9px] sm:text-xs text-emerald-600 font-bold">Valid Orders</span>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 py-2 px-3 sm:p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-800 tracking-wider">New Pending</span>
              {newOrdersCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>}
            </div>
            <p className="my-0.5 text-sm sm:text-2xl font-black text-amber-950">{newOrdersCount}</p>
            <span className="text-[9px] sm:text-xs text-amber-700 font-bold">Action Needed</span>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 py-2 px-3 sm:p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-800 tracking-wider">Completed</span>
            <p className="my-0.5 text-sm sm:text-2xl font-black text-emerald-950">{completedCount}</p>
            <span className="text-[9px] sm:text-xs text-emerald-700 font-bold">Paid / Delivered</span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white py-2 px-3 sm:p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider">Avg Order Value</span>
            <p className="my-0.5 text-sm sm:text-2xl font-black text-slate-900 truncate">₹{avgOrderValue.toFixed(0)}</p>
            <span className="text-[9px] sm:text-xs text-slate-500 font-bold">Per Order</span>
          </div>
        </div>

        {/* Single Line Search & Filter Controls Bar */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer or Phone..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Sheet Trigger Button */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
              statusFilter !== 'ALL' || sortBy !== 'latest'
                ? 'bg-indigo-600 text-white border-indigo-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Open Filter & Sort Options"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Filter</span>
            {statusFilter !== 'ALL' && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-black uppercase">
                {statusFilter}
              </span>
            )}
          </button>

          {/* Quick Sort Selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="hidden sm:block rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none shadow-2xs cursor-pointer shrink-0"
          >
            <option value="latest">Sort: Latest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="highest_price">Sort: Highest Price</option>
          </select>
        </div>

        {/* Quick Horizontal Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['ALL', ...statuses].map(st => {
            const count = st === 'ALL' ? orders.length : orders.filter(o => o.status?.toUpperCase() === st).length
            const isActive = statusFilter === st
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className={`rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all space-y-2.5 ${getStatusLeftBorder(order.status)}`}
              >
                {/* 1. Header: Order Ref + Time + Amount + Status Dropdown/Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyRefToClipboard(order.reference)}
                      className="rounded-lg bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 text-[11px] font-mono font-black text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1 cursor-pointer"
                      title="Click to Copy Order #"
                    >
                      <span>#{order.reference}</span>
                      <span className="text-[10px] text-indigo-400">{copiedRef === order.reference ? '✓' : '📋'}</span>
                    </button>
                    <span className="text-[10px] font-medium text-slate-400">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      ₹{order.total}
                    </span>

                    {/* Status dropdown or badge */}
                    {isManageInAppOn ? (
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="rounded-xl border border-slate-300 bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-xs focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status} className="bg-white text-slate-900 font-bold">
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${getStatusBadgeStyle(order.status)}`}>
                        {order.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Compact Customer & Payment Row */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-[10px] shrink-0">
                      {getInitials(order.customer_name)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-900 truncate block text-xs">
                        {order.customer_name || 'Customer'}
                      </span>
                      {order.customer_phone && (
                        <a href={`tel:${order.customer_phone}`} className="font-mono text-[10px] text-indigo-700 font-bold hover:underline">
                          📞 {order.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                    {order.payment_type === 'COD' ? '💵 COD' : '💳 Online'}
                  </span>
                </div>

                {/* 3. Delivery Address (If Present) */}
                {order.delivery_address && (
                  <p className="text-[11px] text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 truncate">
                    <span className="font-bold text-slate-700">📍 </span>{order.delivery_address}
                  </p>
                )}

                {/* 4. Compact Purchased Items List */}
                <div className="rounded-xl bg-slate-50/80 p-2.5 text-xs border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <span>Items ({order.items?.length || 0})</span>
                    <span>Qty × Price</span>
                  </div>
                  {Array.isArray(order.items) &&
                    order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-800 text-[11px]">
                        <span className="font-semibold truncate">• {item.name || item.product_name || 'Product'}</span>
                        <span className="font-black shrink-0 ml-2">×{item.quantity} (₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(0)})</span>
                      </div>
                    ))}
                </div>

                {/* 5. Progress Bar (Ultra Slim 4-Stage Tracker) */}
                {currentStatusUpper !== 'CANCELLED' && (
                  <div className="flex items-center gap-2 text-[9px] font-extrabold text-slate-500 pt-0.5">
                    <span className={currentStatusUpper === 'NEW' ? 'text-amber-600 font-black' : 'text-slate-400'}>Placed</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          currentStatusUpper === 'NEW' ? 'w-1/4 bg-amber-500' :
                          currentStatusUpper === 'CONFIRMED' ? 'w-2/4 bg-indigo-600' :
                          currentStatusUpper === 'PAID' ? 'w-3/4 bg-teal-500' :
                          'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className={currentStatusUpper === 'DELIVERED' ? 'text-emerald-600 font-black' : currentStatusUpper === 'PAID' ? 'text-teal-600 font-black' : 'text-slate-400'}>
                      {currentStatusUpper === 'PAID' ? 'Paid (75%)' : currentStatusUpper === 'DELIVERED' ? 'Delivered ✓' : 'Delivered'}
                    </span>
                  </div>
                )}

                {/* 6. Clean Action Toolbar */}
                <div className="grid grid-cols-2 sm:flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => startDirectChat(order)}
                    className="rounded-xl bg-indigo-600 py-1.5 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    💬 Chat
                  </button>

                  {order.customer_phone ? (
                    <>
                      <a
                        className="rounded-xl bg-emerald-600 py-1.5 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp ↗
                      </a>
                      <a
                        className="rounded-xl bg-slate-100 border border-slate-200 py-1.5 px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        href={`tel:${order.customer_phone}`}
                      >
                        📞 Call
                      </a>
                    </>
                  ) : null}

                  <Link
                    to={`/store/${store.slug}/order/${order.reference}`}
                    target="_blank"
                    className="rounded-xl bg-slate-900 py-1.5 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 transition-all flex items-center justify-center gap-1 col-span-2 sm:col-span-1"
                  >
                    Track ↗
                  </Link>
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="orders" />

      {/* Filter & Sort Bottom Sheet Modal Dialogue */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 text-slate-900 animate-in slide-in-from-bottom-5 sm:zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Filter & Sort Orders</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Filters */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Order Status</label>
              <div className="grid grid-cols-3 gap-2">
                {['ALL', ...statuses].map(st => {
                  const count = st === 'ALL' ? orders.length : orders.filter(o => o.status?.toUpperCase() === st).length
                  const isActive = statusFilter === st
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-xl px-2.5 py-2 text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{st}</span>
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Sort By</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'latest', label: 'Latest First' },
                  { id: 'oldest', label: 'Oldest First' },
                  { id: 'highest_price', label: 'Highest Amount' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id as any)}
                    className={`rounded-xl px-2.5 py-2 text-xs font-bold transition-all text-center cursor-pointer border ${
                      sortBy === opt.id
                        ? 'bg-slate-900 text-white border-slate-950 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL')
                  setSortBy('latest')
                  setSearchQuery('')
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-extrabold text-xs text-slate-700 hover:bg-slate-200 transition-all cursor-pointer text-center"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 font-extrabold text-xs text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-md text-center"
              >
                Apply Filters ({processedOrders.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
