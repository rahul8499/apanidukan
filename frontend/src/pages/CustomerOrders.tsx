import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StoreCartProvider } from '../context/StoreCartContext'
import api from '../services/api'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import {
  PackageCheck, ArrowLeft, Search, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, RefreshCw, MessageSquare, ShoppingBag, Truck, Check, XCircle
} from 'lucide-react'

export default function CustomerOrders() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return (
    <StoreCartProvider storeSlug={storeSlug}>
      <CustomerOrdersContent storeSlug={storeSlug} />
    </StoreCartProvider>
  )
}

function CustomerOrdersContent({ storeSlug }: { storeSlug: string }) {
  const [store, setStore] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL')

  useEffect(() => {
    // Load store details
    api.get(`/public/stores/${storeSlug}/`)
      .then(res => setStore(res.data.data || res.data))
      .catch(() => {})

    // Load order history saved on this device
    try {
      const saved = JSON.parse(localStorage.getItem(`qs_customer_orders_${storeSlug}`) || '[]')
      setOrders(Array.isArray(saved) ? saved : [])
    } catch {
      setOrders([])
    }
  }, [storeSlug])

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery.trim() || 
      order.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some((i: any) => i.name?.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (activeFilter === 'ACTIVE') return order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
    if (activeFilter === 'DELIVERED') return order.status === 'DELIVERED'
    if (activeFilter === 'CANCELLED') return order.status === 'CANCELLED'
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Delivered
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-black text-rose-700">
            <XCircle className="h-3 w-3 text-rose-600" /> Cancelled
          </span>
        )
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-black text-indigo-700 animate-pulse">
            <Truck className="h-3 w-3 text-indigo-600" /> Preparing
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
            <Clock className="h-3 w-3 text-amber-600" /> Order Placed
          </span>
        )
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full bg-slate-50 pb-36 text-xs sm:text-sm font-sans">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              to={`/store/${storeSlug}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
                {store?.name || 'Store'}
              </p>
              <h1 className="font-extrabold text-xs sm:text-sm text-white">
                My Orders ({orders.length})
              </h1>
            </div>
          </div>
          <NotificationBellHeader />
        </div>

        {/* SEARCH & FILTER TABS (FLIPKART STYLE) */}
        <div className="bg-slate-900 border-t border-slate-800/80 px-3 py-2">
          <div className="mx-auto max-w-7xl space-y-2">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders by Order ID or Item name..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-1.5 pl-9 pr-3 text-[11px] font-medium text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {[
                { key: 'ALL', label: 'All Orders' },
                { key: 'ACTIVE', label: 'In Progress' },
                { key: 'DELIVERED', label: 'Delivered' },
                { key: 'CANCELLED', label: 'Cancelled' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key as any)}
                  className={`rounded-lg px-3 py-1 text-[10px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === f.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl p-3 sm:p-5 lg:p-6 space-y-4">
        
        {/* EMPTY STATE */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-xs space-y-4 my-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-4xl shadow-inner">
              📦
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {orders.length === 0 ? 'No Orders Placed Yet' : 'No Matching Orders'}
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {orders.length === 0
                  ? 'Your orders placed on this device will appear here with live tracking & GST invoices.'
                  : 'Try searching with a different order ID or filter tab.'}
              </p>
            </div>
            <Link
              to={`/store/${storeSlug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:scale-105 transition-all"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Browse Store</span>
            </Link>
          </div>
        ) : (
          /* FLIPKART STYLE RESPONSIVE ORDER CARDS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredOrders.map((order) => (
              <div
                key={order.reference}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md transition-all duration-200"
              >
                {/* Card Top Strip */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                      #{order.reference}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      • {order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent Order'}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Card Main Body */}
                <div className="p-3.5 sm:p-4 space-y-3">
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500 font-medium">Total Amount</p>
                      <p className="text-base sm:text-lg font-black text-slate-950">
                        ₹{Number(order.total).toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Order Date</p>
                      <p className="text-xs font-bold text-slate-700">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Today'}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer Bar */}
                  <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-2">
                    
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('qs-open-chat'))}
                      className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="hidden sm:inline">Need Help?</span>
                    </button>

                    <Link
                      to={`/store/${storeSlug}/order/${order.reference}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:opacity-95 active:scale-98 transition-all"
                    >
                      <span>Track Order Live</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      <CustomerBottomNav storeSlug={storeSlug!} active="orders" />
      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
