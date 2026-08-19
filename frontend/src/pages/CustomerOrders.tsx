import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StoreCartProvider } from '../context/StoreCartContext'
import api from '../services/api'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import {
  ArrowLeft, Search, Clock, CheckCircle2,
  ChevronRight, MessageSquare, ShoppingBag, Truck, XCircle, Package
} from 'lucide-react'
import { getStoreTheme } from '../utils/storeTheme'

const mediaUrl = (url: string) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`
}

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

  const storeTheme = getStoreTheme(store)

  const getStatusDisplay = (status: string, createdAt: string) => {
    const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'
    switch (status) {
      case 'DELIVERED':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
          title: `Delivered on ${formattedDate}`,
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }
      case 'CANCELLED':
        return {
          icon: <XCircle className="h-4 w-4 text-rose-500 shrink-0" />,
          title: 'Cancelled',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }
      case 'CONFIRMED':
        return {
          icon: <Truck className="h-4 w-4 text-indigo-400 shrink-0 animate-bounce" />,
          title: 'Preparing & Packing',
          badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        }
      default:
        return {
          icon: <Clock className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />,
          title: 'Order Placed & Processing',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }
    }
  }

  return (
    <div className={`mx-auto min-h-screen w-full ${storeTheme.page_bg_class} pb-32 text-xs sm:text-sm font-sans transition-colors duration-300`}>
      
      {/* RETAIL HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl text-white border-b border-slate-800 shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              to={`/store/${storeSlug}`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[9.5px] font-extrabold uppercase text-indigo-400 tracking-wider">
                {store?.name || 'Store'}
              </p>
              <h1 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                <span>My Orders</span>
                <span className="text-[10px] bg-indigo-950 border border-indigo-500/40 text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                  {orders.length}
                </span>
              </h1>
            </div>
          </div>
          <NotificationBellHeader />
        </div>

        {/* FLIPKART STYLE SEARCH & FILTER STRIP */}
        <div className="bg-slate-900/90 border-t border-slate-800/80 px-3 py-2">
          <div className="mx-auto max-w-5xl space-y-2">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders by Order ID or item..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-1.5 pl-9 pr-3 text-[11px] font-medium text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
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
                  style={activeFilter === f.key ? { backgroundColor: storeTheme.primary_color } : undefined}
                  className={`rounded-lg px-3 py-1 text-[10.5px] font-black transition-all cursor-pointer whitespace-nowrap border ${
                    activeFilter === f.key
                      ? 'text-white border-transparent shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="mx-auto max-w-5xl p-3 sm:p-5 space-y-3.5">
        
        {/* EMPTY STATE */}
        {filteredOrders.length === 0 ? (
          <div className={`rounded-3xl border ${storeTheme.card_bg_class} p-8 text-center shadow-sm space-y-4 my-6`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/10 text-4xl shadow-inner border border-indigo-500/20">
              🛍️
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className={`text-base sm:text-lg font-black ${storeTheme.text_primary_class}`}>
                {orders.length === 0 ? 'No Orders Yet' : 'No Matching Orders'}
              </h2>
              <p className={`text-xs ${storeTheme.text_secondary_class} font-medium leading-relaxed`}>
                {orders.length === 0
                  ? 'Your placed orders will appear here with live WhatsApp tracking & digital invoices.'
                  : 'Try searching with a different order ID or filter tab.'}
              </p>
            </div>
            <Link
              to={`/store/${storeSlug}`}
              className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${storeTheme.btn_gradient} px-6 py-2.5 text-xs font-black text-white shadow-md hover:scale-105 transition-all`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Explore Store</span>
            </Link>
          </div>
        ) : (
          /* FLIPKART/AMAZON STYLE RETAIL ORDER CARDS */
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusDisplay(order.status, order.created_at)
              const itemsList = Array.isArray(order.items) ? order.items : []
              const firstItem = itemsList[0]

              return (
                <div
                  key={order.reference}
                  className={`group relative overflow-hidden rounded-2xl border ${storeTheme.card_bg_class} hover:border-indigo-500/40 transition-all duration-200 shadow-sm hover:shadow-md`}
                >
                  {/* Card Header: Status Bar & Reference */}
                  <div className={`flex items-center justify-between border-b px-3.5 py-2.5 ${
                    storeTheme.is_dark_mode ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
                  }`}>
                    <div className="flex items-center gap-2">
                      {statusInfo.icon}
                      <span className={`text-xs font-black ${storeTheme.text_primary_class}`}>
                        {statusInfo.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                        #{order.reference}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Items Preview & Pricing */}
                  <div className="p-3.5 sm:p-4 space-y-3">
                    
                    <div className="flex items-start gap-3">
                      {/* Product Thumbnail / Icon */}
                      <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden p-1">
                        {firstItem?.image ? (
                          <img
                            src={mediaUrl(firstItem.image)}
                            alt={firstItem.name || 'Product'}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Package className="h-7 w-7 text-indigo-400" />
                        )}
                      </div>

                      {/* Items Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className={`text-xs sm:text-sm font-extrabold ${storeTheme.text_primary_class} truncate`}>
                          {firstItem?.name || `Order #${order.reference}`}
                        </h3>

                        {itemsList.length > 1 && (
                          <p className={`text-[11px] ${storeTheme.text_secondary_class} font-semibold`}>
                            +{itemsList.length - 1} more {itemsList.length - 1 === 1 ? 'item' : 'items'}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          <span className={`text-sm sm:text-base font-black ${storeTheme.text_primary_class}`}>
                            ₹{Number(order.total).toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            • {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>

                      {/* Fulfillment Pill */}
                      <div className="shrink-0 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black border ${
                          order.order_type === 'STORE_PICKUP'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        }`}>
                          {order.order_type === 'STORE_PICKUP' ? '🏪 Pickup' : '🚚 Delivery'}
                        </span>
                      </div>
                    </div>

                    {/* Store Pickup / Delivery Note */}
                    {order.order_type === 'STORE_PICKUP' ? (
                      <p className="text-[10.5px] text-amber-400/90 font-medium bg-amber-500/5 border border-amber-500/20 p-2 rounded-xl">
                        📍 Collect at shop: <span className="font-bold text-amber-300">{store?.address || store?.name || 'Store Location'}</span>
                      </p>
                    ) : (
                      <p className="text-[10.5px] text-indigo-300/90 font-medium bg-indigo-500/5 border border-indigo-500/20 p-2 rounded-xl flex items-center justify-between">
                        <span>⏱️ Est. Delivery in {store?.delivery_estimated_time || '30-45 mins'}</span>
                        <span className="text-[9.5px] font-bold text-emerald-400">
                          {Number(order.delivery_fee) > 0 ? `Fee: ₹${Number(order.delivery_fee).toFixed(0)}` : 'FREE Delivery'}
                        </span>
                      </p>
                    )}

                    {/* Actions Row */}
                    <div className={`border-t pt-2.5 flex items-center justify-between gap-2 ${
                      storeTheme.is_dark_mode ? 'border-slate-800/80' : 'border-slate-100'
                    }`}>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('qs-open-chat'))}
                        className={`text-[11px] font-extrabold ${storeTheme.text_secondary_class} hover:${storeTheme.text_primary_class} flex items-center gap-1 cursor-pointer`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Need Help?</span>
                      </button>

                      <Link
                        to={`/store/${storeSlug}/order/${order.reference}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${storeTheme.btn_gradient} px-4 py-1.5 text-xs font-black text-white shadow-sm hover:opacity-95 active:scale-95 transition-all`}
                      >
                        <span>Track Order Live</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                  </div>

                </div>
              )
            })}
          </div>
        )}

      </main>

      <CustomerBottomNav storeSlug={storeSlug!} active="orders" />
      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
