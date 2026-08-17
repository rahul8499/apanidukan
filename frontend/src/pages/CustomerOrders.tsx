import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StoreCartProvider } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'

export default function CustomerOrders() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return <StoreCartProvider storeSlug={storeSlug}><CustomerOrdersContent storeSlug={storeSlug} /></StoreCartProvider>
}

function CustomerOrdersContent({ storeSlug }: { storeSlug: string }) {
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    try { setOrders(JSON.parse(localStorage.getItem(`qs_customer_orders_${storeSlug}`) || '[]')) }
    catch { setOrders([]) }
  }, [storeSlug])

  return <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32 lg:max-w-none lg:w-full">
    <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white"><div><Link to={`/store/${storeSlug}`} className="text-xs font-semibold text-indigo-300">← Back to store</Link><h1 className="mt-1 text-xl font-bold">My Orders</h1></div></header>
    <main className="space-y-3 p-4">
      {orders.length === 0 ? <div className="premium-card p-8 text-center"><div className="text-4xl">📦</div><h2 className="mt-4 font-bold text-slate-800">No orders on this device</h2><p className="mt-2 text-sm text-slate-500">Your placed orders will appear here. You can also open the order link received after checkout.</p></div> : orders.map(order => <Link key={order.reference} to={`/store/${storeSlug}/order/${order.reference}`} className="premium-card block p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Order #{order.reference}</p><p className="mt-1 text-lg font-extrabold text-slate-900">₹{order.total}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">Track status →</span></div></Link>)}
    </main>
    <CustomerBottomNav storeSlug={storeSlug} active="orders" /><CustomerChatWidget storeSlug={storeSlug} />
  </div>
}
