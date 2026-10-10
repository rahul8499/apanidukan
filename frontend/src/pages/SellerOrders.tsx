import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { getWebSocketUrl } from '../utils/websocket'
import { useAuth } from '../context/AuthContext'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import SellerSplashLoader from '../components/SellerSplashLoader'
import ThermalReceiptModal from '../components/ThermalReceiptModal'
import StoreQrStandeeModal from '../components/StoreQrStandeeModal'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'
import { openWhatsAppInvoice, openWhatsAppStatusUpdate } from '../utils/whatsappInvoice'
import { SlidersHorizontal, X, Printer, QrCode } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const statuses = ['NEW', 'CONFIRMED', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'PAID', 'DELIVERED', 'CANCELLED']
const nextStatuses: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PACKED', 'PAID', 'CANCELLED'],
  PACKED: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_PICKUP: ['PAID', 'DELIVERED'], OUT_FOR_DELIVERY: ['PAID', 'DELIVERED'],
  PAID: ['PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'], DELIVERED: [], CANCELLED: [],
}

function apiErrorMessage(err: any) {
  const data = err?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (data && typeof data === 'object') {
    const first: any = Object.entries(data)[0]
    if (first) return `${String(first[0]).replaceAll('_', ' ')}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`
  }
  return 'Could not update status. Please try again.'
}

function fulfilmentStatusLabel(status: string, orderType: string) {
  const pickup = orderType === 'STORE_PICKUP'
  const labels: Record<string, string> = {
    NEW: 'Order Placed', CONFIRMED: 'Order Confirmed', PACKED: 'Packed',
    READY_FOR_PICKUP: 'Ready for Pickup', OUT_FOR_DELIVERY: 'Out for Delivery',
    PAID: pickup ? 'Paid / Ready at Counter' : 'Payment Confirmed',
    DELIVERED: pickup ? 'Collected by Customer' : 'Delivered', CANCELLED: 'Cancelled',
  }
  return labels[status] || status.replaceAll('_', ' ')
}

export default function SellerOrders() {
  const { t } = useTranslation()
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [orders, setOrders] = useState<any[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'highest_price'>('latest')
  const [copiedRef, setCopiedRef] = useState<string | null>(null)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<any | null>(null)
  const [showStandeeModal, setShowStandeeModal] = useState(false)
  const [deliveryOtpOrder, setDeliveryOtpOrder] = useState<any | null>(null)
  const [deliveryOtp, setDeliveryOtp] = useState('')
  const [deliveryOtpSent, setDeliveryOtpSent] = useState(false)
  const [deliveryOtpMessage, setDeliveryOtpMessage] = useState('')
  const [deliveryOtpLoading, setDeliveryOtpLoading] = useState(false)
  const [deliveryProof, setDeliveryProof] = useState<File | null>(null)
  const [otpResendSeconds, setOtpResendSeconds] = useState(0)
  const [deliveryAgents, setDeliveryAgents] = useState<any[]>([])
  const auth = useAuth()
  const navigate = useNavigate()

  const load = async () => {
    try {
      let found: any = null
      if (storeId) {
        try {
          const directRes = await api.get(`/stores/${storeId}/`)
          found = directRes.data
        } catch {
          const stores = await api.get('/stores/')
          const storeList = Array.isArray(stores.data) ? stores.data : (stores.data?.results || [])
          found = storeList.find((x: any) => String(x.id) === storeId)
        }
      } else {
        const stores = await api.get('/stores/')
        const storeList = Array.isArray(stores.data) ? stores.data : (stores.data?.results || [])
        found = storeList[0] || null
      }

      if (!found) return navigate('/dashboard')
      setCachedStore(found)
      setStore(found)

      const response = await api.get(`/seller/stores/${storeId}/whatsapp-orders/`)
      const orderList = Array.isArray(response.data) ? response.data : (response.data?.results || [])
      setOrders(orderList)
      const savedOtpOrderId = sessionStorage.getItem(`delivery_otp_order_${storeId}`)
      if (savedOtpOrderId) {
        const savedOrder = orderList.find((item:any) => String(item.id) === savedOtpOrderId)
        if (savedOrder && savedOrder.status !== 'DELIVERED') {
          setDeliveryOtpOrder(savedOrder)
          setDeliveryOtpSent(Boolean(savedOrder.delivery_otp_pending))
          if (savedOrder.delivery_otp_resend_at) setOtpResendSeconds(Math.max(0, Math.ceil((new Date(savedOrder.delivery_otp_resend_at).getTime() - Date.now()) / 1000)))
        } else sessionStorage.removeItem(`delivery_otp_order_${storeId}`)
      }
      api.get(`/seller/stores/${storeId}/delivery-agents/`).then(r => setDeliveryAgents(r.data.filter((a:any)=>a.is_active))).catch(()=>{})
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => {
    load()
    if (!storeId) return

    // Smart Adaptive Polling: Only poll if WebSockets are NOT connected AND tab is visible
    const interval = setInterval(async () => {
      if (document.hidden || wsConnected) return // Zero HTTP calls when WebSocket is live

      try {
        const response = await api.get(`/seller/stores/${storeId}/whatsapp-orders/`)
        setOrders(Array.isArray(response.data) ? response.data : (response.data?.results || []))
      } catch {}
    }, 120000)

    return () => clearInterval(interval)
  }, [storeId, wsConnected])

  // Instant refresh when seller returns to the app tab
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && storeId) {
        api.get(`/seller/stores/${storeId}/whatsapp-orders/`)
          .then(res => setOrders(Array.isArray(res.data) ? res.data : (res.data?.results || [])))
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [storeId])

  useEffect(() => {
    if (otpResendSeconds <= 0) return
    const timer = window.setInterval(() => setOtpResendSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [otpResendSeconds > 0])

  // WebSocket Live Updates Connection
  useEffect(() => {
    if (!storeId) return

    const token = localStorage.getItem('access_token')
    if (!token) return
    const wsUrl = getWebSocketUrl(`/ws/store/${storeId}/?token=${encodeURIComponent(token)}`)

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
            window.dispatchEvent(new Event('qs-order-count-updated'))
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
      socket.onerror = () => {
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
    setSuccessMsg('')
    if (status === 'DELIVERED') {
      const target = orders.find(order => order.id === id)
      setDeliveryOtpOrder(target || null)
      sessionStorage.setItem(`delivery_otp_order_${storeId}`, String(id))
      setDeliveryOtp('')
      setDeliveryOtpSent(false)
      setDeliveryOtpMessage('')
      setDeliveryProof(null)
      return
    }
    try {
      const payload: any = { status }
      if (status === 'CONFIRMED') {
        const minutes = Number(window.prompt('Expected packing/dispatch time in minutes:', '30'))
        if (!minutes || minutes < 1) return
        payload.expected_dispatch_at = new Date(Date.now() + minutes * 60000).toISOString()
      }
      if (status === 'OUT_FOR_DELIVERY') {
        const assignedOrder = orders.find(order => order.id === id)
        const agentName = assignedOrder?.delivery_agent_name || window.prompt('Delivery agent name:')?.trim()
        const agentPhone = assignedOrder?.delivery_agent_phone || window.prompt('Delivery agent 10-digit mobile number:')?.replace(/\D/g, '').slice(-10)
        if (!agentName || agentPhone?.length !== 10) { setErrorMsg('Valid delivery agent name and phone are required.'); return }
        payload.delivery_agent_name = agentName
        payload.delivery_agent_phone = agentPhone
      }
      const response = await api.patch(
        `/seller/stores/${storeId}/whatsapp-orders/${id}/`,
        payload
      )
      setOrders((current) =>
        current.map((order) => (order.id === id ? response.data : order))
      )
    } catch (err: any) {
      setErrorMsg(apiErrorMessage(err))
    }
  }

  async function sendDeliveryOtp() {
    if (!deliveryOtpOrder) return
    setDeliveryOtpLoading(true)
    setDeliveryOtpMessage('')
    try {
      const res = await api.post(`/seller/stores/${storeId}/whatsapp-orders/${deliveryOtpOrder.id}/delivery-otp/`)
      setDeliveryOtpSent(true)
      setOtpResendSeconds(60)
      setDeliveryOtpMessage(res.data.message || 'OTP sent to the customer.')
    } catch (err: any) {
      setDeliveryOtpMessage(err?.response?.data?.detail || 'OTP could not be sent.')
    } finally {
      setDeliveryOtpLoading(false)
    }
  }

  async function verifyDeliveryOtp() {
    if (!deliveryOtpOrder || deliveryOtp.length !== 6) return
    setDeliveryOtpLoading(true)
    setDeliveryOtpMessage('')
    try {
      const form = new FormData()
      form.append('otp', deliveryOtp)
      if (deliveryProof) form.append('delivery_proof', deliveryProof)
      const res = await api.patch(`/seller/stores/${storeId}/whatsapp-orders/${deliveryOtpOrder.id}/delivery-otp/`, form)
      setOrders(current => current.map(order => order.id === deliveryOtpOrder.id ? res.data.order : order))
      setDeliveryOtpOrder(null)
      sessionStorage.removeItem(`delivery_otp_order_${storeId}`)
      setDeliveryOtp('')
    } catch (err: any) {
      setDeliveryOtpMessage(err?.response?.data?.detail || 'OTP verification failed.')
    } finally {
      setDeliveryOtpLoading(false)
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

  async function assignDeliveryAgent(order: any) {
    if (!deliveryAgents.length) { navigate(`/stores/${storeId}/delivery-team`); return }
    const choices = deliveryAgents.map(a => `${a.id}: ${a.full_name} (${a.agent_code})`).join('\n')
    const selected = window.prompt(`Enter delivery agent number:\n${choices}`)?.trim()
    if (!selected) return
    try {
      await api.post(`/seller/stores/${storeId}/whatsapp-orders/${order.id}/assign-agent/`, { agent_id: Number(selected) })
      setSuccessMsg('Delivery agent assigned successfully. Customer tracking updated live.')
      load()
    } catch (err:any) { setErrorMsg(apiErrorMessage(err)) }
  }

  const copyRefToClipboard = async (refStr: string) => {
    try {
      await navigator.clipboard.writeText(refStr)
      setCopiedRef(refStr)
      setTimeout(() => setCopiedRef(null), 2000)
    } catch {}
  }

  if (!store) return <SellerSplashLoader label="Loading store orders..." />

  const isManageInAppOn = Boolean(store.manage_in_app)

  // Executive KPI Calculations
  const validOrders = orders.filter(o => o.status?.toUpperCase() !== 'CANCELLED')
  const totalSalesVolume = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const newOrdersCount = orders.filter(o => o.status?.toUpperCase() === 'NEW').length
  const completedCount = orders.filter(o => o.status?.toUpperCase() === 'DELIVERED').length
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
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50/80 pb-14 sm:pb-16 lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle="Orders Management" onStoreUpdate={load} />

      <div className="space-y-3 sm:space-y-5 p-2.5 sm:p-6">
        {/* Enterprise Dark Hero Header — Modernized & Compact for Mobile */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-3 sm:p-5 text-white shadow-md sm:shadow-xl border border-indigo-500/30 backdrop-blur-xl">
          {/* Neon Glow background reflections */}
          <div className="absolute -top-12 -right-12 h-36 sm:h-48 w-36 sm:w-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-36 sm:h-48 w-36 sm:w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2.5 sm:space-y-3">
            {/* Top Bar: Status Badge + Refresh + Connection Pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2 py-0.5 text-[8px] sm:text-[10px] font-black uppercase text-teal-300 border border-teal-400/30 tracking-wider shadow-xs">
                {t('ordersControl')}
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setShowStandeeModal(true)}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-indigo-400/40 bg-indigo-950/80 px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-extrabold text-indigo-200 hover:bg-indigo-900 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Print Shop QR Standee & Posters"
                >
                  <QrCode className="h-3 w-3 text-amber-400" />
                  <span className="font-extrabold">🪧 Standee QR</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingData(true)
                    await load()
                    setTimeout(() => setIsRefreshingData(false), 500)
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-teal-500/40 bg-teal-950/70 px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-extrabold text-teal-300 hover:bg-teal-900 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Refresh live orders"
                >
                  <span className={`text-xs ${isRefreshingData ? 'animate-spin' : ''}`}>🔄</span>
                  <span className="font-extrabold">{t('refresh')}</span>
                </button>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 text-[8px] sm:text-[10px] font-extrabold ${
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
                  <span>{wsConnected ? t('liveSync') : t('syncing')}</span>
                </span>
              </div>
            </div>

            {/* Main Stats Row */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
              <div className="flex items-baseline gap-3">
                <div>
                  <p className="text-xl sm:text-3xl font-black text-white leading-none">{orders.length}</p>
                  <p className="text-[9px] sm:text-xs text-indigo-200/90 font-bold mt-0.5">{t('totalOrdersCount')}</p>
                </div>
                <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden xs:block" />
                <div className="hidden xs:block">
                  <p className="text-base sm:text-2xl font-black text-emerald-300 leading-none">₹{totalSalesVolume.toFixed(0)}</p>
                  <p className="text-[9px] sm:text-xs text-slate-300 font-bold mt-0.5">{t('totalRevenue')}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-indigo-200">{t('mode')}</span>
                <span
                  className={`font-black px-2 py-0.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] border shadow-xs ${
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

        {/* Top Executive KPI Metrics Summary Cards — Ultra Compact 1-Row for Android/Mobile */}
        <div className="grid grid-cols-4 gap-1 sm:gap-3">
          <div className="rounded-lg sm:rounded-2xl border border-slate-200/80 bg-white py-1 px-1.5 sm:p-4 shadow-2xs flex flex-col justify-between min-w-0">
            <span className="text-[7.5px] sm:text-[10px] font-black uppercase text-slate-400 tracking-tight truncate">{t('grossSales')}</span>
            <p className="my-0 text-[10px] xs:text-xs sm:text-2xl font-black text-slate-900 truncate leading-tight">₹{totalSalesVolume.toFixed(2)}</p>
            <span className="text-[7.5px] sm:text-xs text-emerald-600 font-bold truncate">{t('validOrders')}</span>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-amber-200/80 bg-amber-50/50 py-1 px-1.5 sm:p-4 shadow-2xs flex flex-col justify-between min-w-0">
            <div className="flex justify-between items-center min-w-0">
              <span className="text-[7.5px] sm:text-[10px] font-black uppercase text-amber-800 tracking-tight truncate">{t('pending')}</span>
              {newOrdersCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping shrink-0"></span>}
            </div>
            <p className="my-0 text-[10px] xs:text-xs sm:text-2xl font-black text-amber-950 leading-tight">{newOrdersCount}</p>
            <span className="text-[7.5px] sm:text-xs text-amber-700 font-bold truncate">{t('actionNeeded')}</span>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-emerald-200/80 bg-emerald-50/50 py-1 px-1.5 sm:p-4 shadow-2xs flex flex-col justify-between min-w-0">
            <span className="text-[7.5px] sm:text-[10px] font-black uppercase text-emerald-800 tracking-tight truncate">{t('completed')}</span>
            <p className="my-0 text-[10px] xs:text-xs sm:text-2xl font-black text-emerald-950 leading-tight">{completedCount}</p>
            <span className="text-[7.5px] sm:text-xs text-emerald-700 font-bold truncate">{t('delivered')}</span>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-slate-200/80 bg-white py-1 px-1.5 sm:p-4 shadow-2xs flex flex-col justify-between min-w-0">
            <span className="text-[7.5px] sm:text-[10px] font-black uppercase text-slate-400 tracking-tight truncate">{t('avgOrder')}</span>
            <p className="my-0 text-[10px] xs:text-xs sm:text-2xl font-black text-slate-900 truncate leading-tight">₹{avgOrderValue.toFixed(0)}</p>
            <span className="text-[7.5px] sm:text-xs text-slate-500 font-bold truncate">{t('perOrder')}</span>
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
              placeholder={t('searchOrdersPlaceholder')}
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
            <option value="latest">{t('sortLatest')}</option>
            <option value="oldest">{t('sortOldest')}</option>
            <option value="highest_price">{t('sortHighestPrice')}</option>
          </select>
        </div>

        {/* Quick Horizontal Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['ALL', ...statuses].map(st => {
            const count = st === 'ALL' ? orders.length : orders.filter(o => o.status?.toUpperCase() === st).length
            const isActive = statusFilter === st
            const statusTranslationKey = st === 'ALL' ? 'statusAll' : `status${st.charAt(0).toUpperCase() + st.slice(1).toLowerCase()}`
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
                <span>{t(statusTranslationKey) || st}</span>
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
        {successMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex justify-between"><span>✅ {successMsg}</span><button onClick={()=>setSuccessMsg('')}>✕</button></div>}

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
                className={`rounded-lg sm:rounded-2xl border border-slate-200 bg-white p-2 sm:p-4 shadow-2xs hover:shadow-md transition-all space-y-1.5 sm:space-y-2 ${getStatusLeftBorder(order.status)}`}
              >
                {/* 1. Header: Order Ref + Time + Amount + Status Dropdown/Badge */}
                <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1 sm:pb-2">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyRefToClipboard(order.reference)}
                      className="rounded-md bg-indigo-50 border border-indigo-100 px-1 sm:px-1.5 py-0.2 sm:py-0.5 text-[9px] sm:text-[11px] font-mono font-black text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer"
                      title="Click to Copy Order #"
                    >
                      <span>#{order.reference}</span>
                      <span className="text-[8px] sm:text-[9px] text-indigo-400">{copiedRef === order.reference ? '✓' : '📋'}</span>
                    </button>
                    <span className="text-[8.5px] sm:text-[10px] font-medium text-slate-400">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-lg font-black text-slate-900">
                      ₹{order.total}
                    </span>

                    {/* Status dropdown or badge */}
                    {isManageInAppOn ? (
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="rounded-md sm:rounded-lg border border-slate-300 bg-slate-900 px-1 sm:px-1.5 py-0.2 sm:py-0.5 text-[9px] sm:text-[11px] font-bold text-white shadow-xs focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                      >
                        {[order.status, ...(nextStatuses[currentStatusUpper] || []).filter(status => {
                          if (status === 'READY_FOR_PICKUP') return order.order_type === 'STORE_PICKUP'
                          if (status === 'OUT_FOR_DELIVERY') return order.order_type === 'HOME_DELIVERY'
                          return true
                        })].map((status) => (
                          <option key={status} value={status} className="bg-white text-slate-900 font-bold">
                            {fulfilmentStatusLabel(status, order.order_type)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex rounded-full px-1.5 py-0.1 sm:px-2 sm:py-0.2 text-[8.5px] sm:text-[10px] font-black border ${getStatusBadgeStyle(order.status)}`}>
                        {order.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Compact Customer & Payment Row */}
                {order.order_type === 'HOME_DELIVERY' && !['DELIVERED','CANCELLED'].includes(currentStatusUpper) && (
                  <div className="flex justify-end gap-2"><Link to={`/stores/${storeId}/delivery-team`} className="text-[10px] font-bold text-slate-500">Manage team</Link><button onClick={()=>assignDeliveryAgent(order)} className="rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-black text-white">🚚 Assign delivery person</button></div>
                )}
                <div className="flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-[8px] sm:text-[9px] shrink-0">
                      {getInitials(order.customer_name)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-900 truncate block text-[10px] sm:text-xs leading-tight">
                        {order.customer_name || 'Customer'}
                      </span>
                      {order.customer_phone && (
                        <a href={`tel:${order.customer_phone}`} className="font-mono text-[8.5px] sm:text-[10px] text-indigo-700 font-bold hover:underline block leading-tight">
                          📞 {order.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <span className={`text-[8.5px] sm:text-[9px] font-black px-1 py-0.1 sm:px-1.5 sm:py-0.2 rounded border ${
                      order.order_type === 'STORE_PICKUP'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}>
                      {order.order_type === 'STORE_PICKUP' ? t('pickup') : t('delivery')}
                    </span>
                    <span className="text-[8.5px] sm:text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.1 sm:px-1.5 sm:py-0.2 rounded border border-slate-200">
                      {order.payment_type === 'COD' ? t('cod') : t('online')}
                    </span>
                  </div>
                </div>

                {/* 3. Delivery Address or Pickup Notice */}
                {order.order_type === 'STORE_PICKUP' ? (
                  <p className="text-[9px] sm:text-[11px] text-amber-900 font-medium bg-amber-50/70 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md border border-amber-200/60 truncate leading-tight">
                    <span className="font-bold">{t('pickup')}: </span>Customer will collect from shop
                  </p>
                ) : order.delivery_address ? (
                  <p className="text-[9px] sm:text-[11px] text-slate-600 font-medium bg-slate-50 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md border border-slate-100 truncate leading-tight">
                    <span className="font-bold text-slate-700">📍 </span>{order.delivery_address}
                    {Number(order.delivery_fee) > 0 && (
                      <span className="font-bold text-indigo-600 ml-1">(Delivery: ₹{Number(order.delivery_fee).toFixed(0)})</span>
                    )}
                  </p>
                ) : null}

                {order.customer_note && (
                  <p className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[9px] sm:text-[11px] font-semibold text-indigo-900">📝 Customer note: {order.customer_note}</p>
                )}

                {/* UTR Payment Verification Badge */}
                {order.utr_number && (
                  <div className="flex items-center justify-between bg-emerald-50/90 border border-emerald-200 px-2 py-1 rounded-md text-[9px] sm:text-[11px] text-emerald-950 font-bold">
                    <span className="flex items-center gap-1 font-mono">
                      <span>💳 UTR: {order.utr_number}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStatus(order.id, 'PAID')}
                      className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[8.5px] sm:text-[10px] font-black hover:bg-emerald-700 cursor-pointer shadow-2xs"
                    >
                      {order.status === 'PAID' ? '✓ Paid Verified' : 'Confirm PAID'}
                    </button>
                  </div>
                )}

                {/* 4. Compact Purchased Items List */}
                <div className="rounded-md sm:rounded-lg bg-slate-50/80 p-1 sm:p-2 text-xs border border-slate-100 space-y-0.2">
                  <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <span>{t('itemsCount')} ({order.items?.length || 0})</span>
                    <span>{t('qtyPrice')}</span>
                  </div>
                  {Array.isArray(order.items) &&
                    order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-800 text-[9px] sm:text-[11px]">
                        <span className="font-semibold truncate">• {item.name || item.product_name || 'Product'}{item.selected_size ? ` — Size: ${item.selected_size}` : ''}</span>
                        <span className="font-black shrink-0 ml-1.5">×{item.quantity} (₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(0)})</span>
                      </div>
                    ))}
                </div>

                {/* 5. Progress Bar or Cancellation Notice */}
                {currentStatusUpper === 'CANCELLED' ? (
                  <div className="rounded-md sm:rounded-lg bg-rose-50 border border-rose-200 p-1.5 sm:p-2 text-[9px] sm:text-[11px] text-rose-900 space-y-0.5">
                    <div className="flex items-center justify-between font-extrabold text-rose-700">
                      <span>❌ Order Cancelled</span>
                      {order.cancelled_by && (
                        <span className="text-[8.5px] uppercase px-1.5 py-0.2 rounded bg-rose-200/80 text-rose-950 font-black">
                          By {order.cancelled_by === 'CUSTOMER' ? 'Customer' : 'Seller'}
                        </span>
                      )}
                    </div>
                    {order.cancellation_reason && (
                      <p className="font-bold text-rose-800">
                        Reason: <span className="font-medium text-rose-900">{order.cancellation_reason}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[7.5px] sm:text-[9px] font-extrabold text-slate-500 pt-0.2">
                    <span className={currentStatusUpper === 'NEW' ? 'text-amber-600 font-black' : 'text-slate-400'}>{t('placed')}</span>
                    <div className="flex-1 h-0.5 sm:h-1 rounded-full bg-slate-200 overflow-hidden">
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
                      {currentStatusUpper === 'PAID' ? 'Paid (75%)' : currentStatusUpper === 'DELIVERED' ? `${t('delivered')} ✓` : t('delivered')}
                    </span>
                  </div>
                )}

                {/* 6. Clean Action Toolbar — Ultra Compact Single Row for Mobile */}
                <div className="grid grid-cols-5 sm:flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForReceipt(order)}
                    className="rounded-md sm:rounded-lg bg-teal-700 py-0.5 sm:py-1 px-1 sm:px-2 text-[9px] sm:text-[11px] font-bold text-white shadow-2xs hover:bg-teal-800 transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                    title="Print POS Thermal Receipt / Invoice"
                  >
                    <Printer className="h-3 w-3 text-teal-300 hidden sm:inline" />
                    <span>🖨️ Bill</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startDirectChat(order)}
                    className="rounded-md sm:rounded-lg bg-indigo-600 py-0.5 sm:py-1 px-1 sm:px-2 text-[9px] sm:text-[11px] font-bold text-white shadow-2xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                  >
                    {t('chatBtn')}
                  </button>

                  {order.customer_phone ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openWhatsAppInvoice(order.customer_phone, order, store)}
                        className="rounded-md sm:rounded-lg bg-emerald-600 py-0.5 sm:py-1 px-1 sm:px-2 text-[9px] sm:text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                        title="Send formatted bill & live tracking link to buyer on WhatsApp"
                      >
                        <span className="sm:hidden">💬 Bill</span>
                        <span className="hidden sm:inline">💬 WA Bill</span>
                      </button>
                      <a
                        className="rounded-md sm:rounded-lg bg-slate-100 border border-slate-200 py-0.5 sm:py-1 px-1 sm:px-2 text-[9px] sm:text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                        href={`tel:${order.customer_phone}`}
                      >
                        {t('callBtn')}
                      </a>
                    </>
                  ) : null}

                  <Link
                    to={`/store/${store.slug}/order/${order.reference}?token=${order.tracking_token}`}
                    target="_blank"
                    className="rounded-md sm:rounded-lg bg-slate-900 py-0.5 sm:py-1 px-1 sm:px-2 text-[9px] sm:text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <span className="sm:hidden">📍 Track</span>
                    <span className="hidden sm:inline">{t('trackBtn')}</span>
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

      {/* POS Thermal Receipt Modal */}
      {selectedOrderForReceipt && (
        <ThermalReceiptModal
          order={selectedOrderForReceipt}
          store={store}
          onClose={() => setSelectedOrderForReceipt(null)}
        />
      )}

      {/* Store QR Standee & Printable Poster Modal */}
      {showStandeeModal && (
        <StoreQrStandeeModal
          store={store}
          publicUrl={`${window.location.origin}/s/${store.slug}`}
          onClose={() => setShowStandeeModal(false)}
        />
      )}

      {deliveryOtpOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/65 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Secure fulfilment</p><h2 className="mt-1 text-base font-black text-slate-950">Confirm Delivery with OTP</h2></div><button onClick={() => { setDeliveryOtpOrder(null); sessionStorage.removeItem(`delivery_otp_order_${storeId}`) }} className="rounded-full bg-slate-100 px-2 py-1 font-bold">✕</button></div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-950"><p className="font-bold">Order #{deliveryOtpOrder.reference}</p><p className="mt-1 text-[11px]">OTP will be sent only to the customer number saved with this order. The number cannot be changed here.</p></div>
            {!deliveryOtpSent ? <button disabled={deliveryOtpLoading} onClick={sendDeliveryOtp} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-black text-white disabled:opacity-50">{deliveryOtpLoading ? 'Sending…' : 'Send Delivery OTP'}</button> : <>
              <label className="block text-xs font-bold text-slate-700">Enter OTP told by customer<input autoFocus value={deliveryOtp} onChange={e => setDeliveryOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit OTP" className="mt-1.5 w-full rounded-xl border p-3 text-center text-xl font-black tracking-[0.4em]"/></label>
              {deliveryOtpOrder.order_type === 'HOME_DELIVERY' && <label className="block rounded-xl border border-dashed p-3 text-xs font-bold">Delivery proof photo (Required)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setDeliveryProof(e.target.files?.[0] || null)} className="mt-2 block w-full text-xs"/></label>}
              <button disabled={deliveryOtpLoading || deliveryOtp.length !== 6 || (deliveryOtpOrder.order_type === 'HOME_DELIVERY' && !deliveryProof)} onClick={verifyDeliveryOtp} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50">{deliveryOtpLoading ? 'Verifying…' : 'Verify OTP & Mark Delivered'}</button>
              <button disabled={deliveryOtpLoading || otpResendSeconds > 0} onClick={sendDeliveryOtp} className="w-full text-xs font-bold text-indigo-700 disabled:text-slate-400">{otpResendSeconds > 0 ? `Resend OTP in ${otpResendSeconds}s` : 'Resend OTP'}</button>
            </>}
            {deliveryOtpMessage && <p className={`rounded-xl p-3 text-xs font-bold ${deliveryOtpMessage.toLowerCase().includes('sent') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{deliveryOtpMessage}</p>}
          </div>
        </div>
      )}
    </main>
  )
}
