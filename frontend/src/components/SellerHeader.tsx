import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import NotificationBellHeader from './NotificationBellHeader'
import { useNotifications } from '../context/NotificationContext'
import SellerAiAssistantModal from './SellerAiAssistantModal'
import StoreQrStandeeModal from './StoreQrStandeeModal'
import StorePosterModal from './StorePosterModal'
import SellerScratchConfigModal from './SellerScratchConfigModal'
import { ScratchCardConfig } from './CustomerScratchCardModal'
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
  Crown,
  MapPin,
  AlertTriangle,
  Bell,
  Tag,
  HelpCircle,
  Mail,
  MessageSquare,
  PhoneCall,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Gift
} from 'lucide-react'

interface SellerHeaderProps {
  store: any
  activeTabTitle?: string
  onStoreUpdate?: () => void
}

export default function SellerHeader({ store, activeTabTitle, onStoreUpdate }: SellerHeaderProps) {
  const auth = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [showScratchModal, setShowScratchModal] = useState(false)
  const [storeName, setStoreName] = useState(store?.name || '')
  const [storeDescription, setStoreDescription] = useState(store?.description || '')
  const [storeAddress, setStoreAddress] = useState(store?.address || '')
  const [phoneNumber, setPhoneNumber] = useState(store?.phone_number || store?.whatsapp_phone || '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(store?.logo || null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const [scratchConfig, setScratchConfig] = useState<ScratchCardConfig>(() => {
    try {
      const saved = localStorage.getItem(`qs_scratch_config_${store?.id}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      enabled: true,
      title: '🎉 Scratch & Win Welcome Gift!',
      rewardText: 'Flat ₹50 OFF on orders above ₹299',
      couponCode: 'LUCKY50',
      discountType: 'fixed',
      discountValue: 50,
      minOrder: 299
    }
  })

  const handleSaveScratchConfig = (newConfig: ScratchCardConfig) => {
    setScratchConfig(newConfig)
    try {
      localStorage.setItem(`qs_scratch_config_${store?.id}`, JSON.stringify(newConfig))
    } catch {}
  }

  const [soundboxOn, setSoundboxOn] = useState(() => {
    return localStorage.getItem('qs_soundbox_enabled') !== 'false'
  })

  const [flashSaleActive, setFlashSaleActive] = useState(() => {
    try {
      const cached = localStorage.getItem(`qs_flash_sale_${store?.id}`)
      return cached ? JSON.parse(cached).active : false
    } catch {
      return false
    }
  })

  const [flashSaleDiscount, setFlashSaleDiscount] = useState<number>(() => {
    try {
      const cached = localStorage.getItem(`qs_flash_sale_${store?.id}`)
      return cached ? JSON.parse(cached).discount || 25 : 25
    } catch {
      return 25
    }
  })

  const [flashSaleTitle, setFlashSaleTitle] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(`qs_flash_sale_${store?.id}`)
      return cached ? JSON.parse(cached).title || 'Evening Clearance Sale' : 'Evening Clearance Sale'
    } catch {
      return 'Evening Clearance Sale'
    }
  })

  function updateFlashSaleConfig(active: boolean, discount: number, title: string) {
    setFlashSaleActive(active)
    setFlashSaleDiscount(discount)
    setFlashSaleTitle(title)
    const payload = { active, discount, title }
    if (store?.id) localStorage.setItem(`qs_flash_sale_${store.id}`, JSON.stringify(payload))
    if (activeStore?.slug) localStorage.setItem(`qs_flash_sale_${activeStore.slug}`, JSON.stringify(payload))
    localStorage.setItem('qs_flash_sale_global', JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent('qs-flash-sale-updated', { detail: payload }))
  }

  function toggleSoundbox() {
    const next = !soundboxOn
    setSoundboxOn(next)
    localStorage.setItem('qs_soundbox_enabled', next ? 'true' : 'false')
    if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance("QuickStore Hindi Soundbox Alert Active hai!")
      u.lang = 'hi-IN'
      window.speechSynthesis.speak(u)
    }
  }

  function toggleFlashSale() {
    const next = !flashSaleActive
    setFlashSaleActive(next)
    const payload = { active: next, discount: 25, title: '⚡ Evening Stock Clearance (25% OFF)' }
    localStorage.setItem(`qs_flash_sale_${store?.id}`, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent('qs-flash-sale-updated', { detail: payload }))
  }

  // Real-Time Web Push & PWA Notification Settings
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  async function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotificationPermission(perm)
      if (perm === 'granted') {
        new Notification('🔔 Notifications Activated!', {
          body: 'You will receive real-time push alerts for orders & low stock items.',
          icon: '/favicon.ico',
        })
        setMessage('🔔 Web Push Notifications Enabled! You will receive alerts on Web & PWA.')
      } else {
        setMessage('⚠️ Notification permission was denied in browser settings.')
      }
    }
  }

  const { setActiveStoreId } = useNotifications()

  useEffect(() => {
    if (store?.id) {
      setActiveStoreId(store.id)
      setStoreName(store.name || '')
      setStoreDescription(store.description || '')
      setStoreAddress(store.address || '')
      setPhoneNumber(store.phone_number || store.whatsapp_phone || '')
      if (store.logo) {
        setLogoPreview(store.logo)
      }
    }
  }, [store, setActiveStoreId])

  // Instant memory & localStorage cached subscription state (Prevents navbar blinking on tab changes)
  const [subStatus, setSubStatus] = useState<any>(() => {
    if (!store?.id) return null
    try {
      const cached = localStorage.getItem(`sub_status_${store.id}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!store?.id) return
    api.get(`/payments/subscriptions/status/?store_id=${store.id}`)
      .then(res => {
        if (res.data?.success) {
          setSubStatus(res.data)
          try {
            localStorage.setItem(`sub_status_${store.id}`, JSON.stringify(res.data))
          } catch { }
        }
      })
      .catch(() => { })
  }, [store?.id])

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

  function handleLiveToggleClick() {
    if (store?.is_published) {
      setShowUnpublishConfirm(true)
    } else {
      executePublish(true)
    }
  }

  async function executePublish(nextState: boolean) {
    try {
      await api.patch(`/stores/${store.id}/`, { is_published: nextState })
      setMessage(nextState ? '🟢 Store is now LIVE!' : '⚪ Store is now in DRAFT mode (Offline).')
      setShowUnpublishConfirm(false)
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      setMessage('Failed to update store status.')
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
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Logo Avatar with Radial Ambient Glow */}
            <div className="relative group flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/80 to-slate-900 text-teal-300 border border-teal-500/40 shadow-[0_0_20px_rgba(20,184,166,0.25)] transition-transform duration-300 group-hover:scale-105 overflow-hidden">
              {currentLogoUrl ? (
                <img src={currentLogoUrl} alt={store.name} className="h-full w-full object-cover rounded-2xl" />
              ) : (
                <Store className="relative h-5 w-5 sm:h-6 sm:w-6 text-teal-300 drop-shadow-[0_0_12px_rgba(20,184,166,0.9)]" />
              )}

              {/* Status Ping Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${store.is_published ? 'bg-teal-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-slate-950 ${store.is_published ? 'bg-teal-400 shadow-[0_0_8px_#14b8a6]' : 'bg-amber-400'}`}></span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {/* Row 1: Store Name & Badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-white truncate tracking-tight drop-shadow-sm max-w-[140px] xs:max-w-[180px] sm:max-w-xs">
                  {store.name}
                </h1>

                {/* Active Plan Badge */}
                {subStatus && (
                  <Link
                    to={`/stores/${store.id}/subscription`}
                    title={`Current Plan: ${subStatus.plan_name} (${subStatus.status})`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black shrink-0 border transition-all cursor-pointer hover:scale-105 shadow-xs ${subStatus.plan_name === 'PREMIUM'
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 hover:border-amber-300'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                    {subStatus.plan_name === 'PREMIUM' ? (
                      <>
                        <Crown className="h-3 w-3 text-amber-400" />
                        <span className="tracking-wide">PREMIUM</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-2.5 w-2.5 text-slate-400" />
                        <span className="tracking-wide">BASIC</span>
                      </>
                    )}
                  </Link>
                )}
              </div>

              {/* Row 2: Tagline & Active Module Title */}
              <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold tracking-wide text-amber-300 truncate mt-0.5">
                <Sparkles className="h-3 w-3 text-amber-400 shrink-0 animate-pulse" />
                <span className="font-black text-amber-300">Demand Dekho, Product lao, Sell Karo</span>
                {activeTabTitle && (
                  <>
                    <span className="text-slate-500 font-bold">•</span>
                    <span className="text-teal-300 font-bold">{activeTabTitle}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right Action Tools Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Seller AI Copilot Assistant Button */}
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-teal-500/20 px-2.5 sm:px-3.5 text-xs font-black text-amber-300 hover:border-amber-300 hover:scale-105 transition-all cursor-pointer shadow-xs"
              title="Open Seller AI Copilot & Business Assistant"
            >
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              <span className="hidden xs:inline font-black tracking-wide">✨ AI Copilot</span>
            </button>



            {/* Real-time Notification Bell */}
            <NotificationBellHeader />

            {/* Customer Storefront Preview Button */}
            {store.slug && (
              <Link
                to={`/store/${store.slug}`}
                target="_blank"
                className="flex h-9 w-9 sm:h-10 sm:w-auto items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl border border-teal-500/40 bg-teal-500/10 sm:px-3.5 text-xs font-black text-teal-300 hover:bg-teal-500/20 hover:border-teal-400 transition-all cursor-pointer"
                title="Preview Customer Storefront"
              >
                <ExternalLink className="h-4 w-4 text-teal-300" />
                <span className="hidden sm:inline font-extrabold tracking-wide">Storefront ↗</span>
              </Link>
            )}

            {/* Gear Settings Button (Opens Profile Drawer) */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900 px-2.5 sm:px-3.5 text-xs font-extrabold text-slate-200 hover:border-teal-500/50 hover:bg-slate-850 hover:text-teal-300 transition-all cursor-pointer shadow-inner"
              title="Open Store Settings & Profile Controls"
            >
              <Settings className="h-4 w-4 text-slate-300 transition-transform duration-500 hover:rotate-90" />
              <span className="hidden sm:inline font-extrabold tracking-wide">Settings</span>
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
        className={`fixed top-0 right-0 z-50 h-full w-96 max-w-[92vw] bg-white text-slate-900 border-l border-slate-200/80 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
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
                <p className="text-[10px] font-extrabold text-amber-300 truncate">Demand Dekho, Product lao, Sell Karo</p>
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

          {/* SECTION 0: ⚡ Store Smart Automation Controls (Soundbox & Flash Sale) */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
              <Zap className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span className="font-black text-xs text-slate-900 tracking-wide uppercase">Smart Dukan Controls</span>
            </div>

            {/* Control 1: Hindi Voice Soundbox */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${soundboxOn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {soundboxOn ? <Volume2 className="h-4.5 w-4.5 text-emerald-600" /> : <VolumeX className="h-4.5 w-4.5 text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">Dukan Hindi Soundbox 🔊</p>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">Bolta Order & Request Reader</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSoundbox}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${soundboxOn ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundboxOn ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Control 2: Evening Clearance Flash Sale */}
            <div className="space-y-2.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${flashSaleActive ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
                    <Zap className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">⚡ Evening Flash Sale</p>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">{flashSaleActive ? `${flashSaleDiscount}% OFF Banner LIVE` : 'Stock Clearance Sale'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateFlashSaleConfig(!flashSaleActive, flashSaleDiscount, flashSaleTitle)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${flashSaleActive ? 'bg-rose-600' : 'bg-slate-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${flashSaleActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Dynamic Flash Sale Config Panel */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-extrabold text-slate-600">Discount %:</label>
                  <div className="flex items-center gap-1">
                    {[10, 20, 25, 30, 50].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateFlashSaleConfig(flashSaleActive, d, flashSaleTitle)}
                        className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                          flashSaleDiscount === d
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {d}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600">Sale Title:</label>
                  <input
                    type="text"
                    value={flashSaleTitle}
                    onChange={(e) => updateFlashSaleConfig(flashSaleActive, flashSaleDiscount, e.target.value)}
                    placeholder="e.g. Evening Clearance Sale"
                    className="w-full mt-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

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

          {/* SECTION 2: 🚀 Seller Suite Modules & Marketing Tools */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2.5 shadow-2xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Seller Navigation & Marketing Tools</span>
            </p>

            {/* AI WhatsApp Status Poster Button */}
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false)
                setShowPosterModal(true)
              }}
              className="w-full group flex items-center justify-between rounded-xl bg-purple-500/10 p-3 text-xs font-black text-purple-900 border border-purple-300/80 hover:bg-purple-500/20 hover:border-purple-400 transition-all shadow-2xs cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <ImageIcon className="h-4.5 w-4.5 text-purple-600 shrink-0" />
                <span>🎨 AI WhatsApp Poster Generator</span>
              </span>
              <span className="text-purple-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </button>

            {/* Scratch Card / Gift Config Button */}
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false)
                setShowScratchModal(true)
              }}
              className="w-full group flex items-center justify-between rounded-xl bg-amber-500/10 p-3 text-xs font-black text-amber-900 border border-amber-300/80 hover:bg-amber-500/20 hover:border-amber-400 transition-all shadow-2xs cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <Gift className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                <span>🎁 Customer Gift & Scratch Config</span>
              </span>
              <span className="text-amber-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </button>

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

            <Link
              to={`/stores/${store.id}/coupons`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/40 hover:text-indigo-900 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-3">
                <Tag className="h-4.5 w-4.5 text-emerald-600" />
                <span>Coupons & Offers Management</span>
              </span>
              <span className="text-slate-400 group-hover:text-emerald-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
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
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black ${store.manage_in_app ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'
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
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${store.manage_in_app
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
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${!store.manage_in_app
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
              <button
                type="button"
                onClick={handleLiveToggleClick}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black cursor-pointer transition-all shadow-xs ${store.is_published
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-600 text-white border border-emerald-400 hover:from-amber-600 hover:to-emerald-700 shadow-md animate-pulse'
                  }`}
              >
                {store.is_published ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>● LIVE (Click to Draft)</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 text-white" />
                    <span>🚀 MAKE STORE LIVE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 4: 🔔 Real-Time Web Push & PWA Notifications Toggle */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <span>Real-Time Push Alerts</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${notificationPermission === 'granted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                    {notificationPermission === 'granted' ? 'ACTIVE (ON)' : 'DISABLED (OFF)'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Instant alerts on Mobile App (PWA) & Browser</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 gap-2">
              <div className="text-[11px] text-slate-700 font-medium leading-relaxed">
                {notificationPermission === 'granted'
                  ? '✅ Push notifications active hain. Instant order & stock alerts milenge.'
                  : '⚠️ Notifications disabled hain. Browser push permission enable karein.'}
              </div>

              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="shrink-0 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
                >
                  Enable Alerts 🔔
                </button>
              ) : (
                <span className="shrink-0 text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Active ✓
                </span>
              )}
            </div>
          </div>

          {/* SECTION 5: 💳 Active Subscription & Razorpay Billing Card */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 space-y-3 shadow-md text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-black uppercase text-indigo-200">Active Subscription</span>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {subStatus?.plan_name || 'BASIC'} PLAN
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
              {subStatus?.plan_name === 'PREMIUM'
                ? '⭐ Premium Store Active: Executive Audit Reports & Multi-Admin Access'
                : 'Standard Store Active. Upgrade to Premium for Executive Audit PDF & Priority Support.'}
            </p>
            <Link
              to={`/stores/${store.id}/subscription`}
              onClick={() => setIsSettingsOpen(false)}
              className="w-full flex items-center justify-between rounded-xl bg-indigo-600/60 hover:bg-indigo-600 border border-indigo-500/40 p-2.5 text-xs font-black text-white transition-all shadow-xs"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-teal-300" />
                <span>Manage Subscription & Receipts</span>
              </div>
              <span className="text-[10px] font-extrabold text-teal-300">Open ➔</span>
            </Link>
          </div>

          {/* SECTION 6: 🎧 Platform & Technical Support */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-indigo-600" />
                <span className="font-extrabold text-xs text-slate-900">Platform & Technical Support</span>
              </div>
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white">24/7 LIVE</span>
            </div>

            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Store management, PWA app, domain, catalog sync, or payment integration help ke liye platform support se contact karein:
            </p>

            {/* Direct Contact Options */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              {/* Email Launcher */}
              <a
                href="mailto:rahulkolhe90.rk.kr@gmail.com"
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/60 transition-all text-xs font-bold text-slate-800"
              >
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="truncate">rahulkolhe90.rk.kr@gmail.com</span>
                </div>
                <span className="text-[10px] text-indigo-600 font-black shrink-0">EMAIL ↗</span>
              </a>

              {/* Phone Launcher */}
              <a
                href="tel:7796216506"
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/60 transition-all text-xs font-bold text-slate-800"
              >
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>+91 7796216506</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-black">CALL 📞</span>
              </a>

              {/* WhatsApp Direct Chat Launcher */}
              <a
                href="https://wa.me/917796216506?text=Hi%20QuickStore%20Support,%20I%20need%20technical%20help%20with%20my%20store."
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-all text-xs font-black text-[#075E54]"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#25D366] shrink-0" />
                  <span>WhatsApp Support Chat</span>
                </div>
                <span className="text-[10px] bg-[#25D366] text-white px-2 py-0.5 rounded font-black">CHAT ➔</span>
              </a>
            </div>
          </div>

          {/* SECTION 7: 🔗 Customer Link & Logout */}
          {store.slug && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false)
                  setShowQrModal(true)
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-xs font-black text-white hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md cursor-pointer"
              >
                <span>🖨️ Print Counter QR Standee</span>
              </button>

              <Link
                to={`/store/${store.slug}`}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all shadow-2xs"
              >
                <ExternalLink className="h-4 w-4 text-indigo-600" />
                <span>Open Customer Storefront ↗</span>
              </Link>
            </div>
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

      {/* Unpublish Confirmation Dialogue Modal */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900 animate-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Take Store Offline?</h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                Aapki online dukaan DRAFT mode mein chali jayegi aur customers website link se store access nahi kar payenge. Kya aap offline karna chahte hain?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowUnpublishConfirm(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-extrabold text-xs text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executePublish(false)}
                className="w-full py-2.5 rounded-xl bg-amber-600 font-extrabold text-xs text-white hover:bg-amber-700 transition-all cursor-pointer shadow-md"
              >
                Yes, Set to Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller AI Copilot Dialogue Modal */}
      {isAiModalOpen && (
        <SellerAiAssistantModal store={store} onClose={() => setIsAiModalOpen(false)} />
      )}

      {/* Printable Shop QR Standee & Poster Modal */}
      {showQrModal && store && (
        <StoreQrStandeeModal
          store={store}
          publicUrl={`${window.location.origin}/store/${store.slug}`}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* AI WhatsApp Poster Generator Modal */}
      {showPosterModal && store && (
        <StorePosterModal
          store={store}
          publicUrl={`${window.location.origin}/store/${store.slug}`}
          onClose={() => setShowPosterModal(false)}
        />
      )}

      {/* Seller Scratch Card Rewards Settings Modal */}
      {showScratchModal && store && (
        <SellerScratchConfigModal
          storeId={store.id}
          currentConfig={scratchConfig}
          onSave={handleSaveScratchConfig}
          onClose={() => setShowScratchModal(false)}
        />
      )}
    </>
  )
}
