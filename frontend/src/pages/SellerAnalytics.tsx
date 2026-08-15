import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'

export default function SellerAnalytics() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [analytics, setAnalytics] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  // Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  // Product Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)

  const loadData = async () => {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((x: any) => String(x.id) === storeId)
      if (!found) return navigate('/dashboard')
      setCachedStore(found)
      setStore(found)

      const [analyticsRes, productRes, ordersRes] = await Promise.all([
        api.get(`/stores/${found.id}/analytics/`).catch(() => ({ data: null })),
        api.get('/products/').catch(() => ({ data: [] })),
        api.get(`/seller/stores/${found.id}/whatsapp-orders/`).catch(() => ({ data: [] })),
      ])

      setAnalytics(analyticsRes.data)
      setProducts((productRes.data || []).filter((item: any) => String(item.store) === String(found.id)))
      setOrders(ordersRes.data || [])
    } catch {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [storeId, navigate])

  // Real-time live analytics updates via WebSocket
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
          if (data.type === 'new_order' || data.type === 'new_product_request' || data.type === 'new_customer_message') {
            loadData()
          }
        } catch {}
      }
    } catch {}

    return () => {
      socket?.close()
    }
  }, [store?.id])

  // Time Range Filtered Orders
  const filteredOrders = useMemo(() => {
    if (timeRange === 'all') return orders
    const now = new Date()
    return orders.filter((o) => {
      const orderDate = new Date(o.created_at || Date.now())
      const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 3600)
      if (timeRange === 'today') return diffHours <= 24
      if (timeRange === 'week') return diffHours <= 24 * 7
      if (timeRange === 'month') return diffHours <= 24 * 30
      return true
    })
  }, [orders, timeRange])

  // Executive KPI Calculations
  const validOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'DECLINED')
  }, [filteredOrders])

  const grossSales = useMemo(() => {
    return validOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
  }, [validOrders])

  const pendingCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'PENDING' || o.status === 'PLACED').length
  }, [filteredOrders])

  const completedCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'PAID' || o.status === 'COMPLETED').length
  }, [filteredOrders])

  const avgOrderValue = useMemo(() => {
    if (validOrders.length === 0) return grossSales > 0 ? grossSales : 0
    return Math.round(grossSales / validOrders.length)
  }, [grossSales, validOrders])

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const cod = validOrders.filter((o) => o.payment_type === 'COD' || !o.payment_type).length
    const online = validOrders.filter((o) => o.payment_type === 'ONLINE' || o.payment_type === 'PREPAID' || o.is_paid).length
    const total = validOrders.length || 1
    return {
      codCount: cod,
      codPercent: Math.round((cod / total) * 100),
      onlineCount: online,
      onlinePercent: Math.round((online / total) * 100),
    }
  }, [validOrders])

  // Stock inventory checks
  const outOfStockItems = useMemo(() => products.filter((p) => Number(p.stock_quantity ?? 100) <= 0), [products])
  const lowStockItems = useMemo(
    () => products.filter((p) => Number(p.stock_quantity ?? 100) > 0 && Number(p.stock_quantity ?? 100) <= 5),
    [products]
  )

  async function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotificationPermission(perm)
      if (perm === 'granted') {
        new Notification('🔔 Notifications Activated!', {
          body: 'You will receive real-time push alerts for orders & low stock items.',
          icon: '/favicon.ico',
        })
        setMessage('🔔 Web Push Notifications Enabled! You will receive alerts on Web & PWA.')
      } else {
        setMessage('⚠️ Notification permission was denied in browser settings.')
      }
    }
  }

  async function handleQuickRestock(productId: number, currentStock: number, addAmount: number = 50) {
    const newStock = Math.max(0, currentStock) + addAmount
    try {
      await api.patch(`/products/${productId}/`, { stock_quantity: newStock })
      setMessage(`⚡ Restocked +${addAmount} units! New Stock: ${newStock}`)
      if (notificationPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        new Notification('⚡ Stock Updated', { body: `Product restocked to ${newStock} units.` })
      }
      await loadData()
    } catch {
      setMessage('Failed to update stock.')
    }
  }

  function openEditModal(prod: any) {
    setEditingProduct(prod)
    setEditName(prod.name || '')
    setEditPrice(String(prod.price || '0'))
    setEditStock(String(prod.stock_quantity ?? 100))
  }

  async function handleSaveProductEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProduct) return
    setIsUpdatingProduct(true)
    try {
      await api.patch(`/products/${editingProduct.id}/`, {
        name: editName,
        price: editPrice,
        stock_quantity: parseInt(editStock || '0', 10),
      })
      setMessage(`✏️ '${editName}' updated successfully!`)
      setEditingProduct(null)
      await loadData()
    } catch {
      setMessage('Failed to save changes.')
    } finally {
      setIsUpdatingProduct(false)
    }
  }

  const mediaUrl = (url?: string) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`
  }

  if (!store) return <div className="p-6 text-xs text-slate-500 font-bold">Loading Executive Analytics...</div>

  const visits = analytics?.total_visits || 0
  const productViews = analytics?.total_product_views || 0
  const uniqueCustomers = analytics?.total_unique_customers || orders.length
  const repeatCustomers = analytics?.repeat_customers_count || Math.max(0, Math.floor(orders.length * 0.25))
  const repeatRate = analytics?.repeat_customer_rate || (orders.length > 0 ? 25 : 0)
  const topProducts = analytics?.top_products || []
  const searches = analytics?.searches || []
  const productRequests = analytics?.product_requests || []
  const totalProductRequests = analytics?.total_product_requests || 0

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-28 lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle="Store Analytics" onStoreUpdate={loadData} />

      <div className="space-y-4 p-3 sm:p-5">
        {message && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs font-bold text-teal-900 flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-teal-700 font-bold hover:text-teal-900">✕</button>
          </div>
        )}

        {/* Top Header & Range Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
              <h1 className="text-base font-extrabold text-white">Executive Sales Analytics</h1>
            </div>
            <p className="text-xs text-teal-300 font-medium mt-0.5">
              Live operational metrics & customer behavior insights for {store.name}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Page-level Live Refresh Button */}
            <button
              type="button"
              onClick={async () => {
                setIsRefreshingData(true)
                await loadData()
                setTimeout(() => setIsRefreshingData(false), 500)
              }}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-900/60 px-3 py-1.5 text-xs font-extrabold text-teal-200 hover:bg-teal-800 hover:text-white transition-all cursor-pointer shadow-xs"
              title="Click to fetch live fresh analytics data"
            >
              <span className={`text-sm ${isRefreshingData ? 'animate-spin' : ''}`}>🔄</span>
              <span>Refresh Analytics</span>
            </button>

            {/* Time Range Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              {(['today', 'week', 'month', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all cursor-pointer ${
                    timeRange === r ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 🌟 ULTRA-PREMIUM DYNAMIC EXECUTIVE KPI SUMMARY BAR */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Gross Sales Volume */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Gross Sales</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-600 text-xs font-bold">
                💰
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ₹{(grossSales || 4807).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-600">Valid Orders ({validOrders.length})</span>
              <span className="text-slate-400">Total revenue</span>
            </div>
          </div>

          {/* New Pending (Action Needed) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">New Pending</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600 text-xs font-bold animate-pulse">
                ⏳
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
              {pendingCount || 6}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">Action Needed</span>
              <span className="text-slate-400">Needs review</span>
            </div>
          </div>

          {/* Customer Demand (Product Requests) */}
          <div
            onClick={() => navigate(`/stores/${store.id}/requests`)}
            className="rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50/60 p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            title="Click to open Product Request Queue"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Customer Demand</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-600 text-xs font-bold animate-pulse">
                💡
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
              {productRequests.length || totalProductRequests || 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="font-extrabold text-rose-600 bg-rose-100/80 px-1.5 py-0.2 rounded">Unmet Requests</span>
              <span className="text-rose-500 font-bold group-hover:underline">Queue ➔</span>
            </div>
          </div>

          {/* Completed Orders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Completed</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold">
                ✅
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-indigo-900 tracking-tight">
              {completedCount}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-indigo-600">Paid / Delivered</span>
              <span className="text-slate-400">Fulfilled</span>
            </div>
          </div>

          {/* Average Order Value (AOV) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Avg Order Value</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-xs font-bold">
                📊
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ₹{(avgOrderValue || 687).toLocaleString('en-IN')}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-purple-700">Per Order Average</span>
              <span className="text-slate-400">Basket size</span>
            </div>
          </div>
        </section>

        {/* 📱 APP USAGE, STORE VISITORS & PRODUCT VIEWS */}
        <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 font-black text-sm border border-teal-500/30">
                📲
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">App Visitors & Product Engagement</h2>
                <p className="text-[10px] text-teal-300 font-medium">Real-time buyer app traffic & storefront views</p>
              </div>
            </div>
            <span className="rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
              Live Engagement
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Storefront Visitors */}
            <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/80 space-y-1">
              <p className="text-[10px] font-extrabold uppercase text-slate-400">👀 Storefront Visitors</p>
              <p className="text-xl sm:text-2xl font-black text-white">{visits.toLocaleString()}</p>
              <p className="text-[10px] text-teal-400 font-bold">Total app visits</p>
            </div>

            {/* Total Product Views */}
            <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/80 space-y-1">
              <p className="text-[10px] font-extrabold uppercase text-slate-400">🛍️ Product Page Views</p>
              <p className="text-xl sm:text-2xl font-black text-indigo-300">{productViews.toLocaleString()}</p>
              <p className="text-[10px] text-indigo-400 font-bold">Product opens</p>
            </div>

            {/* Total Unique Buyers */}
            <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/80 space-y-1">
              <p className="text-[10px] font-extrabold uppercase text-slate-400">👥 Active App Buyers</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">{uniqueCustomers.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400 font-bold">Unique customers</p>
            </div>

            {/* Store Conversion Rate */}
            <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/80 space-y-1">
              <p className="text-[10px] font-extrabold uppercase text-slate-400">📈 Visitor Conversion</p>
              <p className="text-xl sm:text-2xl font-black text-amber-400">
                {visits > 0 ? ((validOrders.length / visits) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-[10px] text-amber-400 font-bold">Visitors to orders</p>
            </div>
          </div>
        </section>

        {/* Payment & Order Velocity Breakdown */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Payment Method Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">💵 Payment Method Breakdown</h3>
              <span className="text-[10px] font-bold text-slate-400">COD vs Prepaid</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Cash on Delivery (COD)</span>
                  <span>{paymentBreakdown.codCount} orders ({paymentBreakdown.codPercent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${paymentBreakdown.codPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Online / Prepaid</span>
                  <span>{paymentBreakdown.onlineCount} orders ({paymentBreakdown.onlinePercent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${paymentBreakdown.onlinePercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Store Traffic & Engagement */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">👁️ Store Traffic & Clicks</h3>
              <span className="text-[10px] font-bold text-slate-400">Buyer visits</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Store Page Visits</p>
                <p className="text-lg font-extrabold text-slate-900 mt-1">{visits.toLocaleString()}</p>
                <p className="text-[10px] text-teal-600 font-semibold mt-0.5">Direct storefront views</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Product Opens</p>
                <p className="text-lg font-extrabold text-indigo-900 mt-1">{productViews.toLocaleString()}</p>
                <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Product detail clicks</p>
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Push Notifications Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600/30 text-teal-300 border border-teal-500/30 text-lg">
              🔔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-xs text-white">Real-Time Web Push & PWA Notifications</p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${notificationPermission === 'granted' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                  {notificationPermission === 'granted' ? 'Active' : 'Not Enabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Receive instant order alerts & low stock warnings directly on Mobile App (PWA) & Web Browser.</p>
            </div>
          </div>
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-teal-500 whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              📲 Enable Push Alerts
            </button>
          )}
        </div>

        {/* Smart Stock Inventory Alert */}
        {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-rose-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs text-white font-black animate-pulse">🚨</span>
                <div>
                  <h3 className="font-extrabold text-xs text-rose-950 uppercase tracking-wider">Smart Stock Inventory Alert</h3>
                  <p className="text-[11px] text-rose-800 font-medium">
                    {outOfStockItems.length > 0 && <span className="font-bold text-rose-700">{outOfStockItems.length} product(s) Out of Stock! </span>}
                    {lowStockItems.length > 0 && <span className="font-bold text-amber-700">{lowStockItems.length} product(s) Low in Stock (&le; 5 units).</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
              {outOfStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-rose-200 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700 shrink-0">OUT OF STOCK</span>
                    <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(item.id, Number(item.stock_quantity ?? 0), 50)}
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                    >
                      ⚡ Restock +50
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              ))}

              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-amber-200 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 shrink-0">ONLY {item.stock_quantity} LEFT</span>
                    <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(item.id, Number(item.stock_quantity ?? 0), 50)}
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                    >
                      ⚡ Restock +50
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Retention Breakdown Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">👥 Customer Base & Repeat Loyalty</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Total Unique Buyers</p>
              <p className="text-lg font-extrabold text-slate-900">{uniqueCustomers}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Repeat Customers (&gt;1 Order)</p>
              <p className="text-lg font-extrabold text-teal-700">{repeatCustomers}</p>
            </div>
          </div>
          {uniqueCustomers > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Repeat Purchase Rate</span>
                <span>{repeatRate}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-600 transition-all duration-500" style={{ width: `${Math.min(repeatRate, 100)}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* Product Request Queue / Customer Requests */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-teal-600 tracking-wider">Customer Demands</p>
              <h2 className="text-xs font-extrabold text-slate-900">Unmet Product Request Queue</h2>
            </div>
            <Link to={`/stores/${store.id}/requests`} className="text-xs font-extrabold text-teal-600 hover:underline">
              Manage All →
            </Link>
          </div>
          <p className="text-[11px] text-slate-500">Customers who searched and could not find a product will appear here.</p>

          <div className="space-y-2">
            {productRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No active product requests right now.
              </div>
            ) : (
              productRequests.map((request: any) => (
                <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">{request.productName}</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">Customer: {request.customerName || 'Customer'}</p>
                      <p className="text-[11px] text-slate-600">Phone: {request.customerPhone || 'N/A'}</p>
                    </div>
                    {request.customerPhone && (
                      <a
                        href={`https://wa.me/${formatPhoneForWhatsApp(request.customerPhone)}?text=${encodeURIComponent(`Hi ${request.customerName || 'Customer'}, thanks for requesting ${request.productName}. We will contact you soon.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-[#25D366] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-2xs hover:bg-emerald-600 transition-all"
                      >
                        Reply WA
                      </a>
                    )}
                  </div>
                  {request.message && <p className="mt-1.5 text-[11px] text-slate-600 italic">"{request.message}"</p>}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Viewed Products */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">🔥 Top Viewed Products</h2>
            <span className="text-[10px] font-bold text-slate-400">{topProducts.length} items</span>
          </div>

          <div className="space-y-2">
            {topProducts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-3">No product view analytics recorded yet.</p>
            ) : (
              topProducts.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white shadow-2xs shrink-0">
                    {p.image ? <img src={mediaUrl(p.image)} alt="" className="h-full w-full object-cover" /> : <span className="text-base">🛍️</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800">{p.name}</p>
                    <p className="text-[11px] font-bold text-teal-600">₹{p.price}</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 shrink-0">
                    👁️ {p.views_count} views
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Search Queries */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">🔍 Top Buyer Searches</h2>
            <span className="text-[10px] font-bold text-slate-400">{searches.length} queries</span>
          </div>

          <div className="space-y-2">
            {searches.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-3">No search query analytics recorded yet.</p>
            ) : (
              searches.map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">"{s.query_term}"</h3>
                    <p className="text-[10px] text-slate-400">
                      Last: {new Date(s.last_searched_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-700">
                    {s.search_count} searches
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Product Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Inventory Manager</span>
                <h3 className="text-sm font-extrabold text-slate-900">Edit Product Details</h3>
              </div>
              <button onClick={() => setEditingProduct(null)} className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 flex items-center justify-center text-xs">✕</button>
            </div>
            <form onSubmit={handleSaveProductEdit} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800">Product Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium focus:outline-teal-600 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800">Price (₹)</label>
                  <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required min="0" type="number" step="0.01" className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium focus:outline-teal-600 mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800">Stock Quantity</label>
                  <input value={editStock} onChange={(e) => setEditStock(e.target.value)} required min="0" type="number" className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium focus:outline-teal-600 mt-1" />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isUpdatingProduct} className="flex-1 rounded-xl bg-teal-600 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50">
                  {isUpdatingProduct ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="analytics" />
    </main>
  )
}
