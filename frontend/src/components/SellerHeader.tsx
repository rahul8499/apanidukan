import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import NotificationBellHeader from './NotificationBellHeader'
import { speakSoundboxAlert, useNotifications } from '../context/NotificationContext'
import SellerAiAssistantModal from './SellerAiAssistantModal'
import StoreQrStandeeModal from './StoreQrStandeeModal'
import StorePosterModal from './StorePosterModal'
import SellerScratchConfigModal from './SellerScratchConfigModal'
import SellerDeliveryConfigModal from './SellerDeliveryConfigModal'
import SellerThemeCustomizerModal from './SellerThemeCustomizerModal'
import SellerCustomDomainModal from './SellerCustomDomainModal'
import SellerDeactivateModal from './SellerDeactivateModal'
import LanguageSwitcherModal from './LanguageSwitcherModal'
import SellerOnboardingGuideModal from './SellerOnboardingGuideModal'
import { ScratchCardConfig } from './CustomerScratchCardModal'
import InstallAppButton from '../pwa/InstallAppButton'
import { setupSellerStorePwa } from '../pwa/pwaManager'
import { useTranslation } from 'react-i18next'
import { BUSINESS_TYPES, getBusinessType } from '../utils/businessTypes'
import {
  Globe,
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
  FileText,
  Zap,
  User,
  Edit3,
  Camera,
  Check,
  Crown,
  MapPin,
  AlertTriangle,
  PackageCheck,
  Bell,
  Tag,
  HelpCircle,
  Mail,
  MessageSquare,
  PhoneCall,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Gift,
  Truck,
  Palette,
  Lock
} from 'lucide-react'

interface SellerHeaderProps {
  store: any
  activeTabTitle?: string
  onStoreUpdate?: () => void
}

export default function SellerHeader({ store, activeTabTitle, onStoreUpdate }: SellerHeaderProps) {
  const { t } = useTranslation()
  const auth = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number, startY: number, startPosX: number, startPosY: number, moved: boolean } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: fabPos.x, startPosY: fabPos.y, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
    }
    setFabPos({
      x: dragRef.current.startPosX + dx,
      y: dragRef.current.startPosY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!dragRef.current?.moved) {
      setIsAiModalOpen(true);
    }
    dragRef.current = null;
  };
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [showScratchModal, setShowScratchModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliveryModalSection, setDeliveryModalSection] = useState<'general' | 'exchange'>('general')
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [showCustomDomainModal, setShowCustomDomainModal] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [isLangModalOpen, setIsLangModalOpen] = useState(false)
  const [storeName, setStoreName] = useState(store?.name || '')
  const [storeDescription, setStoreDescription] = useState(store?.description || '')
  const [storeAddress, setStoreAddress] = useState(store?.address || '')
  const [phoneNumber, setPhoneNumber] = useState(store?.phone_number || store?.whatsapp_phone || '')
  const [businessType, setBusinessType] = useState('GARMENTS')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(store?.logo || null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [unpublishError, setUnpublishError] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [message, setMessage] = useState('')
  const [isDeactivating, setIsDeactivating] = useState(false)
  const navigate = useNavigate()

  // Fulfillment & Delivery Options State
  const [allowHomeDelivery, setAllowHomeDelivery] = useState<boolean>(store?.allow_home_delivery ?? true)
  const [allowStorePickup, setAllowStorePickup] = useState<boolean>(store?.allow_store_pickup ?? true)
  const [isUpdatingDeliverySettings, setIsUpdatingDeliverySettings] = useState(false)

  const [platformAnnouncement, setPlatformAnnouncement] = useState<any>(null)

  useEffect(() => {
    api.get('/auth/platform/announcement/').then(res => {
      if (res.data?.announcement) {
        setPlatformAnnouncement(res.data.announcement)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (store) {
      setupSellerStorePwa(store)
      setAllowHomeDelivery(store.allow_home_delivery ?? true)
      setAllowStorePickup(store.allow_store_pickup ?? true)
    }
  }, [store?.id, store?.allow_home_delivery, store?.allow_store_pickup])

  const handleToggleDeliverySetting = async (field: 'allow_home_delivery' | 'allow_store_pickup', value: boolean) => {
    if (!value) {
      if (field === 'allow_home_delivery' && !allowStorePickup) {
        toast.error('At least one fulfillment option (Home Delivery or Walk-in Store Pickup) must remain enabled!')
        return
      }
      if (field === 'allow_store_pickup' && !allowHomeDelivery) {
        toast.error('At least one fulfillment option (Home Delivery or Walk-in Store Pickup) must remain enabled!')
        return
      }
    }

    // If enabling Home Delivery and not yet configured, we can also open the modal
    const nextHomeDelivery = field === 'allow_home_delivery' ? value : allowHomeDelivery
    const nextStorePickup = field === 'allow_store_pickup' ? value : allowStorePickup

    setAllowHomeDelivery(nextHomeDelivery)
    setAllowStorePickup(nextStorePickup)

    try {
      setIsUpdatingDeliverySettings(true)
      await api.patch(`/stores/${store.id}/`, {
        allow_home_delivery: nextHomeDelivery,
        allow_store_pickup: nextStorePickup
      })
      toast.success('Fulfillment settings updated!')
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      toast.error('Failed to update fulfillment settings.')
      // Revert on fail
      setAllowHomeDelivery(allowHomeDelivery)
      setAllowStorePickup(allowStorePickup)
    } finally {
      setIsUpdatingDeliverySettings(false)
    }
  }

  const handleConfirmDeactivate = async () => {
    setDeactivateError(null)
    try {
      setIsDeactivating(true)
      await api.post('/auth/account/deactivate/', { confirmation: 'DELETE' })
      setShowDeactivateModal(false)
      auth.logout()
      navigate('/login')
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.error || 'Resolve all pending or paid customer orders before deactivating the account.'
      setDeactivateError(msg)
      toast.error(msg)
    } finally {
      setIsDeactivating(false)
    }
  }

  const [scratchConfig, setScratchConfig] = useState<ScratchCardConfig>({
    enabled: true,
    title: '🎉 Scratch & Win Welcome Gift!',
    rewardText: 'Flat ₹50 OFF on orders above ₹299',
    couponCode: 'LUCKY50',
    discountType: 'fixed',
    discountValue: 50,
    minOrder: 299
  })

  useEffect(() => {
    if (store?.id) {
      api.get(`/stores/${store.id}/scratch_config/`).then(res => {
        setScratchConfig({
          enabled: res.data.enabled,
          title: res.data.title,
          rewardText: res.data.reward_text,
          couponCode: res.data.coupon_code,
          discountType: res.data.discount_type,
          discountValue: parseFloat(res.data.discount_value),
          minOrder: parseFloat(res.data.min_order)
        })
      }).catch(err => console.error("Failed to load scratch config from DB", err))
    }
  }, [store?.id])

  const handleSaveScratchConfig = async (newConfig: ScratchCardConfig) => {
    setScratchConfig(newConfig)
    if (store?.id) {
      try {
        await api.patch(`/stores/${store.id}/scratch_config/`, {
          enabled: newConfig.enabled,
          title: newConfig.title,
          reward_text: newConfig.rewardText,
          coupon_code: newConfig.couponCode,
          discount_type: newConfig.discountType,
          discount_value: newConfig.discountValue,
          min_order: newConfig.minOrder
        })
      } catch (err) {
        console.error("Failed to save scratch config to DB", err)
      }
    }
  }

  const [soundboxOn, setSoundboxOn] = useState(store?.settings?.soundbox_enabled ?? true)

  useEffect(() => {
    if (store?.settings) {
      setSoundboxOn(store.settings.soundbox_enabled)
    }
  }, [store?.settings?.soundbox_enabled])

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
    if (store?.slug) localStorage.setItem(`qs_flash_sale_${store.slug}`, JSON.stringify(payload))
    localStorage.setItem('qs_flash_sale_global', JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent('qs-flash-sale-updated', { detail: payload }))
  }

  function toggleSoundbox() {
    const next = !soundboxOn
    setSoundboxOn(next)
    if (store?.id) {
      api.patch(`/stores/${store.id}/`, { settings: { soundbox_enabled: next } }).catch(console.error)
    }
    if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speakSoundboxAlert('Apani Dukan Hindi voice soundbox active hai')
      toast.success('Hindi voice soundbox test played')
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
        toast.success('🔔 Web Push Notifications Enabled! You will receive alerts on Web & PWA.')
      } else {
        toast.error('⚠️ Notification permission was denied in browser settings.')
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
      setBusinessType('GARMENTS')
      if (store.logo) {
        setLogoPreview(store.logo)
      }
    }
  }, [store, setActiveStoreId])

  // Instant memory & localStorage cached subscription state (Prevents navbar blinking on tab changes)
  const [subStatus, setSubStatus] = useState<any>(null)

  useEffect(() => {
    if (!store?.id) return
    api.get(`/payments/subscriptions/status/?store_id=${store.id}`)
      .then(res => {
        if (res.data?.success) {
          setSubStatus(res.data)
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
      toast.success(newValue ? '🟢 Manage in App activated!' : '⚪ Standard WhatsApp mode active.')
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      toast.error('Failed to update setting.')
    }
  }

  function handleLiveToggleClick() {
    setUnpublishError(null)
    if (store?.is_published) {
      setShowUnpublishConfirm(true)
    } else {
      executePublish(true)
    }
  }

  async function executePublish(nextState: boolean) {
    setUnpublishError(null)
    const toastId = toast.loading('Updating store status...')
    try {
      await api.patch(`/stores/${store.id}/`, { is_published: nextState })
      toast.success(nextState ? '🟢 Store is now LIVE!' : '⚪ Store is now in DRAFT mode (Offline).', { id: toastId })
      setShowUnpublishConfirm(false)
      if (onStoreUpdate) onStoreUpdate()
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.error || 'Resolve all pending or paid customer orders before turning store offline.'
      setUnpublishError(msg)
      toast.error(msg, { id: toastId })
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
      formData.append('business_type', businessType)
      if (logoFile) {
        formData.append('logo', logoFile)
      }
      const res = await api.patch(`/stores/${store.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data?.logo) {
        setLogoPreview(res.data.logo)
      }
      toast.success('✓ Store profile updated successfully!')
      setIsProfileEditing(false)
      if (onStoreUpdate) onStoreUpdate()
    } catch {
      toast.error('Failed to update store profile.')
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
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 px-3 sm:px-6 py-0 text-slate-900 backdrop-blur-2xl shadow-sm transition-all">
        {/* Animated Neon Ambient Gradient Top Stroke */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-seller-300 via-seller-500 to-seller-400" />

        {/* Subtle Bottom Accent Reflection */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="mx-auto w-full max-w-7xl space-y-1  sm:space-y-0">
          {/* Main Top Row */}
          <div className="flex items-center justify-between gap-0 sm:gap-4">
            {/* Left Brand Identity Card */}
            <div className="flex items-center gap-0 sm:gap-0 min-w-0">
              {/* Logo Avatar with Radial Ambient Glow */}
              <div className="relative group shrink-0 transition-transform duration-300 group-hover:scale-105">
                <img src="/apanidukan-logo-horizontal.png" alt="Apani Dukan" className="h-9 sm:h-11 md:h-12 w-auto object-contain origin-left" />


              </div>

              <div className="min-w-0 ml-2 sm:ml-4 md:ml-6">
                {/* Store Name & Badges */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="hidden sm:block text-xs sm:text-base md:text-lg font-black text-slate-900 truncate tracking-tight max-w-[140px] sm:max-w-xs">
                    {store.name}
                  </h1>

                  {/* Active Plan Badge - Desktop/Web Only */}
                  {subStatus && (
                    <Link
                      to={`/stores/${store.id}/subscription`}
                      title={`Current Plan: ${subStatus.plan_name} (${subStatus.status})`}
                      className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] sm:text-[9px] font-extrabold shrink-0 border transition-colors cursor-pointer ${subStatus.plan_name === 'PREMIUM'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                      {subStatus.plan_name === 'PREMIUM' ? (
                        <>
                          <Crown className="h-3 w-3 text-amber-600" />
                          <span className="tracking-[0.08em]">PREMIUM</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-2 w-2 text-slate-400" />
                          <span className="tracking-wide">BASIC</span>
                        </>
                      )}
                    </Link>
                  )}
                </div>

                {/* Desktop Inline Tagline */}
                <p className="hidden sm:flex items-center gap-1.5 text-[11px] font-extrabold tracking-tight text-seller-700 mt-0.5 truncate">
                  <Sparkles className="h-2.5 w-2.5 text-seller-500 shrink-0 animate-pulse" />
                  <span className="text-seller-700 text-[10px] sm:text-[11px] font-black uppercase tracking-widest">Demand Dekho. Product Lao. Sell Karo.</span>
                  {activeTabTitle && (
                  <span className="font-bold text-seller-600">
                      <span className="text-slate-500 mx-1">•</span>
                      {activeTabTitle}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right Action Tools Toolbar (Neatly Grouped and Right-Docked) */}
            <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 ml-auto">
              {/* 📱 PWA Install App Button */}
              <InstallAppButton storeSlug={store?.slug} variant="header_pill" />

              {/* Customer Storefront Preview Button */}
              {store.slug && (
                <Link
                  to={`/s/${store.slug}`}
                  target="_blank"
                  className="flex h-7 w-7 sm:h-8 sm:w-auto items-center justify-center gap-1 rounded-lg border border-seller-200 bg-seller-50 sm:px-2 text-xs font-black text-seller-700 hover:bg-seller-100 transition-all cursor-pointer"
                  title="Preview Storefront"
                >
                  <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-seller-600" />
                  <span className="hidden lg:inline font-extrabold tracking-wide">Storefront ↗</span>
                </Link>
              )}

              {/* Gear Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex h-7 w-7 sm:h-8 sm:w-auto items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white sm:px-2 text-xs font-extrabold text-slate-700 hover:border-seller-200 hover:text-seller-700 transition-all cursor-pointer"
                title="Settings"
              >
                <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-600" />
                <span className="hidden lg:inline font-extrabold tracking-wide">Settings</span>
              </button>

              {/* Real-time Notification Bell */}
              <NotificationBellHeader />
            </div>
          </div>

          {/* Dedicated Full-Width Slim Mobile Tagline Strip (Zero Extra Space Wasted) */}
          <div className="sm:hidden flex items-center justify-between bg-seller-50 border border-seller-100 rounded-md px-2 py-0.5 text-[9px] font-black text-seller-700">
            <span className="flex items-center gap-1 min-w-0 truncate">
              <Sparkles className="h-2.5 w-2.5 text-seller-500 shrink-0 animate-pulse" />
              <span className="truncate font-black uppercase tracking-widest text-[8px]">Demand Dekho. Product Lao. Sell Karo.</span>
            </span>
            {activeTabTitle && (
              <span className="text-[8px] font-bold text-seller-700 shrink-0 ml-1">
                {activeTabTitle}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Live Broadcast Platform Announcement Banner */}
      {platformAnnouncement && (
        <div className={`w-full px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md border-b backdrop-blur-md ${
          platformAnnouncement.level === 'WARNING' ? 'bg-seller-950/90 text-seller-200 border-seller-800/80' :
          platformAnnouncement.level === 'URGENT' ? 'bg-rose-950/90 text-rose-200 border-rose-800/80' :
          platformAnnouncement.level === 'SUCCESS' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80' :
          'bg-seller-950/90 text-seller-200 border-seller-800/80'
        }`}>
          <div className="mx-auto flex items-center gap-2 max-w-7xl">
            <span className="text-base shrink-0">
              {platformAnnouncement.level === 'WARNING' ? '⚠️' :
               platformAnnouncement.level === 'URGENT' ? '🚨' :
               platformAnnouncement.level === 'SUCCESS' ? '🚀' : '📢'}
            </span>
            <span className="font-black tracking-wide uppercase text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full shrink-0">
              Platform Alert:
            </span>
            <span className="text-xs font-semibold leading-tight">
              {platformAnnouncement.message}
            </span>
          </div>
          <button
            onClick={() => setPlatformAnnouncement(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
            title="Dismiss Alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Settings Drawer Backdrop */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Slide-over Clean Premium Mobile-Native App & Web Settings Sidebar Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[110] h-full w-full sm:w-96 sm:max-w-[92vw] bg-slate-50 text-slate-900 border-l border-slate-200 shadow-xl transition-transform duration-300 ease-in-out flex flex-col ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Store identity and drawer controls */}
        <div className="shrink-0 bg-white px-4 sm:px-5 py-3.5 text-slate-900 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close sidebar"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 active:scale-95 transition-colors cursor-pointer border border-slate-200 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img src="/customer-icon-512.png" alt="Apani Dukan" className="h-8 w-8 object-contain" />
              </div>

              <div className="min-w-0">
                <h2 className="font-bold text-sm text-slate-900 truncate tracking-tight">{store.name}</h2>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${store.is_published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {store.is_published ? 'Live' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {store.slug && (
                <Link
                  to={`/s/${store.slug}`}
                  target="_blank"
                  className="flex h-9 px-3 items-center justify-center gap-1.5 rounded-xl border border-seller-200 bg-seller-50 text-seller-700 text-xs font-semibold hover:bg-seller-100 active:scale-95 transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Store</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Content Body — Organized High-Density Layout */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">

          {/* 1. PWA Install Button */}
          <InstallAppButton storeSlug={store?.slug} variant="drawer_item" />

          {/* 📖 Store Setup & Usage Guide Button */}
          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(false)
              setShowOnboardingModal(true)
            }}
            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 hover:border-seller-300 hover:bg-seller-50/50 transition-colors cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seller-50 text-seller-700 text-sm font-bold border border-seller-100">
                📖
              </span>
              <div className="text-left">
                <p className="font-semibold text-slate-900">Store Setup Guide & Tour</p>
                <p className="text-[10px] text-slate-500 font-medium">दुकान कशी वापरावी ते शिका (मार्गदर्शक)</p>
              </div>
            </div>
            <span className="rounded-full bg-seller-50 border border-seller-100 px-2 py-0.5 text-[9px] font-bold text-seller-700">OPEN</span>
          </button>

          {/* 2. 🏪 STORE PROFILE & IDENTITY */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-seller-600" />
                <span className="font-extrabold text-xs text-slate-900">{t('storeProfile')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileEditing(!isProfileEditing)}
                className="text-[11px] font-extrabold text-seller-600 hover:text-seller-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="h-3 w-3" />
                <span>{isProfileEditing ? t('cancel') : t('edit')}</span>
              </button>
            </div>

            {isProfileEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6 text-slate-400" />
                    )}
                    <label className="absolute inset-0 bg-slate-900/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t('storeLogo')}</p>
                    <p className="text-[10px] text-slate-500">{t('tapIconToChange')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700">{t('storeNameLabel')}</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-seller-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700">{t('orderPhoneLabel')}</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="919876543210"
                    className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-seller-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700">Business Category</label>
                  <div className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900">
                    {BUSINESS_TYPES[0].icon} {BUSINESS_TYPES[0].name} ({BUSINESS_TYPES[0].nameMr})
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full rounded-xl bg-seller-600 py-2 text-xs font-black text-white hover:bg-seller-700 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSavingProfile ? t('saving') : t('save')}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-1.5 text-xs font-medium text-slate-700">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold">{t('storeNameLabel')}</span>
                  <span className="font-extrabold text-slate-900">{store.name}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold">Business Type</span>
                  <span className="font-extrabold text-seller-700 flex items-center gap-1">
                    <span>{getBusinessType(store.business_type).icon}</span>
                    <span>{getBusinessType(store.business_type).name}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold">{t('orderPhoneLabel')}</span>
                  <span className="font-mono font-bold text-slate-900">{store.whatsapp_phone || store.phone_number || 'Not set'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
            <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5 text-seller-600" />
              <span>{t('workspaceModules')}</span>
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to={`/stores/${store.id}/orders`}
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-xs font-bold text-slate-800 hover:bg-seller-50 hover:border-seller-200 hover:text-seller-900 transition-all cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-seller-100/70 text-seller-700 font-bold text-xs shrink-0">
                  🛍️
                </div>
                <span className="truncate">{t('orders')}</span>
              </Link>

              <Link
                to={`/stores/${store.id}/catalog`}
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-xs font-bold text-slate-800 hover:bg-seller-50 hover:border-seller-200 hover:text-seller-900 transition-all cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-700 font-bold text-xs shrink-0">
                  📦
                </div>
                <span className="truncate">{t('products')}</span>
              </Link>

              <Link
                to={`/stores/${store.id}/requests`}
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-xs font-bold text-slate-800 hover:bg-seller-50 hover:border-seller-200 hover:text-seller-900 transition-all cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-seller-100/70 text-seller-700 font-bold text-xs shrink-0">
                  💡
                </div>
                <span className="truncate">{t('demand')}</span>
              </Link>

              <Link
                to={`/stores/${store.id}/coupons`}
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-xs font-bold text-slate-800 hover:bg-seller-50 hover:border-seller-200 hover:text-seller-900 transition-all cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100/70 text-rose-700 font-bold text-xs shrink-0">
                  🏷️
                </div>
                <span className="truncate">{t('couponPerformance')}</span>
              </Link>
            </div>
          </div>

          {/* 4. 🚚 CHECKOUT FULFILLMENT & DELIVERY MODES */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-seller-100/80 pb-1.5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-seller-600">{t('checkoutFulfillment')}</p>
                <h4 className="text-[11px] font-black text-slate-900 flex items-center gap-1 mt-0.5">
                  <Truck className="h-3 w-3 text-seller-600" />
                  <span>{t('orderFulfillmentModes')}</span>
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                {isUpdatingDeliverySettings && (
                  <span className="text-[9px] font-semibold text-seller-700">Saving...</span>
                )}
                <button
                  type="button"
                  onClick={() => { setDeliveryModalSection('general'); setShowDeliveryModal(true) }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-seller-600 text-white text-[9px] font-black hover:bg-seller-700 transition-all cursor-pointer shadow-xs"
                >
                  <SlidersHorizontal className="h-2.5 w-2.5" />
                  <span>{t('configureRules')}</span>
                </button>
              </div>
            </div>

            <p className="text-[9px] text-slate-600 font-medium leading-tight">
              {t('controlOrderOptions')}
            </p>

            <div className="space-y-2">
              {/* Home Delivery Card */}
              <div className={`rounded-lg p-2.5 border transition-colors ${allowHomeDelivery
                ? 'bg-white border-slate-200'
                : 'bg-slate-100/70 border-slate-200 opacity-75'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm shadow-inner ${allowHomeDelivery ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-200 border border-slate-300'
                      }`}>
                      🚚
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-900">{t('homeDelivery')}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full ${allowHomeDelivery ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                          }`}>
                          {allowHomeDelivery ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium block">{t('deliverToHome')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setDeliveryModalSection('general'); setShowDeliveryModal(true) }}
                      title="Edit Delivery Pricing & Radius"
                      className="text-[9px] font-black text-seller-600 hover:text-seller-800 bg-seller-50 hover:bg-seller-100 border border-seller-200 px-2 py-0.5 rounded-lg transition-all"
                    >
                      {t('editRates')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDeliverySetting('allow_home_delivery', !allowHomeDelivery)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${allowHomeDelivery ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition-transform duration-200 ease-in-out ${allowHomeDelivery ? 'translate-x-4' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Delivery Rule Badges */}
                {allowHomeDelivery && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-600 font-bold">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-700">
                      💰 Min: ₹{Number(store?.min_delivery_order) || 0}
                    </span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-700">
                      📍 Max: {store?.delivery_radius_km || 10} km
                    </span>
                    <span className="bg-seller-50 px-1.5 py-0.5 rounded-md border border-seller-200 text-seller-700">
                      {store?.delivery_charge_type === 'FREE'
                        ? '🟢 Free Delivery'
                        : store?.delivery_charge_type === 'PER_KM'
                          ? `📍 ₹${store?.delivery_per_km_fee || 0}/km`
                          : store?.delivery_charge_type === 'HYBRID'
                            ? `⚡ ₹${store?.delivery_flat_fee || 0} + ₹${store?.delivery_per_km_fee || 0}/km`
                            : `📦 ₹${store?.delivery_flat_fee || 0} Flat Fee`
                      }
                    </span>
                    {Number(store?.free_delivery_above) > 0 && (
                      <span className="bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 text-emerald-700">
                        🎉 Free &gt; ₹{store?.free_delivery_above}
                      </span>
                    )}
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-600">
                      ⏱️ {store?.delivery_estimated_time || '30-45 mins'}
                    </span>
                  </div>
                )}
              </div>

              {/* Walk-in Store Pickup Card */}
              <div className={`rounded-lg p-2.5 border transition-colors ${allowStorePickup
                ? 'bg-white border-slate-200'
                : 'bg-slate-100/70 border-slate-200 opacity-75'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm shadow-inner ${allowStorePickup ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-200 border border-slate-300'
                      }`}>
                      🏪
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-900">{t('walkInStorePickup')}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full ${allowStorePickup ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                          }`}>
                          {allowStorePickup ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium block">{t('customerCollects')}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleDeliverySetting('allow_store_pickup', !allowStorePickup)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${allowStorePickup ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition-transform duration-200 ease-in-out ${allowStorePickup ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {allowStorePickup && store?.pickup_instructions && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] text-slate-500 font-medium flex items-center gap-1">
                    <span>📍 {store.pickup_instructions}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. 🚀 SELLER NAVIGATION & MARKETING TOOLS */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-seller-600">Garments After-Sales</p>
                <h4 className="mt-1 text-xs font-black text-slate-950">🔄 Exchange Settings</h4>
                <p className="mt-1 text-[10px] font-medium text-slate-600">Toggle, days, evidence, reasons and customer policy</p>
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${store?.exchange_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{store?.exchange_enabled ? `ON · ${store?.exchange_window_days || 7} days` : 'OFF'}</span>
              </div>
              <button type="button" onClick={() => { setDeliveryModalSection('exchange'); setShowDeliveryModal(true) }} className="shrink-0 rounded-xl bg-seller-600 px-3 py-2 text-[10px] font-black text-white shadow-sm hover:bg-seller-700">Configure Exchange</button>
            </div>
          </div>

          {/* 5. 🚀 SELLER NAVIGATION & MARKETING TOOLS */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
              <ShieldCheck className="h-3.5 w-3.5 text-seller-600" />
              <span>{t('sellerNavMarketing')}</span>
            </p>

            <Link
              to={`/stores/${store.id}/catalog`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-seller-500 hover:bg-seller-50/40 hover:text-seller-900 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-3">
                <FolderKanban className="h-4.5 w-4.5 text-seller-600" />
                <span>{t('productCatalogInventory')}</span>
              </span>
              <span className="text-slate-400 group-hover:text-seller-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>

            <Link
              to={`/stores/${store.id}/requests`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-seller-500 hover:bg-seller-50/40 hover:text-seller-900 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-3">
                <Inbox className="h-4.5 w-4.5 text-seller-600" />
                <span>{t('productRequestsQueue')}</span>
              </span>
              <span className="text-slate-400 group-hover:text-seller-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>

            <Link
              to={`/stores/${store.id}/coupons`}
              onClick={() => setIsSettingsOpen(false)}
              className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-seller-500 hover:bg-seller-50/40 hover:text-seller-900 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-3">
                <Tag className="h-4.5 w-4.5 text-emerald-600" />
                <span>{t('couponsOffersManagement')}</span>
              </span>
              <span className="text-slate-400 group-hover:text-emerald-600 font-bold transition-transform group-hover:translate-x-1">➔</span>
            </Link>
            <Link to={`/stores/${store.id}/delivery-team`} onClick={() => setIsSettingsOpen(false)} className="group flex items-center justify-between rounded-xl bg-white p-3 text-xs font-bold text-slate-800 border border-slate-200/90 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all shadow-2xs">
              <span className="flex items-center gap-3"><Truck className="h-4.5 w-4.5 text-emerald-600"/><span>Delivery Team & Login</span></span><span>➔</span>
            </Link>
          </div>

          {/* 6. 👑 PRO ENTERPRISE SUITE (GOLD VIP) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-700 font-bold text-xs border border-amber-100">
                  👑
                </span>
                <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">{t('proEnterprise')}</span>
              </div>
              <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {t('vipSuite')}
              </span>
            </div>

            <div className="space-y-2">
              {/* 🌐 Vernacular Language Switcher */}
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false)
                  setIsLangModalOpen(true)
                }}
                className="w-full group flex items-center justify-between rounded-lg bg-white p-2.5 sm:p-3 text-xs font-semibold text-slate-800 border border-slate-200 hover:border-seller-300 hover:bg-seller-50/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-seller-600 shrink-0" />
                  <span className="font-semibold text-slate-800">{t('switchLangTitle')}</span>
                </span>
                <span className="text-[10px] font-semibold text-seller-700 flex items-center gap-0.5">
                  <span>{t('change')}</span> ➔
                </span>
              </button>

              {/* 1. Hindi Voice Soundbox Toggle */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-sm ${soundboxOn ? 'bg-seller-50 text-seller-700 border border-seller-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {soundboxOn ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-900 truncate">{t('hindiVoiceSoundbox')}</p>
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5 shrink-0">
                        <Crown className="h-2 w-2" /> PRO
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{t('speaksLiveOrders')}</p>
                  </div>
                </div>

                {/* Switch Toggle Button + Status Label */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${soundboxOn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {soundboxOn ? 'ON' : 'OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={toggleSoundbox}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${soundboxOn ? 'bg-seller-600' : 'bg-slate-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${soundboxOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* 2. Store Niche Theme Customizer (ACTIVE) */}
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false)
                  setShowThemeModal(true)
                }}
                className="w-full group flex items-center justify-between rounded-lg bg-white p-2.5 sm:p-3 text-xs font-semibold text-slate-800 border border-slate-200 hover:border-seller-300 hover:bg-seller-50/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Palette className="h-4 w-4 text-seller-600 shrink-0" />
                  <span className="font-semibold text-slate-800">{t('storeThemeCustomizer')}</span>
                </span>
                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5 shrink-0">
                  <Crown className="h-2.5 w-2.5" /> PRO
                </span>
              </button>

              {/* 3. AI WhatsApp Status Poster Button (ACTIVE) */}
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false)
                  setShowPosterModal(true)
                }}
                className="w-full group flex items-center justify-between rounded-lg bg-white p-2.5 sm:p-3 text-xs font-semibold text-slate-800 border border-slate-200 hover:border-seller-300 hover:bg-seller-50/50 transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-2.5">
                  <ImageIcon className="h-4 w-4 text-seller-600 shrink-0" />
                  <span>{t('aiPosterGenerator')}</span>
                </span>
                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5 shrink-0">
                  <Crown className="h-2.5 w-2.5" /> PRO
                </span>
              </button>

              {/* 4. AI Sales Copilot Button (LOCKED / DISABLED) */}
              <button
                type="button"
                disabled
                title="AI Copilot is currently locked."
                className="w-full flex items-center justify-between rounded-lg bg-slate-50 p-2.5 sm:p-3 text-xs font-medium text-slate-500 border border-slate-200 opacity-70 cursor-not-allowed text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>{t('aiSalesCopilot')}</span>
                </span>
                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 shrink-0">
                  <Lock className="h-2.5 w-2.5 text-slate-500" /> Locked
                </span>
              </button>

              {/* 5. Custom Domain & Brand (LOCKED / DISABLED) */}
              <button
                type="button"
                disabled
                title="Custom Domain mapping is currently locked."
                className="w-full flex items-center justify-between rounded-lg bg-slate-50 p-2.5 sm:p-3 text-xs font-medium text-slate-500 border border-slate-200 opacity-70 cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>{t('customDomainBrand')}</span>
                </div>
                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 shrink-0">
                  <Lock className="h-2.5 w-2.5 text-slate-500" /> Locked
                </span>
              </button>
            </div>
          </div>

          {/* 7. ⚙️ STORE PREFERENCES & VISIBILITY (MANAGE APP MODE) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-seller-600" />
                    <span>{t('manageAppMode')}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">{t('orderProcessingMode')}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black ${store.manage_in_app ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                  {store.manage_in_app ? 'APP SYSTEM (ON)' : 'WHATSAPP (OFF)'}
                </span>
              </div>

              {/* Segmented Control Pill */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => toggleManageInApp(true)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${store.manage_in_app
                    ? 'bg-seller-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  <span>{t('appSystemOn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleManageInApp(false)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${!store.manage_in_app
                    ? 'bg-seller-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  <span>{t('waDirect')}</span>
                </button>
              </div>

              <p className="text-[10.5px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-snug font-medium">
                {store.manage_in_app
                  ? t('appSystemDesc')
                  : '⚪ Customers order directly via WhatsApp messages.'}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
              <span className="text-xs font-bold text-slate-900">{t('storeVisibility')}</span>
              <button
                type="button"
                onClick={handleLiveToggleClick}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black cursor-pointer transition-all shadow-2xs ${store.is_published
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700 shadow-xs'
                  }`}
              >
                {store.is_published ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{t('liveClickToDraft')}</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 text-white" />
                    <span>{t('makeStoreLive')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 8. 🔔 REAL-TIME PUSH ALERTS */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-seller-600" />
                <span className="font-extrabold text-xs text-slate-900">{t('realtimePushAlerts')}</span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${notificationPermission === 'granted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-seller-100 text-seller-800 border border-seller-300'
                }`}>
                {notificationPermission === 'granted' ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 gap-2">
              <p className="text-[10.5px] text-slate-600 font-medium leading-snug">
                {notificationPermission === 'granted'
                  ? t('instantAlertsEnabled')
                  : 'Enable push alerts for order notifications.'}
              </p>

              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="shrink-0 rounded-xl bg-seller-600 px-3 py-1.5 text-xs font-black text-white hover:bg-seller-700 transition-all cursor-pointer shadow-2xs"
                >
                  Enable 🔔
                </button>
              ) : (
                <span className="shrink-0 text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {t('activeCheck')}
                </span>
              )}
            </div>
          </div>

          {/* 9. 🎧 PLATFORM TECHNICAL SUPPORT */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-seller-600" />
                <span className="font-extrabold text-xs text-slate-900">{t('technicalSupport')}</span>
              </div>
              <span className="rounded-full bg-seller-600 px-2 py-0.5 text-[9px] font-black text-white">24/7 LIVE</span>
            </div>

            <div className="space-y-1.5 pt-0.5">
              <a
                href="mailto:rahulkolhe90.rk.kr@gmail.com"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-seller-50/80 border border-slate-100 transition-all text-xs font-bold text-slate-800"
              >
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 text-seller-600 shrink-0" />
                  <span className="truncate">{t('emailSupport')}</span>
                </div>
                <span className="text-[9.5px] text-seller-600 font-extrabold shrink-0">{t('sendEmail')}</span>
              </a>

              <a
                href="tel:7796216506"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-emerald-50/80 border border-slate-100 transition-all text-xs font-bold text-slate-800"
              >
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{t('callSupport')} (+91 7796216506)</span>
                </div>
                <span className="text-[9.5px] text-emerald-600 font-extrabold">Call 📞</span>
              </a>

              <a
                href="https://wa.me/917796216506?text=Hi%20Apani%20Dukan%20Support,%20I%20need%20technical%20help%20with%20my%20store."
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-all text-xs font-extrabold text-[#075E54]"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
                  <span>{t('waLiveChat')}</span>
                </div>
                <span className="text-[9.5px] bg-[#25D366] text-white px-2 py-0.5 rounded-md font-black">Chat ➔</span>
              </a>
            </div>
          </div>

          <Link
            to={`/stores/${store.id}/privacy-policy`}
            onClick={() => setIsSettingsOpen(false)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:border-seller-300 hover:bg-seller-50/50"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-seller-100 bg-seller-50 text-seller-700">
                <FileText className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">Privacy Policy</span>
                <span className="mt-0.5 block text-[10px] font-medium text-slate-500">How Apani Dukan handles seller and customer data</span>
              </span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>

          {/* 10. 💳 ACTIVE SUBSCRIPTION */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold uppercase text-slate-800">{t('activeSubscription')}</span>
              </div>
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {subStatus?.plan_name || 'PREMIUM'} PLAN
              </span>
            </div>
            <Link
              to={`/stores/${store.id}/subscription`}
              onClick={() => setIsSettingsOpen(false)}
              className="w-full flex items-center justify-between rounded-lg bg-slate-50 hover:bg-seller-50 border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-seller-600" />
                <span>{t('managePlan')}</span>
              </div>
              <span className="text-[10px] font-bold text-seller-700">Open ➔</span>
            </Link>
          </div>

          {/* 11. Print Counter Standee */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false)
                setShowQrModal(true)
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-seller-600 py-2.5 text-xs font-semibold text-white hover:bg-seller-700 active:scale-[0.99] transition-colors shadow-xs cursor-pointer"
            >
              <span>{t('printQrStandee')}</span>
            </button>
          </div>

          {/* 12. Danger Zone — Account Deactivation */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 space-y-1">
            <p className="text-xs font-black text-red-800">{t('dangerZone')}</p>
            <p className="text-[11px] text-red-700 font-medium leading-tight">{t('deactivateSubtext')}</p>
            <button
              type="button"
              disabled={isDeactivating}
              onClick={() => { setDeactivateError(null); setShowDeactivateModal(true); }}
              className="mt-2 w-full rounded-xl border border-red-300 bg-white py-2 text-xs font-black text-red-700 hover:bg-red-100 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isDeactivating ? 'Deactivating...' : t('deactivateAccount')}
            </button>
          </div>
        </div>

        {/* Sticky Responsive Mobile Bottom Action Footer */}
        <div className="sticky bottom-0 shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg flex items-center gap-2 z-20">
          {store.slug && (
            <Link
              to={`/s/${store.slug}`}
              target="_blank"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-seller-200 bg-seller-50 py-2.5 px-3 text-xs font-black text-seller-700 hover:bg-seller-100 active:scale-95 transition-all shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-seller-600 shrink-0" />
              <span className="truncate">{t('openStorefront')}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => { auth.logout(); navigate('/login') }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 px-3 text-xs font-black text-rose-700 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-600 shrink-0" />
            <span className="truncate">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Unpublish Confirmation Dialogue Modal */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900 animate-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-seller-100 text-seller-600 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Take Store Offline?</h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                Aapki online dukaan DRAFT mode mein chali jayegi aur customers website link se store access nahi kar payenge. Kya aap offline karna chahte hain?
              </p>
            </div>

            {unpublishError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-left space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-black text-rose-900">Action Blocked</p>
                    <p className="text-[11px] font-semibold text-rose-800 leading-snug">{unpublishError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnpublishConfirm(false)
                    setUnpublishError(null)
                    setIsSettingsOpen(false)
                    if (store?.id) navigate(`/stores/${store.id}/orders`)
                  }}
                  className="w-full rounded-xl bg-rose-600 py-2 text-xs font-black text-white hover:bg-rose-700 active:scale-98 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  <span>View Pending Customer Orders</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnpublishConfirm(false)
                  setUnpublishError(null)
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-extrabold text-xs text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executePublish(false)}
                className="w-full py-2.5 rounded-xl bg-seller-600 font-extrabold text-xs text-white hover:bg-seller-700 transition-all cursor-pointer shadow-md"
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
          publicUrl={`${window.location.origin}/s/${store.slug}`}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* AI WhatsApp Poster Generator Modal */}
      {showPosterModal && store && (
        <StorePosterModal
          store={store}
          publicUrl={`${window.location.origin}/s/${store.slug}`}
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

      {/* Seller Fulfillment & Delivery Settings Modal */}
      {showDeliveryModal && store && (
        <SellerDeliveryConfigModal
          store={store}
          initialSection={deliveryModalSection}
          onSaveSuccess={() => {
            if (onStoreUpdate) onStoreUpdate()
          }}
          onClose={() => setShowDeliveryModal(false)}
        />
      )}

      {/* Seller Store Theme & Niche Customizer Modal */}
      {showThemeModal && store && (
        <SellerThemeCustomizerModal
          store={store}
          onSaveSuccess={() => {
            if (onStoreUpdate) onStoreUpdate()
          }}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {/* Seller Custom Domain Manager Modal */}
      {showCustomDomainModal && store && (
        <SellerCustomDomainModal
          store={store}
          onSaveSuccess={() => {
            if (onStoreUpdate) onStoreUpdate()
          }}
          onClose={() => setShowCustomDomainModal(false)}
        />
      )}

      {/* Seller Account Deactivation Clean Dialog Modal */}
      <SellerDeactivateModal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false)
          setDeactivateError(null)
        }}
        onConfirm={handleConfirmDeactivate}
        isDeactivating={isDeactivating}
        storeName={store?.name}
        errorMessage={deactivateError}
        onClearError={() => setDeactivateError(null)}
        onGoToOrders={() => {
          setShowDeactivateModal(false)
          setDeactivateError(null)
          setIsSettingsOpen(false)
          if (store?.id) navigate(`/stores/${store.id}/orders`)
        }}
      />

      {/* Language Switcher Modal with full-screen translation loading spinner */}
      <LanguageSwitcherModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
      />

      {/* Seller Onboarding Tour Guide Modal */}
      <SellerOnboardingGuideModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        storeId={store?.id}
        onDismissPermanently={() => {
          if (onStoreUpdate) onStoreUpdate()
        }}
      />

      {/* Global Floating AI Copilot Chatbot Icon (Draggable) - DISABLED */}
      {/* 
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ transform: `translate(${fabPos.x}px, ${fabPos.y}px)`, touchAction: 'none' }}
        className="fixed bottom-[150px] right-3 sm:bottom-[100px] sm:right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-seller-500 to-seller-400 text-white shadow-[0_4px_20px_rgba(20,184,166,0.4)] hover:scale-110 active:scale-95 transition-transform cursor-grab active:cursor-grabbing group"
        title="Seller AI Copilot"
      >
        <Sparkles className="h-6 w-6 animate-pulse group-hover:animate-none" />
      </button>
      */}
    </>
  )
}
