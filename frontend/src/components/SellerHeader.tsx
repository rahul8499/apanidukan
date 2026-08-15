import React, { useState, useEffect } from 'react'
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
  Zap,
  User,
  Edit3,
  Camera,
  Check,
  MapPin
} from 'lucide-react'

interface SellerHeaderProps {
  store: any
  activeTabTitle?: string
  onStoreUpdate?: () => void
}

export default function SellerHeader({ store, activeTabTitle, onStoreUpdate }: SellerHeaderProps) {
  const auth = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [storeName, setStoreName] = useState(store?.name || '')
  const [storeDescription, setStoreDescription] = useState(store?.description || '')
  const [storeAddress, setStoreAddress] = useState(store?.address || '')
  const [phoneNumber, setPhoneNumber] = useState(store?.phone_number || store?.whatsapp_phone || '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(store?.logo || null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (store) {
      setStoreName(store.name || '')
      setStoreDescription(store.description || '')
      setStoreAddress(store.address || '')
      setPhoneNumber(store.phone_number || store.whatsapp_phone || '')
      if (store.logo) {
        setLogoPreview(store.logo)
      }
    }
  }, [store])

  const currentLogoUrl = logoPreview || store?.logo || null

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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      const formData = new FormData()
      formData.append('name', storeName)
      formData.append('description', storeDescription)
      formData.append('address', storeAddress)
      formData.append('phone_number', phoneNumber)
      formData.append('whatsapp_phone', phoneNumber)
      if (logoFile) {
        formData.append('logo', logoFile)
      }
      const res = await api.patch(`/stores/${store.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data?.logo) {
        setLogoPreview(res.data.logo)
      }
      setMessage('✓ Store profile updated successfully!')
      setIsProfileEditing(false)
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      setMessage('Failed to update store profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
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
            <div className="relative group flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/80 to-slate-900 text-teal-300 border border-teal-500/40 shadow-[0_0_20px_rgba(20,184,166,0.25)] transition-transform duration-300 group-hover:scale-105 overflow-hidden">
              {currentLogoUrl ? (
                <img src={currentLogoUrl} alt={store.name} className="h-full w-full object-cover rounded-2xl" />
              ) : (
                <Store className="relative h-5.5 w-5.5 sm:h-6 sm:w-6 text-teal-300 drop-shadow-[0_0_12px_rgba(20,184,166,0.9)]" />
              )}

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
              title="Open Store Settings & Profile Controls"
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
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Slide-over Clean Premium White App Settings Sidebar Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-96 max-w-[92vw] bg-white text-slate-900 border-l border-slate-200/80 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Ultra-Premium Drawer Header with Store Identity */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-5 text-white border-b border-indigo-950 shadow-md">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-white/10 p-0.5 border border-white/20 shadow-md overflow-hidden flex items-center justify-center">
                {currentLogoUrl ? (
                  <img src={currentLogoUrl} alt={store.name} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <Store className="h-6 w-6 text-indigo-300" />
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${store.is_published ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>

              <div className="min-w-0">
                <h2 className="font-black text-base text-white truncate tracking-tight">{store.name}</h2>
                <p className="text-[11px] font-mono text-indigo-300/80 truncate">@{store.slug}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer border border-white/10 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content Body — Ordered Logical Sequence */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
          {message && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-xs font-bold text-teal-900 shadow-2xs flex items-center gap-2">
              <Zap className="h-4 w-4 text-teal-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* SECTION 1: 🏪 Editable Store Profile & Identity */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span className="font-extrabold text-xs text-slate-900">Store Profile & Details</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileEditing(!isProfileEditing)}
                className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="h-3 w-3" />
                <span>{isProfileEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
              </button>
            </div>

            {isProfileEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-7 w-7 text-slate-400" />
                    )}
                    <label className="absolute inset-0 bg-slate-900/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                      <Camera className="h-5 w-5" />
                      <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Store Logo Photo</p>
                    <p className="text-[10px] text-slate-500">Click icon to change image</p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Store Name:</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Store Description / Tagline:</label>
                  <textarea
                    value={storeDescription}
                    onChange={e => setStoreDescription(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                    placeholder="Short description about your shop..."
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Store Address (Optional):</label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={storeAddress}
                      onChange={e => setStoreAddress(e.target.value)}
                      placeholder="Shop No. 12, Main Market, Mumbai"
                      className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">WhatsApp Order Phone Number:</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="919876543210"
                      className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                      inputMode="tel"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-bold">Store Name:</span>
                  <span className="font-extrabold text-slate-900">{store.name}</span>
                </div>
                {store.description && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-bold block mb-0.5">Tagline:</span>
                    <p className="text-xs text-slate-800 italic">{store.description}</p>
                  </div>
                )}
                {store.address && (
                  <div className="flex justify-between items-start bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1 shrink-0">
                      <MapPin className="h-3 w-3 text-indigo-600" />
                      <span>Address:</span>
                    </span>
                    <span className="font-semibold text-xs text-slate-800 text-right">{store.address}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-bold">Order Phone:</span>
                  <span className="font-mono font-bold text-slate-900">{store.whatsapp_phone || store.phone_number || 'Not set'}</span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: 🚀 Seller Suite Modules (Quick Navigation) */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2.5 shadow-2xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Seller Navigation Modules</span>
            </p>

            <Link
              to={`/stores/${store.id}/catalog`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/40 hover:text-indigo-900 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-3">
                <FolderKanban className="h-4.5 w-4.5 text-indigo-600" />
                <span>Product Catalog & Inventory</span>
              </span>
              <span className="text-slate-400 group-hover:text-indigo-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>

            <Link
              to={`/stores/${store.id}/requests`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/40 hover:text-indigo-900 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-3">
                <Inbox className="h-4.5 w-4.5 text-indigo-600" />
                <span>Product Requests Queue</span>
              </span>
              <span className="text-slate-400 group-hover:text-indigo-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>

            <Link
              to={`/stores/${store.id}/payments`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/40 hover:text-indigo-900 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-3">
                <CreditCard className="h-4.5 w-4.5 text-indigo-600" />
                <span>Payments Gateway Integration</span>
              </span>
              <span className="text-slate-400 group-hover:text-indigo-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>
          </div>

          {/* SECTION 3: ⚙️ Store Preferences & Visibility */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            {/* Manage in App Mode Segmented Control */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>Manage in App Mode</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black ${
                      store.manage_in_app ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {store.manage_in_app ? 'ACTIVE (ON)' : 'DISABLED (OFF)'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Real-time Order Processing System</p>
                </div>
              </div>

              {/* Explicit ON / OFF Action Button Group */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-xl border border-slate-200/90">
                <button
                  type="button"
                  onClick={() => toggleManageInApp(true)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    store.manage_in_app
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 border border-emerald-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>🟢 ON</span>
                  <span className="text-[10px] font-extrabold opacity-90">(App System)</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleManageInApp(false)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    !store.manage_in_app
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>⚪ OFF</span>
                  <span className="text-[10px] font-extrabold opacity-90">(WhatsApp)</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                {store.manage_in_app
                  ? '🟢 ON Mode: Orders store system mein process hote hain with real-time status tracking & notifications.'
                  : '⚪ OFF Mode: Customers direct aapke WhatsApp number par order send karte hain.'}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
              <span className="text-xs font-bold text-slate-900">Store Visibility:</span>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                  store.is_published ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {store.is_published ? '● LIVE' : '○ DRAFT'}
                </span>
                {!store.is_published && (
                  <button
                    type="button"
                    onClick={publishStore}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    Publish
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: 🔗 Customer Link & Logout */}
          {store.slug && (
            <Link
              to={`/store/${store.slug}`}
              target="_blank"
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 py-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all shadow-2xs"
            >
              <ExternalLink className="h-4 w-4 text-indigo-600" />
              <span>Open Customer Storefront ↗</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => { auth.logout(); navigate('/login') }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
          >
            <LogOut className="h-4 w-4 text-rose-600" />
            <span>Logout from Workspace</span>
          </button>
        </div>
      </aside>
    </>
  )
}
