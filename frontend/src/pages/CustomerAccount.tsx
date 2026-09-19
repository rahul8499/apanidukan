import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, CircleUserRound, ClipboardList, MapPin, Phone, Store } from 'lucide-react'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'

export default function CustomerAccount() {
  const navigate = useNavigate()
  const phone = localStorage.getItem('customer-orders-phone') || ''
  const hasVerifiedOrders = Boolean(localStorage.getItem('customer-orders-token'))
  const savedLocation = Boolean(localStorage.getItem('customer-location'))

  function changePhone() {
    localStorage.removeItem('customer-orders-phone')
    localStorage.removeItem('customer-orders-token')
    navigate('/customer-orders')
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] pb-24 text-slate-950">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-6">
        <CustomerAppHeader subtitle="Your account" />

        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-5 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><CircleUserRound className="h-8 w-8" /></div>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Customer account</p><h1 className="mt-1 text-xl font-black">{phone ? `+91 ${phone}` : 'Welcome to Apani Dukan'}</h1><p className="mt-1 text-xs text-slate-300">{hasVerifiedOrders ? 'Mobile verified for order access' : 'Verify mobile from My Orders'}</p></div>
          </div>
        </section>

        <section className="mt-5 space-y-2">
          <Link to="/customer-orders" className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><ClipboardList className="h-5 w-5" /></span><span><strong className="block text-sm">My Orders</strong><span className="text-xs text-slate-500">Track all your purchases</span></span></span><ChevronRight className="h-5 w-5 text-slate-400" /></Link>
          <Link to="/customer-stores" className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="flex items-center gap-3"><span className="rounded-xl bg-orange-50 p-2 text-orange-600"><Store className="h-5 w-5" /></span><span><strong className="block text-sm">Browse Stores</strong><span className="text-xs text-slate-500">Discover local sellers</span></span></span><ChevronRight className="h-5 w-5 text-slate-400" /></Link>
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><MapPin className="h-5 w-5" /></span><span><strong className="block text-sm">Saved location</strong><span className="text-xs text-slate-500">{savedLocation ? 'Location saved for nearby stores' : 'Select location from Home'}</span></span></span></div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-2 text-amber-600"><Bell className="h-5 w-5" /></span><span><strong className="block text-sm">Notifications</strong><span className="text-xs text-slate-500">Use the bell above to manage alerts</span></span></span></div>
        </section>

        {phone && <button type="button" onClick={changePhone} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-700 shadow-sm"><Phone className="h-4 w-4" />Change verified mobile number</button>}
      </div>
      <CustomerAppBottomNav active="account" />
    </main>
  )
}
