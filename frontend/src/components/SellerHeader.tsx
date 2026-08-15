import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import NotificationBellHeader from './NotificationBellHeader'
import {
  Store,
  Settings,
  ExternalLink,
  LogOut,
  FolderKanban,
  Inbox,
  CreditCard,
  CheckCircle2,
  Clock,
  X,
  SlidersHorizontal,
  Phone,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react'

interface SellerHeaderProps {
  store: any
  activeTabTitle?: string
  onStoreUpdate?: () => void
}

export default function SellerHeader({ store, activeTabTitle, onStoreUpdate }: SellerHeaderProps) {
  const auth = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(store?.whatsapp_phone || store?.phone_number || '')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  if (!store) {
    return (
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-4 sm:px-8 py-3 text-white backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-800/80 animate-pulse border border-slate-700/50" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-3 w-20 rounded-md bg-slate-850 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-800 animate-pulse" />
        </div>
      </header>
    )
  }

  async function toggleManageInApp(newValue: boolean) {
    try {
      await api.patch(`/stores/${store.id}/`, { manage_in_app: newValue })
      setMessage(newValue ? '🟢 Manage in App activated!' : '⚪ Standard WhatsApp mode active.')
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      setMessage('Failed to update setting.')
    }
  }

  async function publishStore() {
    try {
      await api.patch(`/stores/${store.id}/`, { is_published: true })
      setMessage('✓ Store is now LIVE!')
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      setMessage('Failed to publish store.')
    }
  }

  async function savePhone(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.patch(`/stores/${store.id}/`, { whatsapp_phone: phoneNumber })
      setMessage('✓ WhatsApp number saved!')
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      setMessage('Failed to save phone number.')
    }
  }

  return (
    <>
      {/* Hyper-Luxurious Glassmorphic Enterprise Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/95 px-3 sm:px-8 py-3 text-white backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] transition-all">
        {/* Animated Neon Ambient Gradient Top Stroke */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-teal-500/0 via-teal-400/80 via-cyan-400/80 to-indigo-500/0 shadow-[0_0_15px_#14b8a6]" />

        {/* Subtle Bottom Accent Reflection */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-800/80 to-transparent" />

        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          {/* Left Brand Identity Card */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Logo Avatar with Radial Ambient Glow */}
            <div className="relative group flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/80 to-slate-900 text-teal-300 border border-teal-500/40 shadow-[0_0_20px_rgba(20,184,166,0.25)] transition-transform duration-300 group-hover:scale-105">
              {/* Radial glow background layer */}
              <div className="absolute inset-0 rounded-2xl bg-teal-500/20 blur-md opacity-60 group-hover:opacity-100 transition-opacity" />

              <Store className="relative h-5.5 w-5.5 sm:h-6 sm:w-6 text-teal-300 drop-shadow-[0_0_12px_rgba(20,184,166,0.9)]" />

              {/* Status Ping Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${store.is_published ? 'bg-teal-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${store.is_published ? 'bg-teal-400 shadow-[0_0_8px_#14b8a6]' : 'bg-amber-400'}`}></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-300 truncate">
                  <Sparkles className="h-3 w-3 text-teal-400 shrink-0 inline" />
                  <span>{activeTabTitle || 'Seller Workspace'}</span>
                </span>

                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black shrink-0 border transition-all ${
                  store.is_published
                    ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-200 border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                    : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border-amber-500/40'
                }`}>
                  {store.is_published ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-teal-400" />
                      <span className="font-extrabold tracking-wide">LIVE</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span className="font-extrabold tracking-wide">DRAFT</span>
                    </>
                  )}
                </span>
              </div>

              <h1 className="mt-0.5 text-base sm:text-lg md:text-xl font-black text-white truncate tracking-tight max-w-[150px] sm:max-w-xs md:max-w-md drop-shadow-sm">
                {store.name}
              </h1>
            </div>
          </div>

          {/* Right Action Tools Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Real-time Notification Bell */}
            <NotificationBellHeader />

            {/* Customer Storefront Preview Button with Shimmer Sweep */}
            {store.slug && (
              <Link
                to={`/store/${store.slug}`}
                target="_blank"
                className="group relative overflow-hidden flex items-center gap-1.5 rounded-xl sm:rounded-2xl border border-teal-500/40 bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-indigo-500/20 px-3.5 py-2 text-xs font-black text-teal-200 hover:text-white hover:border-teal-400/80 hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all duration-300 cursor-pointer"
                title="Preview Customer Storefront"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out pointer-events-none" />
                <ExternalLink className="h-4 w-4 text-teal-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-cyan-200" />
                <span className="hidden sm:inline tracking-wide font-extrabold">Storefront</span>
              </Link>
            )}

            {/* Gear Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="group flex items-center gap-1.5 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-teal-500/50 hover:bg-slate-850 hover:text-teal-300 hover:shadow-[0_0_15px_rgba(20,184,166,0.2)] transition-all duration-300 cursor-pointer shadow-inner"
              title="Open Store Settings & Controls"
            >
              <Settings className="h-4 w-4 text-slate-400 transition-transform duration-700 group-hover:rotate-180 group-hover:text-teal-400" />
              <span className="hidden sm:inline font-extrabold tracking-wide">Settings</span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => { auth.logout(); navigate('/login') }}
              className="group flex items-center justify-center p-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/80 text-slate-400 hover:border-rose-500/50 hover:bg-rose-950/40 hover:text-rose-200 hover:shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all duration-300 cursor-pointer"
              title="Logout from Seller Workspace"
            >
              <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:text-rose-400" />
              <span className="hidden sm:inline ml-1.5 text-xs font-extrabold">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Drawer Backdrop */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Slide-over Dark Glass Settings Sidebar Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-92 max-w-[92vw] bg-slate-950/98 text-white border-l border-slate-800/90 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-3xl transition-transform duration-300 ease-in-out flex flex-col ${
          isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 via-cyan-500/15 to-indigo-500/20 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
              <SlidersHorizontal className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="font-black text-base text-white tracking-wide">Store Controls</h2>
              <p className="text-[11px] font-medium text-teal-400/80">Enterprise Management Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border border-slate-800"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {message && (
            <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-r from-teal-500/15 to-cyan-500/10 p-4 text-xs font-extrabold text-teal-200 shadow-inner flex items-center gap-2">
              <Zap className="h-4 w-4 text-teal-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Quick Tools Shortcuts Card */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4.5 space-y-3 backdrop-blur-xl shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              <span>Seller Suite Modules</span>
            </p>

            <Link
              to={`/stores/${store.id}/catalog`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-slate-950/90 p-3.5 text-xs font-extrabold text-slate-200 border border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-200 transition-all shadow-inner"
            >
              <span className="flex items-center gap-3">
                <FolderKanban className="h-4.5 w-4.5 text-teal-400" />
                <span>Product Catalog & Inventory</span>
              </span>
              <span className="text-slate-500 group-hover:text-teal-400 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>

            <Link
              to={`/stores/${store.id}/requests`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-slate-950/90 p-3.5 text-xs font-extrabold text-slate-200 border border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-200 transition-all shadow-inner"
            >
              <span className="flex items-center gap-3">
                <Inbox className="h-4.5 w-4.5 text-teal-400" />
                <span>Product Requests Queue</span>
              </span>
              <span className="text-slate-500 group-hover:text-teal-400 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>

            <Link
              to={`/stores/${store.id}/payments`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-slate-950/90 p-3.5 text-xs font-extrabold text-slate-200 border border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-200 transition-all shadow-inner"
            >
              <span className="flex items-center gap-3">
                <CreditCard className="h-4.5 w-4.5 text-teal-400" />
                <span>Payments Gateway Integration</span>
              </span>
              <span className="text-slate-500 group-hover:text-teal-400 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>
          </div>

          {/* Manage in App Toggle */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4.5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-white">Manage in App Mode</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time Order Status System</p>
              </div>
              <button
                type="button"
                onClick={() => toggleManageInApp(!store.manage_in_app)}
                className={`relative inline-flex h-6.5 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                  store.manage_in_app ? 'bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.7)]' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                    store.manage_in_app ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-medium">
              {store.manage_in_app
                ? '🟢 ACTIVE: Live status changes trigger instant WebSocket alerts on customer devices.'
                : '⚪ OFF: Direct WhatsApp checkout mode.'}
            </p>
          </div>

          {/* Storefront Status */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4.5 space-y-3 shadow-inner">
            <h3 className="font-extrabold text-xs text-white">Storefront Visibility</h3>
            <div className="flex items-center justify-between bg-slate-950/90 p-3 rounded-xl border border-slate-800/80">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                store.is_published ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-[0_0_10px_rgba(20,184,166,0.2)]' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {store.is_published ? '● LIVE STORE' : '○ DRAFT STORE'}
              </span>
              {!store.is_published && (
                <button
                  type="button"
                  onClick={publishStore}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-1.5 text-xs font-black text-white hover:brightness-110 shadow-xs cursor-pointer transition-all"
                >
                  Publish Live
                </button>
              )}
            </div>
          </div>

          {/* WhatsApp Order Phone Number Input */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4.5 space-y-3 shadow-inner">
            <div>
              <h3 className="font-extrabold text-xs text-white">WhatsApp Order Target Phone</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Target number for direct customer orders.</p>
            </div>
            <form onSubmit={savePhone} className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="919876543210"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs font-mono text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                  inputMode="tel"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-teal-500 cursor-pointer shadow-xs transition-all"
              >
                Save
              </button>
            </form>
          </div>

          {/* Customer Storefront Link */}
          {store.slug && (
            <Link
              to={`/store/${store.slug}`}
              target="_blank"
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-teal-500/15 py-3.5 text-xs font-extrabold text-cyan-300 hover:text-white hover:border-cyan-400/80 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              <ExternalLink className="h-4.5 w-4.5 text-cyan-400" />
              <span>Open Customer Storefront ↗</span>
            </Link>
          )}

          {/* Logout Action */}
          <button
            type="button"
            onClick={() => { auth.logout(); navigate('/login') }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 py-3.5 text-xs font-extrabold text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all cursor-pointer shadow-inner"
          >
            <LogOut className="h-4.5 w-4.5 text-rose-400" />
            <span>Logout from Workspace</span>
          </button>
        </div>
      </aside>
    </>
  )
}
