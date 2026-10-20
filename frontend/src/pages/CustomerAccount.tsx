import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Store
} from 'lucide-react'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'
import CustomerFavoritesModal from '../components/CustomerFavoritesModal'
import { useCustomerFavorites } from '../utils/customerFavorites'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function CustomerAccount() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)
  const { count: favoritesCount } = useCustomerFavorites()

  const phone = localStorage.getItem('customer-orders-phone') || ''
  const hasVerifiedOrders = Boolean(localStorage.getItem('customer-orders-token'))

  function handleLogoutPhone() {
    localStorage.removeItem('customer-orders-phone')
    localStorage.removeItem('customer-orders-token')
    toast.success('Mobile session logged out')
    navigate('/customer-orders')
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-16 sm:pt-18 pb-24 text-slate-900">
      <CustomerAppHeader subtitle="Your account" />

      <div className="mx-auto max-w-4xl px-3.5 py-3 sm:px-6 sm:py-5">
        {/* Customer Profile Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-4 sm:p-5 text-white shadow-md shadow-orange-500/20">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-amber-300/20 blur-xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 sm:gap-4">
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
                  {hasVerifiedOrders ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                      Mobile verified for order tracking
                    </span>
                  ) : (
                    'Verify mobile to access and track your purchases'
                  )}
                </p>
              </div>
            </div>

            {!hasVerifiedOrders && (
              <button
                type="button"
                onClick={() => navigate('/customer-orders')}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-orange-600 hover:bg-orange-50 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Verify Mobile</span>
              </button>
            )}
          </div>
        </section>

        {/* Working Account Actions */}
        <section className="mt-4 sm:mt-5 space-y-2.5">
          {/* My Orders */}
          <Link
            to="/customer-orders"
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-orange-200 hover:shadow-xs transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <ClipboardList className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">My Orders</strong>
                <span className="text-xs text-slate-500">Track all your purchases, status & invoices</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>

          {/* Favorite Stores */}
          <button
            type="button"
            onClick={() => setShowFavoritesModal(true)}
            className="w-full flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-amber-200 hover:shadow-xs transition active:scale-[0.99] text-left cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
              </span>
              <span>
                <span className="flex items-center gap-2">
                  <strong className="text-sm font-black text-slate-900">Favorite Stores</strong>
                  {favoritesCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                      {favoritesCount}
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500">View and visit your bookmarked local shops</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          {/* Sell on Apani Dukan */}
          <Link
            to="/start"
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-orange-200 hover:shadow-xs transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Store className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">Start a Store on Apani Dukan</strong>
                <span className="text-xs text-slate-500">Take your shop online and start selling in 2 minutes</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>

          {/* Seller Dashboard Link (Only if authenticated seller/admin) */}
          {auth.user && (
            <Link
              to="/dashboard"
              className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-indigo-200 hover:shadow-xs transition active:scale-[0.99]"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block text-sm font-black text-slate-900">Seller Dashboard</strong>
                  <span className="text-xs text-slate-500">Manage your store products, orders and settings</span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          )}

          {/* Privacy Policy */}
          <Link
            to="/privacy-policy"
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">Privacy Policy</strong>
                <span className="text-xs text-slate-500">Customer data protection & security guidelines</span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>
        </section>

        {/* Change Phone / Logout */}
        {phone && (
          <button
            type="button"
            onClick={handleLogoutPhone}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3 text-xs font-black text-rose-600 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer active:scale-98"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out / Change Verified Mobile Number</span>
          </button>
        )}
      </div>

      <CustomerFavoritesModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
      />

      <CustomerAppBottomNav active="account" />
    </main>
  )
}
