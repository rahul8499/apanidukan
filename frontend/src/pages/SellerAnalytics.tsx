import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function SellerAnalytics() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      try {
        const stores = await api.get('/stores/')
        const found = stores.data.find((x: any) => String(x.id) === storeId)
        if (!found) return navigate('/dashboard')
        setStore(found)

        const res = await api.get(`/stores/${found.id}/analytics/`)
        setAnalytics(res.data)
      } catch {
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [storeId, navigate])

  const mediaUrl = (url?: string) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`
  }

  if (loading || !store) return <div className="p-6 text-slate-500 font-medium">Loading store analytics...</div>

  const visits = analytics?.total_visits || 0
  const productViews = analytics?.total_product_views || 0
  const totalOrders = analytics?.total_orders || 0
  const totalRevenue = analytics?.total_revenue || 0
  const uniqueCustomers = analytics?.total_unique_customers || 0
  const repeatCustomers = analytics?.repeat_customers_count || 0
  const repeatRate = analytics?.repeat_customer_rate || 0
  const topProducts = analytics?.top_products || []
  const searches = analytics?.searches || []

  const productRequests = analytics?.product_requests || []
  const totalProductRequests = analytics?.total_product_requests || 0

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-28 lg:max-w-none lg:w-full">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-950 px-5 py-6 text-white shadow-md">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Seller Workspace</p>
          <h1 className="mt-1 text-xl font-bold">{store.name} — Store Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBellHeader />
          <Link to={`/store/${store.slug}`} target="_blank" className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
            View Storefront ↗
          </Link>
        </div>
      </header>

      <main className="space-y-5 p-4">
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-2 gap-3">
          {/* Store Visits */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm font-bold">👁️</span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Store Visits</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{visits.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Total store page views</p>
          </div>

          {/* Product Views */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-sm font-bold">🛍️</span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Product Views</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{productViews.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-slate-400">Product clicks & opens</p>
          </div>

          {/* Total Orders & Sales */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-sm font-bold">📦</span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Orders</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{totalOrders}</p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-600">₹{totalRevenue.toFixed(2)} sales</p>
          </div>

          {/* Product Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold">📩</span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Item Requests</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{totalProductRequests}</p>
            <Link to={`/stores/${store.id}/requests`} className="mt-1 block text-[11px] font-semibold text-indigo-600 hover:underline">
              View all requests →
            </Link>
          </div>
        </section>

        {/* Customer Retention Breakdown Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">👥 Customer Base & Loyalty</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-400">Total Unique Buyers</p>
              <p className="text-xl font-bold text-slate-800">{uniqueCustomers}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Repeat Customers (&gt;1 Order)</p>
              <p className="text-xl font-bold text-indigo-700">{repeatCustomers}</p>
            </div>
          </div>
          {uniqueCustomers > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Repeat Purchase Rate</span>
                <span>{repeatRate}%</span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${Math.min(repeatRate, 100)}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* Product Requests Analytics */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">📩 Customer Product Requests</h2>
            <Link to={`/stores/${store.id}/requests`} className="text-xs font-bold text-indigo-600 hover:underline">
              Manage All →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {productRequests.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-3">No product requests submitted by customers yet.</p>
            ) : (
              productRequests.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">"{r.productName}"</span>
                    <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-slate-600 font-medium">
                    Requested by: <span className="font-semibold text-slate-800">{r.customerName || 'Customer'}</span>
                    {r.customerPhone && <span className="ml-1 text-indigo-600 font-bold">({r.customerPhone})</span>}
                  </p>
                  {r.message && <p className="mt-1 italic text-slate-500 bg-white p-2 rounded-lg border border-slate-100">"{r.message}"</p>}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Viewed Products */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">🔥 Top Viewed Products</h2>
            <span className="text-xs font-semibold text-slate-400">{topProducts.length} items</span>
          </div>

          <div className="mt-4 space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-3">No product view analytics recorded yet.</p>
            ) : (
              topProducts.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-white shadow-xs">
                    {p.image ? <img src={mediaUrl(p.image)} alt="" className="h-full w-full object-cover" /> : <span className="text-xl">🛍️</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs font-semibold text-indigo-600">₹{p.price}</p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                    👁️ {p.views_count} views
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Search Queries */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">🔍 Top Customer Search Queries</h2>
            <span className="text-xs font-semibold text-slate-400">{searches.length} queries</span>
          </div>

          <div className="mt-4 space-y-2">
            {searches.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-3">No search query analytics recorded yet.</p>
            ) : (
              searches.map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">"{s.query_term}"</h3>
                    <p className="text-[11px] text-slate-400">
                      Last: {new Date(s.last_searched_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-700">
                    {s.search_count} searches
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Seller Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-1 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] lg:left-0 lg:right-0 lg:max-w-none lg:-translate-x-0 lg:mx-auto lg:w-full">
        <Link to={`/stores/${store.id}/manage`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Setup</Link>
        <Link to={`/stores/${store.id}/orders`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Orders</Link>
        <Link to={`/stores/${store.id}/payments`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Payments</Link>
        <Link to={`/stores/${store.id}/chat`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Chat</Link>
        <Link to={`/stores/${store.id}/requests`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Requests</Link>
        <span className="flex-1 rounded-xl bg-amber-50 px-2 py-2 text-center text-xs font-bold text-amber-700">Analytics</span>
      </nav>
    </div>
  )
}

