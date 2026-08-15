import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function SellerPayments(){
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(null)
  const auth = useAuth()
  const navigate = useNavigate()
  useEffect(() => { api.get('/stores/').then(res => setStore(res.data.find((item: any) => String(item.id) === storeId) || null)).catch(() => navigate('/login')) }, [storeId, navigate])
  if (!store) return <div className="p-6">Loading payment setup...</div>
  return <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-24 lg:max-w-none lg:w-full">
    <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white"><div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Seller payments</p><h1 className="mt-1 text-xl font-bold">{store.name}</h1></div><div className="flex items-center gap-3"><NotificationBellHeader /><button onClick={() => { auth.logout(); navigate('/login') }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Logout</button></div></header>
    <div className="space-y-5 p-4"><section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-500 p-6 text-white shadow-xl shadow-indigo-200"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">PAYMENTS</span><h2 className="mt-4 text-2xl font-bold">Get paid for every order.</h2><p className="mt-2 text-sm text-indigo-100">Connect a payment gateway to receive money directly in your account.</p></section><section className="premium-card p-5"><div className="flex items-start justify-between"><div><p className="font-bold">Payment gateway</p><p className="mt-1 text-sm text-slate-500">Razorpay / Stripe integration</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Setup pending</span></div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Payment collection is not enabled yet. Orders can be created only after a real payment gateway is connected by the platform owner.</div></section><section className="premium-card p-5"><h3 className="font-bold">Payout details</h3><p className="mt-1 text-sm text-slate-500">Your bank and settlement details will appear here after gateway setup.</p></section></div>
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-1 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] lg:left-0 lg:right-0 lg:max-w-none lg:-translate-x-0 lg:mx-auto lg:w-full"><Link to={`/stores/${store.id}/manage`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Setup</Link><Link to={`/stores/${store.id}/orders`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Orders</Link><span className="flex-1 rounded-xl bg-indigo-50 px-2 py-2 text-center text-xs font-bold text-indigo-700">Payments</span><Link to={`/stores/${store.id}/chat`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Chat</Link><Link to={`/stores/${store.id}/requests`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Requests</Link><Link to={`/stores/${storeId}/analytics`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Analytics</Link></nav>
  </main>
}
