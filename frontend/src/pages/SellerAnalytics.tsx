import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  RefreshCw, Download, FileSpreadsheet, Users, UserCheck,
  Repeat, TrendingUp, Sparkles, Phone, MessageSquare, ShoppingBag
} from 'lucide-react'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import WhatsAppMarketingCrmModal from '../components/WhatsAppMarketingCrmModal'
import SellerDeliveryConfigModal from '../components/SellerDeliveryConfigModal'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'

export default function SellerAnalytics() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [analytics, setAnalytics] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [message, setMessage] = useState('')
  const [showCrmModal, setShowCrmModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
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

      const [analyticsRes, productRes, ordersRes, couponsRes] = await Promise.all([
        api.get(`/stores/${found.id}/analytics/`).catch(() => ({ data: null })),
        api.get('/products/').catch(() => ({ data: [] })),
        api.get(`/seller/stores/${found.id}/whatsapp-orders/`).catch(() => ({ data: [] })),
        api.get('/coupons/').catch(() => ({ data: [] })),
      ])

      setAnalytics(analyticsRes.data)
      setProducts((productRes.data || []).filter((item: any) => String(item.store) === String(found.id)))
      setOrders(ordersRes.data || [])
      const couponList = Array.isArray(couponsRes.data) ? couponsRes.data : (couponsRes.data?.results || [])
      setCoupons(couponList.filter((item: any) => String(item.store) === String(found.id)))
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
          if (
            data.type === 'new_order' ||
            data.type === 'new_product_request' ||
            data.type === 'new_customer_message' ||
            data.type === 'store_visit' ||
            data.type === 'product_view' ||
            data.type === 'order_status_updated' ||
            data.type === 'store_analytics_updated'
          ) {
            loadData()
          }
        } catch { }
      }
    } catch { }

    return () => {
      socket?.close()
    }
  }, [store?.id])

  const visits = analytics?.total_visits || 0
  const productViews = analytics?.total_product_views || 0
  const topProducts = analytics?.top_products || []
  const searches = analytics?.searches || []
  const productRequests = analytics?.product_requests || []
  const totalProductRequests = analytics?.total_product_requests || 0

  // Time Range Filtered Orders
  const filteredOrders = useMemo(() => {
    if (timeRange === 'all') return orders
    const now = new Date()

    if (timeRange === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      return orders.filter((o) => {
        const orderDate = new Date(o.created_at || Date.now())
        return orderDate >= startOfToday
      })
    }

    if (timeRange === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return orders.filter((o) => {
        const orderDate = new Date(o.created_at || Date.now())
        return orderDate >= sevenDaysAgo
      })
    }

    if (timeRange === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return orders.filter((o) => {
        const orderDate = new Date(o.created_at || Date.now())
        return orderDate >= thirtyDaysAgo
      })
    }

    return orders
  }, [orders, timeRange])

  // Time Range Filtered Product Requests (Customer Demand)
  const filteredProductRequests = useMemo(() => {
    if (timeRange === 'all') return productRequests
    const now = new Date()

    if (timeRange === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      return productRequests.filter((r: any) => new Date(r.created_at || Date.now()) >= startOfToday)
    }

    if (timeRange === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return productRequests.filter((r: any) => new Date(r.created_at || Date.now()) >= sevenDaysAgo)
    }

    if (timeRange === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return productRequests.filter((r: any) => new Date(r.created_at || Date.now()) >= thirtyDaysAgo)
    }

    return productRequests
  }, [productRequests, timeRange])

  // Executive KPI Calculations
  const validOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      const st = (o.status || '').toUpperCase()
      return st !== 'CANCELLED' && st !== 'DECLINED'
    })
  }, [filteredOrders])

  const grossSales = useMemo(() => {
    return validOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
  }, [validOrders])

  const pendingCount = useMemo(() => {
    return filteredOrders.filter((o) => {
      const st = (o.status || '').toUpperCase()
      return st === 'NEW' || st === 'PENDING' || st === 'PLACED'
    }).length
  }, [filteredOrders])

  const completedCount = useMemo(() => {
    return filteredOrders.filter((o) => {
      const st = (o.status || '').toUpperCase()
      return st === 'DELIVERED' || st === 'COMPLETED'
    }).length
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

  // Coupon Redemptions & Savings Metrics
  const totalCouponRedemptions = useMemo(() => {
    return coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0)
  }, [coupons])

  const totalCouponDiscountGiven = useMemo(() => {
    return validOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0)
  }, [validOrders])

  // Real Customer Retention, Demographics & Top Loyal Buyers Aggregation
  const customerStats = useMemo(() => {
    const customerMap: { [key: string]: {
      name: string
      phone: string
      ordersCount: number
      filteredOrdersCount: number
      totalSpent: number
      filteredSpent: number
      firstOrderDate: Date
      lastOrderDate: Date
      isRepeat: boolean
    }} = {}

    // 1. Process ALL historical orders to get accurate customer lifetime data
    orders.forEach((o) => {
      const phone = (o.customer_phone || '').trim()
      const name = (o.customer_name || '').trim()
      const key = phone || name || `order_${o.id}`
      const orderDate = new Date(o.created_at || Date.now())
      const total = parseFloat(o.total) || 0

      if (!customerMap[key]) {
        customerMap[key] = {
          name: name || 'Customer',
          phone: phone,
          ordersCount: 0,
          filteredOrdersCount: 0,
          totalSpent: 0,
          filteredSpent: 0,
          firstOrderDate: orderDate,
          lastOrderDate: orderDate,
          isRepeat: false,
        }
      }

      const c = customerMap[key]
      c.ordersCount += 1
      c.totalSpent += total
      if (orderDate < c.firstOrderDate) c.firstOrderDate = orderDate
      if (orderDate > c.lastOrderDate) c.lastOrderDate = orderDate
      c.isRepeat = c.ordersCount > 1
    })

    // 2. Filter for the selected timeRange
    const filteredCustomerKeys = new Set<string>()
    filteredOrders.forEach((o) => {
      const phone = (o.customer_phone || '').trim()
      const name = (o.customer_name || '').trim()
      const key = phone || name || `order_${o.id}`
      filteredCustomerKeys.add(key)
      if (customerMap[key]) {
        customerMap[key].filteredOrdersCount += 1
        customerMap[key].filteredSpent += parseFloat(o.total) || 0
      }
    })

    const totalUnique = filteredCustomerKeys.size || (timeRange === 'all' ? Object.keys(customerMap).length : 0)

    let repeatCount = 0
    let newCount = 0

    filteredCustomerKeys.forEach((k) => {
      const c = customerMap[k]
      if (c) {
        if (c.ordersCount > 1) repeatCount++
        else newCount++
      }
    })

    // Fallback to backend analytics endpoint if no local order cache
    if (totalUnique === 0 && analytics?.total_unique_customers) {
      return {
        totalUnique: analytics.total_unique_customers,
        newCustomers: analytics.new_customers_count ?? Math.max(0, analytics.total_unique_customers - (analytics.repeat_customers_count || 0)),
        repeatCustomers: analytics.repeat_customers_count ?? 0,
        repeatRate: analytics.repeat_customer_rate ?? 0,
        avgCustomerSpend: analytics.avg_customer_value ?? (analytics.total_revenue && analytics.total_unique_customers ? Math.round(analytics.total_revenue / analytics.total_unique_customers) : 0),
        topCustomersList: analytics.top_customers || [],
      }
    }

    const repeatRate = totalUnique > 0 ? Math.round((repeatCount / totalUnique) * 100) : 0
    const filteredRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
    const avgCustomerSpend = totalUnique > 0 ? Math.round(filteredRevenue / totalUnique) : 0

    // Top Loyal Customers Leaderboard
    const topCustomersList = Object.values(customerMap)
      .sort((a, b) => (b.totalSpent - a.totalSpent) || (b.ordersCount - a.ordersCount))
      .slice(0, 25)

    return {
      totalUnique,
      newCustomers: newCount,
      repeatCustomers: repeatCount,
      repeatRate,
      avgCustomerSpend,
      topCustomersList,
    }
  }, [orders, filteredOrders, timeRange, analytics])

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

  // 📥 Download Real Analytics & Customer Dataset as CSV
  const downloadCSVReport = () => {
    const rangeLabel =
      timeRange === 'today'
        ? 'Today_24h'
        : timeRange === 'week'
        ? 'Last_7_Days'
        : timeRange === 'month'
        ? 'Last_30_Days'
        : 'All_Time'

    const rows: string[] = []
    rows.push(`"Store Sales & Customer Analytics Report"`)
    rows.push(`"Store Name","${(store?.name || '').replace(/"/g, '""')}"`)
    rows.push(`"Store Slug","${(store?.slug || '').replace(/"/g, '""')}"`)
    rows.push(`"Time Range","${rangeLabel}"`)
    rows.push(`"Generated At","${new Date().toLocaleString('en-IN')}"`)
    rows.push(``)
    rows.push(`"=== EXECUTIVE KPI SUMMARY ==="`)
    rows.push(`"Metric","Value"`)
    rows.push(`"Gross Revenue (INR)","${grossSales.toFixed(2)}"`)
    rows.push(`"Valid Orders Count","${validOrders.length}"`)
    rows.push(`"Total Unique Customers","${customerStats.totalUnique}"`)
    rows.push(`"New 1st-Time Customers","${customerStats.newCustomers}"`)
    rows.push(`"Repeat Returning Customers","${customerStats.repeatCustomers}"`)
    rows.push(`"Repeat Retention Rate (%)","${customerStats.repeatRate}%"`)
    rows.push(`"Average Order Value (INR)","${avgOrderValue}"`)
    rows.push(`"Average Spend Per Customer (INR)","${customerStats.avgCustomerSpend}"`)
    rows.push(``)
    rows.push(`"=== CUSTOMER RETENTION & DEMOGRAPHICS ==="`)
    rows.push(`"Rank","Customer Name","WhatsApp Phone","Total Orders","Lifetime Spent (INR)","Customer Segment","First Order Date","Last Order Date"`)

    customerStats.topCustomersList.forEach((c: any, index: number) => {
      const seg = c.ordersCount > 1 ? 'Repeat Customer' : 'New Customer'
      const firstDate = c.firstOrderDate ? new Date(c.firstOrderDate).toLocaleDateString('en-IN') : '-'
      const lastDate = c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : '-'
      rows.push(`"${index + 1}","${(c.name || 'Customer').replace(/"/g, '""')}","${c.phone || ''}","${c.ordersCount}","${Number(c.totalSpent || 0).toFixed(2)}","${seg}","${firstDate}","${lastDate}"`)
    })

    rows.push(``)
    rows.push(`"=== DETAILED ORDERS BREAKDOWN ==="`)
    rows.push(`"Order #","Date","Customer Name","Phone","Order Type","Payment Type","Items Count","Total (INR)","Status"`)
    filteredOrders.forEach((o: any) => {
      const date = o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '-'
      const itemsCount = Array.isArray(o.items) ? o.items.length : 0
      rows.push(`"#${o.reference}","${date}","${(o.customer_name || '').replace(/"/g, '""')}","${o.customer_phone || ''}","${o.order_type || 'HOME_DELIVERY'}","${o.payment_type || 'COD'}","${itemsCount}","${Number(o.total || 0).toFixed(2)}","${o.status || 'NEW'}"`)
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'))
    const link = document.createElement('a')
    link.setAttribute('href', csvContent)
    link.setAttribute('download', `${store?.slug || 'store'}_analytics_customers_${rangeLabel}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setMessage('📥 Analytics & Customer CSV report downloaded successfully!')
  }

  const downloadPDFReport = () => {
    const rangeLabel =
      timeRange === 'today'
        ? 'Today (24 Hours)'
        : timeRange === 'week'
        ? 'Last 7 Days'
        : timeRange === 'month'
        ? 'Last 30 Days'
        : 'All Time History'

    const printWindow = window.open('', '_blank', 'width=1000,height=1050')
    if (!printWindow) return

    // Calculate Store Performance Score (out of 100)
    const conversionVal = visits > 0 ? (validOrders.length / visits) * 100 : 0
    const healthScore = Math.min(100, Math.max(65, Math.round(80 + conversionVal * 2 - outOfStockItems.length * 3)))
    const healthGrade = healthScore >= 90 ? 'A+' : healthScore >= 80 ? 'A' : 'B+'

    const maxViews = topProducts.length > 0 ? Math.max(...topProducts.map((p: any) => p.views_count || 1)) : 1

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Executive Sales & Performance Audit Report - ${store.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
            * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 0; }
            body { padding: 32px; color: #0f172a; background: #ffffff; font-size: 12px; line-height: 1.4; }
            
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
            .brand { display: flex; align-items: center; gap: 14px; }
            .brand-logo { width: 50px; height: 50px; border-radius: 14px; background: linear-gradient(135deg, #0f172a, #1e1b4b); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; border: 2px solid #0d9488; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
            .title-section h1 { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
            .title-section p { font-size: 11px; color: #475569; margin-top: 2px; font-weight: 700; }
            
            .header-right { display: flex; align-items: center; gap: 15px; }
            .health-badge { background: linear-gradient(135deg, #0f172a, #047857); color: white; padding: 8px 14px; border-radius: 12px; text-align: center; border: 1px solid #10b981; }
            .health-badge .score { font-size: 16px; font-weight: 900; color: #34d399; }
            .health-badge .label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }

            .meta-badge { text-align: right; }
            .meta-badge .period { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-badge .timestamp { font-size: 10px; color: #64748b; margin-top: 6px; font-weight: 600; }
            
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 14px; background: #f8fafc; position: relative; overflow: hidden; }
            .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #0d9488; }
            .kpi-card.amber::before { background: #d97706; }
            .kpi-card.rose::before { background: #e11d48; }
            .kpi-card.indigo::before { background: #4f46e5; }
            
            .kpi-card .label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
            .kpi-card .value { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; letter-spacing: -0.5px; }
            .kpi-card .sub { font-size: 10px; font-weight: 700; color: #059669; margin-top: 2px; }

            .chart-box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: #ffffff; margin-bottom: 20px; }
            .chart-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 10px; letter-spacing: 0.5px; display: flex; justify-content: space-between; }
            
            /* Visual Progress Bars */
            .bar-bg { width: 100%; height: 10px; background: #e2e8f0; border-radius: 20px; overflow: hidden; display: flex; margin-top: 6px; }
            .bar-fill-teal { height: 100%; background: linear-gradient(90deg, #0d9488, #10b981); border-radius: 20px; }
            .bar-fill-indigo { height: 100%; background: linear-gradient(90deg, #4f46e5, #6366f1); border-radius: 20px; }
            .bar-fill-amber { height: 100%; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 20px; }

            .section-title { font-size: 12px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 10px; margin-top: 18px; border-left: 4px solid #0d9488; padding-left: 8px; letter-spacing: 0.5px; }
            .table-container { margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background: #0f172a; color: white; padding: 9px 12px; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
            td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 600; }
            tr:nth-child(even) { background: #f8fafc; }
            
            .badge-alert { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 9px; }
            .badge-ok { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 9px; }
            
            .product-chart-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 11px; font-weight: 700; }
            .product-chart-name { width: 35%; truncate; font-weight: 800; color: #1e293b; }
            .product-chart-bar-wrap { width: 50%; background: #f1f5f9; height: 10px; border-radius: 10px; overflow: hidden; }
            .product-chart-bar { height: 100%; background: linear-gradient(90deg, #0f172a, #0d9488); border-radius: 10px; }
            .product-chart-val { width: 15%; text-align: right; font-weight: 900; color: #0d9488; }

            .seal-stamp { border: 2px dashed #0d9488; padding: 6px 14px; border-radius: 8px; color: #0d9488; font-weight: 900; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; display: inline-flex; align-items: center; gap: 6px; }

            .footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; font-weight: 600; }
            @media print {
              body { padding: 0; }
              @page { size: A4; margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <!-- Executive Header -->
          <div class="header">
            <div class="brand">
              <div class="brand-logo">${store.name ? store.name.charAt(0).toUpperCase() : 'S'}</div>
              <div class="title-section">
                <h1>${store.name} — Executive Audit Report</h1>
                <p>Store Handle: @${store.slug} • Verified Intelligence Platform</p>
              </div>
            </div>
            
            <div class="header-right">
              <div class="health-badge">
                <div class="score">Grade ${healthGrade} (${healthScore}/100)</div>
                <div class="label">Store Performance Index</div>
              </div>
              <div class="meta-badge">
                <span class="period">${rangeLabel}</span>
                <div class="timestamp">Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              </div>
            </div>
          </div>

          <!-- Section 1: Executive KPI Grid -->
          <div class="section-title">1. Executive Financial & Operational Metrics</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="label">Gross Revenue</div>
              <div class="value">₹${grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div class="sub">${validOrders.length} Valid Orders</div>
            </div>
            <div class="kpi-card amber">
              <div class="label">Pending Action</div>
              <div class="value">${pendingCount}</div>
              <div class="sub" style="color: #d97706;">Action Needed</div>
            </div>
            <div class="kpi-card rose">
              <div class="label">Customer Demand</div>
              <div class="value">${filteredProductRequests.length}</div>
              <div class="sub" style="color: #e11d48;">Unmet Product Requests</div>
            </div>
            <div class="kpi-card indigo">
              <div class="label">Completed Deliveries</div>
              <div class="value">${completedCount}</div>
              <div class="sub" style="color: #4f46e5;">100% Fulfilled</div>
            </div>
          </div>

          <!-- Section 2: Visual Progress Chart - Payment Method Distribution -->
          <div class="chart-box">
            <div class="chart-title">
              <span>💳 Payment Method Share & Cash Distribution Chart</span>
              <span>Total Volume: ${validOrders.length} Orders</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 11px;">
                  <span>Cash on Delivery (COD)</span>
                  <span style="color: #0d9488;">${paymentBreakdown.codPercent}% (${paymentBreakdown.codCount} orders)</span>
                </div>
                <div class="bar-bg">
                  <div class="bar-fill-teal" style="width: ${paymentBreakdown.codPercent}%;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 11px;">
                  <span>Prepaid / Online Payment</span>
                  <span style="color: #4f46e5;">${paymentBreakdown.onlinePercent}% (${paymentBreakdown.onlineCount} orders)</span>
                </div>
                <div class="bar-bg">
                  <div class="bar-fill-indigo" style="width: ${paymentBreakdown.onlinePercent}%;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Promotions & Coupon Redemptions Audit -->
          <div class="section-title">3. Promotions & Coupon Redemptions Audit</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="label">Active Coupons</div>
              <div class="value">${coupons.filter(c => c.is_active).length} / ${coupons.length}</div>
              <div class="sub" style="color: #059669;">Published Live</div>
            </div>
            <div class="kpi-card indigo">
              <div class="label">Total Redemptions</div>
              <div class="value">${totalCouponRedemptions}</div>
              <div class="sub" style="color: #4f46e5;">Placed Orders</div>
            </div>
            <div class="kpi-card">
              <div class="label">Total Discount Given</div>
              <div class="value">₹${totalCouponDiscountGiven.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="sub" style="color: #059669;">Customer Savings</div>
            </div>
          </div>

          ${coupons.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Status</th>
                    <th>Offer Discount</th>
                    <th>Successful Order Redemptions</th>
                  </tr>
                </thead>
                <tbody>
                  ${coupons.map((c: any) => `
                    <tr>
                      <td style="font-family: monospace; font-weight: 900; color: #4f46e5;">${c.code}</td>
                      <td>${c.is_active ? '<span class="badge-ok">PUBLISHED</span>' : '<span class="badge-alert">DRAFT</span>'}</td>
                      <td>${c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `FLAT ₹${c.discount_value} OFF`} ${c.min_order_amount > 0 ? `(Min Order ₹${c.min_order_amount})` : ''}</td>
                      <td style="font-weight: 800; color: #0f172a;">${c.usage_count || 0} Orders Applied</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Section 4: Customer Retention & Repeat Loyalty Analysis -->
          <div class="section-title">4. Customer Retention & Repeat Loyalty Analysis</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="label">Total Unique Buyers</div>
              <div class="value">${customerStats.totalUnique.toLocaleString()}</div>
              <div class="sub" style="color: #2563eb;">Distinct Customers</div>
            </div>
            <div class="kpi-card">
              <div class="label">New 1st-Time Buyers</div>
              <div class="value">${customerStats.newCustomers.toLocaleString()}</div>
              <div class="sub" style="color: #059669;">First-Time Purchases</div>
            </div>
            <div class="kpi-card indigo">
              <div class="label">Repeat Buyers (&gt;1 Order)</div>
              <div class="value">${customerStats.repeatCustomers.toLocaleString()}</div>
              <div class="sub" style="color: #4f46e5;">Loyal Returning Buyers</div>
            </div>
            <div class="kpi-card amber">
              <div class="label">Repeat Retention Rate</div>
              <div class="value">${customerStats.repeatRate}%</div>
              <div class="sub" style="color: #d97706;">Buyer Retention Index</div>
            </div>
          </div>

          <!-- Section 4B: Top Loyal Customers Leaderboard -->
          ${customerStats.topCustomersList.length > 0 ? `
            <div class="section-title" style="margin-top: 10px;">Top Loyal Customers Leaderboard</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Customer Name</th>
                    <th>WhatsApp Phone</th>
                    <th>Segment</th>
                    <th>Total Orders</th>
                    <th>Lifetime Spent</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerStats.topCustomersList.slice(0, 10).map((c: any, i: number) => `
                    <tr>
                      <td style="font-weight: 900; color: #4f46e5;">#${i + 1}</td>
                      <td style="font-weight: 800; color: #0f172a;">${c.name || 'Customer'}</td>
                      <td style="font-family: monospace;">${c.phone || '-'}</td>
                      <td>${c.ordersCount > 1 ? '<span class="badge-ok">VIP REPEAT</span>' : '<span class="badge-alert">NEW BUYER</span>'}</td>
                      <td style="font-weight: 800;">${c.ordersCount} Orders</td>
                      <td style="font-weight: 900; color: #0d9488;">₹${Number(c.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Section 4: Top Product Performance Visual Bar Chart -->
          ${topProducts.length > 0 ? `
            <div class="chart-box">
              <div class="chart-title">
                <span>🔥 Top Product Views & Catalog Impressions</span>
                <span>Max Views: ${maxViews}</span>
              </div>
              <div>
                ${topProducts.slice(0, 5).map((p: any) => {
                  const pct = Math.round(((p.views_count || 1) / maxViews) * 100)
                  return `
                    <div class="product-chart-row">
                      <div class="product-chart-name">${p.name || 'Unnamed Product'}</div>
                      <div class="product-chart-bar-wrap">
                        <div class="product-chart-bar" style="width: ${pct}%;"></div>
                      </div>
                      <div class="product-chart-val">${p.views_count || 0} views</div>
                    </div>
                  `
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Section 5: Inventory Stock Health Audit -->
          <div class="section-title">5. Inventory Stock Health & Risk Audit</div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Stock Category</th>
                  <th>Product Count</th>
                  <th>Status & Operational Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Out of Stock (0 items remaining)</td>
                  <td>${outOfStockItems.length} items</td>
                  <td>${outOfStockItems.length > 0 ? '<span class="badge-alert">Critical: Immediate Restock Required</span>' : '<span class="badge-ok">Optimal Stock Level</span>'}</td>
                </tr>
                <tr>
                  <td>Low Stock Warning (1 to 5 items left)</td>
                  <td>${lowStockItems.length} items</td>
                  <td>${lowStockItems.length > 0 ? '<span class="badge-alert">Reorder Buffer Quantity</span>' : '<span class="badge-ok">Healthy Inventory</span>'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section 6: Customer Demand Queue Audit -->
          ${filteredProductRequests.length > 0 ? `
            <div class="section-title">6. Customer Unmet Product Demand Queue</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Requested Product</th>
                    <th>Customer Name / Phone</th>
                    <th>Date Logged</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredProductRequests.slice(0, 8).map((r: any) => `
                    <tr>
                      <td style="font-weight: 800; color: #0f172a;">${r.productName || r.product_name || 'Requested Item'}</td>
                      <td>${r.customerName || r.customer_name || r.customerPhone || r.customer_phone || 'Anonymous Customer'}</td>
                      <td>${new Date(r.createdAt || r.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Section 7: Popular Search Queries -->
          ${searches.length > 0 ? `
            <div class="section-title">7. Popular Storefront Search Queries</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Search Query Term</th>
                    <th>Search Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${searches.slice(0, 8).map((s: any) => `
                    <tr>
                      <td style="font-weight: 800; color: #0f172a;">"${s.query_term || s.query || s.term || 'Search Term'}"</td>
                      <td>${s.search_count || s.count || 1} searches</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Footer Verification Stamp -->
          <div class="footer">
            <div class="seal-stamp">
              <span>🛡️</span>
              <span>VERIFIED EXECUTIVE AUDIT • PASSED</span>
            </div>
            <div>CONFIDENTIAL — FOR STORE MANAGER AUDIT ONLY</div>
            <div>Executive Intelligence • Page 1 of 1</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  if (!store) return <div className="p-6 text-xs text-slate-500 font-bold">Loading Executive Analytics...</div>

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-14 sm:pb-16 lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle="Store Analytics" onStoreUpdate={loadData} />

      <div className="space-y-2 sm:space-y-5 p-1.5 sm:p-6">
        {message && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-2 sm:p-3 text-xs font-bold text-teal-900 flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-teal-700 font-bold hover:text-teal-900 cursor-pointer">✕</button>
          </div>
        )}

        {/* 1. Header & Time Range Filter Toolbar */}
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 via-slate-900 to-teal-950 p-3 sm:p-4.5 rounded-2xl text-white shadow-xl border border-teal-500/30 backdrop-blur-md">
          {/* Ambient Decorative Glow */}
          <div className="absolute -right-8 -bottom-8 h-28 w-28 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -left-8 -top-8 h-28 w-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="min-w-0 z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
              </span>
              <h1 className="text-xs sm:text-lg font-black tracking-tight text-white truncate">
                📊 Executive Sales Analytics
              </h1>
              <span className="hidden xs:inline-flex items-center rounded-full bg-teal-500/20 px-2 py-0.5 text-[9px] font-extrabold text-teal-300 border border-teal-500/40">
                LIVE
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-teal-300/90 font-medium mt-0.5 truncate flex items-center gap-1">
              <span>Real-time revenue & order insights for</span>
              <span className="font-bold text-white underline decoration-teal-400/50 underline-offset-2">{store.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 flex-wrap sm:flex-nowrap">
            {/* Time Range Filter Tabs */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
              {(['today', 'week', 'month', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-lg h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                    timeRange === r 
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === 'week' ? '7D' : r === 'month' ? '30D' : 'All'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Refresh Icon Button */}
              <button
                type="button"
                onClick={async () => {
                  setIsRefreshingData(true)
                  await loadData()
                  setTimeout(() => setIsRefreshingData(false), 500)
                }}
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-teal-500/40 bg-teal-950/80 text-teal-300 hover:bg-teal-900 hover:text-white hover:border-teal-400 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                title="Refresh live analytics data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingData ? 'animate-spin' : ''}`} />
              </button>

              {/* CSV Export Button */}
              <button
                type="button"
                onClick={downloadCSVReport}
                className="flex h-7 sm:h-8 items-center gap-1 px-2.5 sm:px-3.5 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white hover:from-emerald-500 hover:to-teal-500 text-[10px] sm:text-xs font-black transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                title="Download CSV Report"
              >
                <FileSpreadsheet className="h-3 w-3" />
                <span>CSV</span>
              </button>

              {/* PDF Report Button */}
              <button
                type="button"
                onClick={downloadPDFReport}
                className="flex h-7 sm:h-8 items-center gap-1 px-2.5 sm:px-3.5 rounded-xl border border-teal-400/40 bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600 text-white hover:from-teal-500 hover:to-indigo-500 text-[10px] sm:text-xs font-black transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                title="Download PDF Report"
              >
                <Download className="h-3 w-3" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: 📊 EXECUTIVE SALES PERFORMANCE (5 KPI CARDS) */}
        <section className="space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
              <span>📊 Sales & Orders Overview</span>
            </h2>
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">Range: {timeRange.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-3">
            {/* Gross Sales Volume */}
            <div
              onClick={() => navigate(`/stores/${store.id}/orders`)}
              className="rounded-md sm:rounded-2xl border border-slate-200/90 bg-white p-1 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0"
              title="Click to view all orders"
            >
              <div className="flex items-center justify-between gap-0.5">
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-slate-500 truncate">Gross Sales</span>
                <span className="flex h-3 w-3 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-xs sm:rounded-xl bg-teal-50 text-teal-600 text-[7px] sm:text-xs font-bold">
                  💰
                </span>
              </div>
              <p className="mt-0.5 text-[9px] sm:text-xl font-black text-slate-900 tracking-tight truncate leading-none">
                ₹{grossSales.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
              <div className="mt-0.5 flex items-center justify-between text-[6.5px] sm:text-[11px] pt-0.5 border-t border-slate-100">
                <span className="font-bold text-emerald-600 truncate">Valid ({validOrders.length})</span>
                <span className="text-teal-600 font-extrabold group-hover:underline hidden sm:inline">Orders ➔</span>
              </div>
            </div>

            {/* New Pending (Action Needed) */}
            <div
              onClick={() => navigate(`/stores/${store.id}/orders?status=NEW`)}
              className="rounded-md sm:rounded-2xl border border-amber-200/90 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 p-1 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0"
              title="Click to review new pending orders"
            >
              <div className="flex items-center justify-between gap-0.5">
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-amber-800 truncate">Pending</span>
                <span className="flex h-3 w-3 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-xs sm:rounded-xl bg-amber-100 text-amber-700 text-[7px] sm:text-xs font-bold animate-pulse">
                  ⏳
                </span>
              </div>
              <p className="mt-0.5 text-[9px] sm:text-2xl font-black text-amber-600 tracking-tight leading-none">
                {pendingCount}
              </p>
              <div className="mt-0.5 flex items-center justify-between text-[6.5px] sm:text-[11px] pt-0.5 border-t border-amber-200/50">
                <span className="font-extrabold text-amber-800 bg-amber-100 px-0.5 py-0.1 sm:px-1 sm:py-0.2 rounded text-[6.5px] sm:text-[10px] truncate">Action</span>
                <span className="text-amber-700 font-extrabold group-hover:underline hidden sm:inline">Review ➔</span>
              </div>
            </div>

            {/* Customer Demand (Product Requests) */}
            <div
              onClick={() => navigate(`/stores/${store.id}/requests`)}
              className="rounded-md sm:rounded-2xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/40 to-rose-100/30 p-1 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0"
              title="Click to open Product Request Queue"
            >
              <div className="flex items-center justify-between gap-0.5">
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-rose-800 truncate">Demand</span>
                <span className="flex h-3 w-3 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-xs sm:rounded-xl bg-rose-100 text-rose-600 text-[7px] sm:text-xs font-bold animate-pulse">
                  💡
                </span>
              </div>
              <p className="mt-0.5 text-[9px] sm:text-2xl font-black text-rose-700 tracking-tight leading-none">
                {filteredProductRequests.length}
              </p>
              <div className="mt-0.5 flex items-center justify-between text-[6.5px] sm:text-[11px] pt-0.5 border-t border-rose-200/50">
                <span className="font-extrabold text-rose-700 bg-rose-100 px-0.5 py-0.1 sm:px-1 sm:py-0.2 rounded text-[6.5px] sm:text-[10px] truncate">Unmet</span>
                <span className="text-rose-600 font-extrabold group-hover:underline hidden sm:inline">Queue ➔</span>
              </div>
            </div>

            {/* Completed Orders */}
            <div
              onClick={() => navigate(`/stores/${store.id}/orders?status=DELIVERED`)}
              className="rounded-md sm:rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-white via-indigo-50/40 to-indigo-100/30 p-1 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0"
              title="Click to view delivered completed orders"
            >
              <div className="flex items-center justify-between gap-0.5">
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-indigo-800 truncate">Done</span>
                <span className="flex h-3 w-3 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-xs sm:rounded-xl bg-indigo-100 text-indigo-700 text-[7px] sm:text-xs font-bold">
                  ✅
                </span>
              </div>
              <p className="mt-0.5 text-[9px] sm:text-2xl font-black text-indigo-900 tracking-tight leading-none">
                {completedCount}
              </p>
              <div className="mt-0.5 flex items-center justify-between text-[6.5px] sm:text-[11px] pt-0.5 border-t border-indigo-200/50">
                <span className="font-bold text-indigo-700 truncate">Delivered</span>
                <span className="text-indigo-600 font-extrabold group-hover:underline hidden sm:inline">Orders ➔</span>
              </div>
            </div>

            {/* Average Order Value (AOV) */}
            <div className="rounded-md sm:rounded-2xl border border-slate-200/90 bg-white p-1 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between gap-0.5">
                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-slate-500 truncate">Avg Order</span>
                <span className="flex h-3 w-3 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-xs sm:rounded-xl bg-purple-50 text-purple-600 text-[7px] sm:text-xs font-bold">
                  📊
                </span>
              </div>
              <p className="mt-0.5 text-[9px] sm:text-xl font-black text-slate-900 tracking-tight truncate leading-none">
                ₹{avgOrderValue.toLocaleString('en-IN')}
              </p>
              <div className="mt-0.5 flex items-center justify-between text-[6.5px] sm:text-[11px] pt-0.5 border-t border-slate-100">
                <span className="font-bold text-purple-700 truncate">Average</span>
                <span className="text-slate-400 font-medium hidden sm:inline">Basket</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 📱 APP TRAFFIC, VISITORS & CONVERSION */}
        <section className="rounded-xl sm:rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-2 sm:p-4 text-white shadow-md space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between border-b border-indigo-800/50 pb-1 sm:pb-1.5">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="flex h-4 w-4 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-sm sm:rounded-lg bg-teal-500/20 text-teal-300 font-black text-[9px] sm:text-sm border border-teal-500/30">
                📲
              </span>
              <div className="min-w-0">
                <h2 className="text-[10px] sm:text-sm font-black text-white truncate">App Visitors & Store Conversion</h2>
                <p className="text-[8px] sm:text-[10px] text-teal-300/90 font-medium truncate hidden sm:block">Live traffic & storefront views</p>
              </div>
            </div>
            <span className="rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1 py-0.1 sm:px-1.5 sm:py-0.2 text-[7px] sm:text-[9px] font-black uppercase tracking-wider shrink-0">
              Live ⚡
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-4 gap-1 sm:gap-3">
            {/* Total Storefront Visitors */}
            <div className="rounded-md sm:rounded-xl bg-slate-900/90 p-1 sm:p-3 border border-slate-800/90 space-y-0.5 min-w-0">
              <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-slate-400 truncate">👀 Visitors</p>
              <p className="text-[10px] sm:text-2xl font-black text-white leading-none truncate">{visits.toLocaleString()}</p>
              <p className="text-[6.5px] sm:text-[10px] text-teal-400 font-extrabold truncate">Visits</p>
            </div>

            {/* Total Product Views */}
            <div className="rounded-md sm:rounded-xl bg-slate-900/90 p-1 sm:p-3 border border-slate-800/90 space-y-0.5 min-w-0">
              <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-slate-400 truncate">🛍️ Views</p>
              <p className="text-[10px] sm:text-2xl font-black text-indigo-300 leading-none truncate">{productViews.toLocaleString()}</p>
              <p className="text-[6.5px] sm:text-[10px] text-indigo-400 font-extrabold truncate">Clicks</p>
            </div>

            {/* Total Unique Buyers */}
            <div className="rounded-md sm:rounded-xl bg-slate-900/90 p-1 sm:p-3 border border-slate-800/90 space-y-0.5 min-w-0">
              <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-slate-400 truncate">👥 Buyers</p>
              <p className="text-[10px] sm:text-2xl font-black text-emerald-400 leading-none truncate">{customerStats.totalUnique.toLocaleString()}</p>
              <p className="text-[6.5px] sm:text-[10px] text-emerald-400 font-extrabold truncate">Buyers</p>
            </div>

            {/* Store Conversion Rate */}
            <div className="rounded-md sm:rounded-xl bg-slate-900/90 p-1 sm:p-3 border border-slate-800/90 space-y-0.5 min-w-0">
              <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight text-slate-400 truncate">📈 Conversion</p>
              <p className="text-[10px] sm:text-2xl font-black text-amber-400 leading-none truncate">
                {visits > 0 ? ((validOrders.length / visits) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-[6.5px] sm:text-[10px] text-amber-400 font-extrabold truncate">Orders</p>
            </div>
          </div>
        </section>

        {/* SECTION 3: 💵 PAYMENT BREAKDOWN & INVENTORY ALERTS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {/* Payment Method Distribution */}
          <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700">💵 Payment Methods</h3>
              <span className="text-[9px] font-bold text-slate-400">COD vs Prepaid</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-800 mb-0.5">
                  <span>Cash on Delivery (COD)</span>
                  <span>{paymentBreakdown.codCount} ({paymentBreakdown.codPercent}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${paymentBreakdown.codPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-800 mb-0.5">
                  <span>Online / Prepaid</span>
                  <span>{paymentBreakdown.onlineCount} ({paymentBreakdown.onlinePercent}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${paymentBreakdown.onlinePercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Stock Inventory Alert Card */}
          <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <span>📦 Inventory Status</span>
              </h3>
              <span className="text-[9px] font-bold text-slate-400">Stock monitor</span>
            </div>

            {(outOfStockItems.length > 0 || lowStockItems.length > 0) ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {outOfStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-rose-50 p-1.5 border border-rose-200 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-rose-900 truncate text-[10px] sm:text-xs">{item.name}</p>
                      <span className="text-[8px] bg-rose-200 text-rose-800 font-black px-1 rounded">OUT OF STOCK</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(item.id, Number(item.stock_quantity ?? 0), 50)}
                      className="rounded bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-2xs hover:bg-emerald-700 shrink-0 cursor-pointer"
                    >
                      +50 Stock
                    </button>
                  </div>
                ))}

                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-amber-50 p-1.5 border border-amber-200 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-amber-900 truncate text-[10px] sm:text-xs">{item.name}</p>
                      <span className="text-[8px] bg-amber-200 text-amber-800 font-black px-1 rounded">{item.stock_quantity} left</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(item.id, Number(item.stock_quantity ?? 0), 50)}
                      className="rounded bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-2xs hover:bg-emerald-700 shrink-0 cursor-pointer"
                    >
                      +50 Stock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                ✅ All products are well-stocked!
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: 👥 BUYER RETENTION & TOP CUSTOMERS LEADERBOARD */}
        <section className="rounded-xl sm:rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 p-2 sm:p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-1.5 border-b border-indigo-100/80 pb-1 sm:pb-2">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="flex h-4 w-4 sm:h-6 sm:w-6 items-center justify-center rounded-sm sm:rounded-lg bg-indigo-100 text-indigo-700 text-[9px] sm:text-xs font-black shrink-0">
                👥
              </span>
              <div className="min-w-0">
                <h2 className="text-[10px] sm:text-sm font-black text-slate-900 truncate">
                  Customer Loyalty & Leaderboard
                </h2>
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-medium truncate hidden sm:block">
                  Repeat purchase rates & top buyer spend
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowCrmModal(true)}
                className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md sm:rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-1.5 sm:px-3 py-0.5 sm:py-1 text-[8.5px] sm:text-xs font-black text-white shadow-xs hover:brightness-110 active:scale-95 cursor-pointer"
              >
                <MessageSquare className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>CRM</span>
              </button>
            </div>
          </div>

          {/* 4 Rich KPI Cards: Total, New, Repeat, Repeat Rate */}
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-1 sm:gap-3">
            {/* Total Unique Customers */}
            <div className="rounded-md sm:rounded-xl bg-white p-1 sm:p-2.5 border border-slate-200/90 shadow-2xs space-y-0.5 min-w-0">
              <span className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 truncate block">Total Buyers</span>
              <p className="text-[10px] sm:text-xl font-black text-slate-900 leading-none truncate">
                {customerStats.totalUnique.toLocaleString()}
              </p>
              <p className="text-[6.5px] sm:text-[10px] font-bold text-blue-600 truncate">Contacts</p>
            </div>

            {/* New First-Time Customers */}
            <div className="rounded-md sm:rounded-xl bg-white p-1 sm:p-2.5 border border-slate-200/90 shadow-2xs space-y-0.5 min-w-0">
              <span className="text-[7px] sm:text-[10px] font-black uppercase text-slate-400 truncate block">New Buyers</span>
              <p className="text-[10px] sm:text-xl font-black text-emerald-600 leading-none truncate">
                {customerStats.newCustomers.toLocaleString()}
              </p>
              <p className="text-[6.5px] sm:text-[10px] font-bold text-emerald-700 truncate">1st-time</p>
            </div>

            {/* Repeat Customers (>1 Order) */}
            <div className="rounded-md sm:rounded-xl bg-white p-1 sm:p-2.5 border border-indigo-200 shadow-2xs space-y-0.5 min-w-0">
              <span className="text-[7px] sm:text-[10px] font-black uppercase text-indigo-700 truncate block">Repeat</span>
              <p className="text-[10px] sm:text-xl font-black text-indigo-600 leading-none truncate">
                {customerStats.repeatCustomers.toLocaleString()}
              </p>
              <p className="text-[6.5px] sm:text-[10px] font-bold text-indigo-700 truncate">&gt; 1 order</p>
            </div>

            {/* Repeat Customer Retention Rate */}
            <div className="rounded-md sm:rounded-xl bg-white p-1 sm:p-2.5 border border-amber-200 shadow-2xs space-y-0.5 min-w-0">
              <span className="text-[7px] sm:text-[10px] font-black uppercase text-amber-800 truncate block">Repeat Rate</span>
              <p className="text-[10px] sm:text-xl font-black text-amber-600 leading-none truncate">
                {customerStats.repeatRate}%
              </p>
              <p className="text-[6.5px] sm:text-[10px] font-bold text-amber-700 truncate">Retention</p>
            </div>
          </div>

          {/* TOP LOYAL CUSTOMERS LEADERBOARD TABLE */}
          <div className="space-y-1.5 pt-1">
            <h3 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <span>🏆 Top Buyers ({customerStats.topCustomersList.length})</span>
            </h3>

            {customerStats.topCustomersList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-slate-400 text-xs font-medium">
                No customer orders recorded for this range yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg sm:rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden max-h-56 overflow-y-auto">
                {customerStats.topCustomersList.slice(0, 8).map((c: any, index: number) => {
                  const initial = (c.name || 'C').charAt(0).toUpperCase()
                  const isRepeat = (c.ordersCount || 0) > 1

                  return (
                    <div
                      key={c.phone || c.name || index}
                      className="flex items-center justify-between p-1 sm:p-2 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-sm sm:rounded-md font-black text-[9px] sm:text-[10px] ${
                          index === 0
                            ? 'bg-amber-100 text-amber-800'
                            : index === 1
                            ? 'bg-slate-200 text-slate-700'
                            : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {index < 3 ? ['🥇', '🥈', '🥉'][index] : initial}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-[10px] sm:text-[11px] font-black text-slate-900 truncate leading-tight">
                              {c.name || 'Customer'}
                            </p>
                            {isRepeat && (
                              <span className="rounded bg-indigo-50 text-indigo-700 px-0.5 text-[7px] font-black">
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] sm:text-[9px] font-mono text-slate-400 truncate leading-tight">
                            {c.phone || 'Phone N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <div>
                          <p className="text-[10px] sm:text-[11px] font-black text-slate-900 leading-tight">
                            ₹{Number(c.totalSpent || 0).toFixed(0)}
                          </p>
                          <p className="text-[7.5px] sm:text-[8px] font-semibold text-slate-400 leading-tight">
                            {c.ordersCount} orders
                          </p>
                        </div>

                        {c.phone && (
                          <a
                            href={`https://wa.me/${formatPhoneForWhatsApp(c.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-sm sm:rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all text-[10px] sm:text-xs"
                            title="Chat on WhatsApp"
                          >
                            💬
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 5: 🏷️ PROMOTIONS & SEARCH TRENDS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {/* Coupon Performance */}
          <div className="rounded-xl sm:rounded-2xl border border-indigo-200/90 bg-white p-3 sm:p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
              <h3 className="text-[11px] sm:text-xs font-black text-slate-900 flex items-center gap-1">
                <span>🏷️ Coupon Performance</span>
              </h3>
              <Link to={`/stores/${store.id}/coupons`} className="text-[10px] font-bold text-indigo-600 hover:underline">
                Manage ➔
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-center">
                <p className="text-[8px] font-black uppercase text-slate-400">Active</p>
                <p className="text-xs sm:text-sm font-black text-slate-900">{coupons.filter(c => c.is_active).length}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-center">
                <p className="text-[8px] font-black uppercase text-slate-400">Applied</p>
                <p className="text-xs sm:text-sm font-black text-indigo-600">{totalCouponRedemptions}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-center">
                <p className="text-[8px] font-black uppercase text-slate-400">Savings</p>
                <p className="text-xs sm:text-sm font-black text-emerald-600">₹{totalCouponDiscountGiven.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Top Searches */}
          <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700">🔍 Top Buyer Searches</h3>
              <span className="text-[9px] font-bold text-slate-400">{searches.length} terms</span>
            </div>

            <div className="space-y-1 max-h-28 overflow-y-auto">
              {searches.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-2">No searches yet.</p>
              ) : (
                searches.map((s: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 p-1.5 text-xs">
                    <span className="font-bold text-slate-800 text-[11px]">"{s.query_term}"</span>
                    <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[9px] font-extrabold text-teal-700">
                      {s.search_count} searches
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* SECTION 6: 💡 CUSTOMER PRODUCT REQUESTS (UNMET DEMAND QUEUE) */}
        <section className="rounded-xl sm:rounded-2xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/30 to-slate-50 p-3 sm:p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-700 text-xs font-black shrink-0">
                💡
              </span>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate">Customer Product Requests (Unmet Demand)</h2>
                <p className="text-[9px] sm:text-[10px] text-rose-700/90 font-medium truncate">Customers who requested products not found in store</p>
              </div>
            </div>
            <Link
              to={`/stores/${store.id}/requests`}
              className="text-[10px] sm:text-xs font-black text-rose-700 hover:underline shrink-0"
            >
              Manage Queue ➔
            </Link>
          </div>

          <div className="space-y-1.5">
            {productRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 p-3 text-center text-xs text-rose-700/80 font-medium">
                No active product requests right now. When customers request products on your store, they will appear here.
              </div>
            ) : (
              productRequests.slice(0, 5).map((request: any) => (
                <div
                  key={request.id}
                  className="rounded-lg sm:rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-xs text-slate-900">
                        {request.productName}
                      </span>
                      <span className="rounded bg-rose-50 border border-rose-200 text-rose-700 px-1 text-[8px] font-black uppercase">
                        Demand
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      By <strong>{request.customerName || 'Customer'}</strong> {request.customerPhone && `(📞 ${request.customerPhone})`}
                    </p>
                    {request.message && (
                      <p className="text-[10px] text-slate-600 italic bg-slate-50 px-1.5 py-0.5 rounded mt-1">
                        "{request.message}"
                      </p>
                    )}
                  </div>

                  {request.customerPhone && (
                    <a
                      href={`https://wa.me/${formatPhoneForWhatsApp(request.customerPhone)}?text=${encodeURIComponent(
                        `Hi ${request.customerName || 'Customer'}! Thanks for requesting "${request.productName}" at ${store.name}. We are arranging it for you soon!`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-emerald-600 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                      <span>💬 Reply WhatsApp</span>
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION 7: 🔥 TOP VIEWED PRODUCTS */}
        <section className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700">🔥 Top Viewed Products</h2>
            <span className="text-[9px] font-bold text-slate-400">{topProducts.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {topProducts.length === 0 ? (
              <p className="col-span-2 text-center text-xs text-slate-400 py-2">No product views recorded yet.</p>
            ) : (
              topProducts.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-1.5">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white shadow-2xs shrink-0">
                    {p.image ? <img src={mediaUrl(p.image)} alt="" className="h-full w-full object-cover" /> : <span className="text-xs">🛍️</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black text-slate-800">{p.name}</p>
                    <p className="text-[10px] font-bold text-teal-600">₹{p.price}</p>
                  </div>
                  <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-extrabold text-indigo-700 shrink-0">
                    👁️ {p.views_count}
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

      {/* 📲 WhatsApp Marketing Broadcast & Customer Re-engagement CRM Modal */}
      {showCrmModal && store && (
        <WhatsAppMarketingCrmModal
          store={store}
          customers={customerStats.topCustomersList}
          coupons={coupons}
          onClose={() => setShowCrmModal(false)}
        />
      )}

      {/* 🪙 Store Delivery & Cashback Loyalty Configuration Modal */}
      {showDeliveryModal && store && (
        <SellerDeliveryConfigModal
          store={store}
          onSaveSuccess={() => {
            loadData()
          }}
          onClose={() => setShowDeliveryModal(false)}
        />
      )}

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="analytics" />
    </main>
  )
}
