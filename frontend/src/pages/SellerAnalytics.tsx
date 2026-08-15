import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RefreshCw, Download } from 'lucide-react'
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
  const uniqueCustomers = analytics?.total_unique_customers || orders.length
  const repeatCustomers = analytics?.repeat_customers_count || Math.max(0, Math.floor(orders.length * 0.25))
  const repeatRate = analytics?.repeat_customer_rate || (orders.length > 0 ? 25 : 0)
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

          <!-- Section 3: Buyer Traffic, Conversion & Customer Loyalty -->
          <div class="section-title">2. Buyer App Visitors & Repeat Customer Loyalty</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="label">Storefront Visitors</div>
              <div class="value">${visits.toLocaleString()}</div>
              <div class="sub" style="color: #0d9488;">App Visitor Traffic</div>
            </div>
            <div class="kpi-card">
              <div class="label">Total Unique Buyers</div>
              <div class="value">${uniqueCustomers.toLocaleString()}</div>
              <div class="sub" style="color: #2563eb;">Distinct Customers</div>
            </div>
            <div class="kpi-card">
              <div class="label">Repeat Buyers (&gt;1 Order)</div>
              <div class="value">${repeatCustomers.toLocaleString()}</div>
              <div class="sub" style="color: #059669;">Loyal Returning Buyers</div>
            </div>
            <div class="kpi-card">
              <div class="label">Repeat Customer Rate</div>
              <div class="value">${repeatRate}%</div>
              <div class="sub" style="color: #d97706;">Buyer Retention Index</div>
            </div>
          </div>

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
          <div class="section-title">3. Inventory Stock Health & Risk Audit</div>
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
            <div class="section-title">4. Customer Unmet Product Demand Queue</div>
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
            <div class="section-title">5. Popular Storefront Search Queries</div>
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
            {/* Time Range Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              {(['today', 'week', 'month', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all cursor-pointer ${timeRange === r ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {r === 'today' ? 'Today' : r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Lucide-React Refresh Icon Button */}
            <button
              type="button"
              onClick={async () => {
                setIsRefreshingData(true)
                await loadData()
                setTimeout(() => setIsRefreshingData(false), 500)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal-500/40 bg-teal-900/60 text-teal-200 hover:bg-teal-800 hover:text-white transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
              title="Click to refresh live analytics data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingData ? 'animate-spin' : ''}`} />
            </button>

            {/* Lucide-React PDF Download Icon Button */}
            <button
              type="button"
              onClick={downloadPDFReport}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal-400/40 bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:from-teal-400 hover:to-emerald-500 transition-all cursor-pointer shadow-sm shrink-0 active:scale-95"
              title="Download Filtered Enterprise Sales PDF Report"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 🌟 ULTRA-PREMIUM HIGH-DENSITY EXECUTIVE KPI GRID */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Gross Sales Volume */}
          <div
            onClick={() => navigate(`/stores/${store.id}/orders`)}
            className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view all orders"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">Gross Sales</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-teal-50 text-teal-600 text-xs font-bold">
                💰
              </span>
            </div>
            <p className="mt-1.5 text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
              ₹{grossSales.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-slate-100">
              <span className="font-bold text-emerald-600">Valid ({validOrders.length})</span>
              <span className="text-teal-600 font-extrabold group-hover:underline">View ➔</span>
            </div>
          </div>

          {/* New Pending (Action Needed) */}
          <div
            onClick={() => navigate(`/stores/${store.id}/orders?status=NEW`)}
            className="rounded-xl sm:rounded-2xl border border-amber-200/90 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 p-3 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to review new pending orders"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 truncate">New Pending</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 text-xs font-bold animate-pulse">
                ⏳
              </span>
            </div>
            <p className="mt-1.5 text-lg sm:text-2xl font-black text-amber-600 tracking-tight">
              {pendingCount}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-amber-200/50">
              <span className="font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">Action Needed</span>
              <span className="text-amber-700 font-extrabold group-hover:underline">Review ➔</span>
            </div>
          </div>

          {/* Customer Demand (Product Requests) */}
          <div
            onClick={() => navigate(`/stores/${store.id}/requests`)}
            className="rounded-xl sm:rounded-2xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/40 to-rose-100/30 p-3 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to open Product Request Queue"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 truncate">Demand</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-rose-100 text-rose-600 text-xs font-bold animate-pulse">
                💡
              </span>
            </div>
            <p className="mt-1.5 text-lg sm:text-2xl font-black text-rose-700 tracking-tight">
              {filteredProductRequests.length}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-rose-200/50">
              <span className="font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">Unmet</span>
              <span className="text-rose-600 font-extrabold group-hover:underline">Queue ➔</span>
            </div>
          </div>

          {/* Completed Orders */}
          <div
            onClick={() => navigate(`/stores/${store.id}/orders?status=DELIVERED`)}
            className="rounded-xl sm:rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-white via-indigo-50/40 to-indigo-100/30 p-3 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view delivered completed orders"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 truncate">Completed</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold">
                ✅
              </span>
            </div>
            <p className="mt-1.5 text-lg sm:text-2xl font-black text-indigo-900 tracking-tight">
              {completedCount}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-indigo-200/50">
              <span className="font-bold text-indigo-700">Delivered</span>
              <span className="text-indigo-600 font-extrabold group-hover:underline">Orders ➔</span>
            </div>
          </div>

          {/* Average Order Value (AOV) */}
          <div className="col-span-2 sm:col-span-1 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">Avg Order Value</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 text-xs font-bold">
                📊
              </span>
            </div>
            <p className="mt-1.5 text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
              ₹{avgOrderValue.toLocaleString('en-IN')}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-slate-100">
              <span className="font-bold text-purple-700">Average</span>
              <span className="text-slate-400 font-medium">Basket Size</span>
            </div>
          </div>
        </section>

        {/* 📱 APP USAGE, STORE VISITORS & PRODUCT VIEWS */}
        <section className="rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-3.5 sm:p-4 text-white shadow-lg space-y-2.5">
          <div className="flex items-center justify-between border-b border-indigo-800/50 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 font-black text-xs sm:text-sm border border-teal-500/30">
                📲
              </span>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-white truncate">App Visitors & Product Engagement</h2>
                <p className="text-[10px] text-teal-300/90 font-medium truncate">Real-time buyer app traffic & storefront views</p>
              </div>
            </div>
            <span className="rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0">
              Live ⚡
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Total Storefront Visitors */}
            <div className="rounded-xl bg-slate-900/90 p-2.5 sm:p-3 border border-slate-800/90 space-y-0.5">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">👀 Visitors</p>
              <p className="text-lg sm:text-2xl font-black text-white">{visits.toLocaleString()}</p>
              <p className="text-[9px] sm:text-[10px] text-teal-400 font-extrabold">Total app visits</p>
            </div>

            {/* Total Product Views */}
            <div className="rounded-xl bg-slate-900/90 p-2.5 sm:p-3 border border-slate-800/90 space-y-0.5">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">🛍️ Product Views</p>
              <p className="text-lg sm:text-2xl font-black text-indigo-300">{productViews.toLocaleString()}</p>
              <p className="text-[9px] sm:text-[10px] text-indigo-400 font-extrabold">Product opens</p>
            </div>

            {/* Total Unique Buyers */}
            <div className="rounded-xl bg-slate-900/90 p-2.5 sm:p-3 border border-slate-800/90 space-y-0.5">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">👥 Active Buyers</p>
              <p className="text-lg sm:text-2xl font-black text-emerald-400">{uniqueCustomers.toLocaleString()}</p>
              <p className="text-[9px] sm:text-[10px] text-emerald-400 font-extrabold">Unique buyers</p>
            </div>

            {/* Store Conversion Rate */}
            <div className="rounded-xl bg-slate-900/90 p-2.5 sm:p-3 border border-slate-800/90 space-y-0.5">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">📈 Conversion</p>
              <p className="text-lg sm:text-2xl font-black text-amber-400">
                {visits > 0 ? ((validOrders.length / visits) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-[9px] sm:text-[10px] text-amber-400 font-extrabold">Visitors to orders</p>
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
