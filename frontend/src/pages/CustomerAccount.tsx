import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, CircleUserRound, ClipboardList, MapPin, Phone, Sparkles, Store } from 'lucide-react'
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
    <main className="min-h-screen bg-[#f8fafc] pt-16 sm:pt-18 pb-24 text-slate-900">
      <CustomerAppHeader subtitle="Your account" />

      <div className="mx-auto max-w-4xl px-3.5 py-3 sm:px-6 sm:py-5">
        {/* Harmonious Apani Dukan Brand Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-4 sm:p-5 text-white shadow-md shadow-orange-500/20">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-amber-300/20 blur-xl" />

          <div className="relative z-10 flex items-center gap-3.5 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-xs shadow-xs">
              <CircleUserRound className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                <Sparkles className="h-2.5 w-2.5" />
                Customer Account
              </span>
              <h1 className="mt-0.5 text-lg sm:text-xl font-black leading-tight">
                {phone ? `+91 ${phone}` : 'Welcome to Apani Dukan'}
              </h1>
              <p className="mt-0.5 text-xs text-orange-100/90 leading-tight">
                {hasVerifiedOrders
                  ? 'Mobile number verified for order access'
                  : 'Verify mobile to track your purchases'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 sm:mt-5 space-y-2.5">
          <Link
            to="/customer-orders"
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-orange-200 hover:shadow-xs transition"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <ClipboardList className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">My Orders</strong>
                <span className="text-xs text-slate-500">Track all your purchases and order status</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>

          <Link
            to="/customer-stores"
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-orange-200 hover:shadow-xs transition"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Store className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">Browse Stores</strong>
                <span className="text-xs text-slate-500">Discover nearby verified shops and sellers</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">Saved Location</strong>
                <span className="text-xs text-slate-500">
                  {savedLocation ? 'Location saved for local stores' : 'Select location from Home'}
                </span>
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Bell className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">Notifications & Alerts</strong>
                <span className="text-xs text-slate-500">Use the bell in the top bar to view alerts</span>
              </span>
            </span>
          </div>
        </section>

        {phone && (
          <button
            type="button"
            onClick={changePhone}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white py-3 text-xs font-black text-slate-700 shadow-2xs hover:border-orange-300 hover:text-orange-600 transition cursor-pointer"
          >
            <Phone className="h-4 w-4" />
            <span>Change verified mobile number</span>
          </button>
        )}
      </div>
      <CustomerAppBottomNav active="account" />
    </main>
  )
}
