import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import {
  Tag, Plus, Trash2, CheckCircle2, XCircle, Percent,
  IndianRupee, Sparkles, AlertCircle, RefreshCw, ShoppingBag,
  Zap, Gift, Coins, Flame, ChevronRight, Check, ArrowRight, HelpCircle,
  MessageSquare, Users, Copy, Send
} from 'lucide-react'
import { ScratchCardConfig } from '../components/CustomerScratchCardModal'
import WhatsAppMarketingCrmModal from '../components/WhatsAppMarketingCrmModal'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'

type PromoTabType = 'coupons' | 'flash_sale' | 'loyalty' | 'scratch' | 'whatsapp'

export default function SellerCoupons() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(null)
  const [coupons, setCoupons] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Active Promo Hub Tab
  const [activeTab, setActiveTab] = useState<PromoTabType>('coupons')

  // Filter State for Coupons Tab
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')

  // Form State for Coupons
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENTAGE' | 'BOGO' | 'FREE_DELIVERY'>('FLAT')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('0')
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [productSearchQuery, setProductSearchQuery] = useState<string>('')

  // 🪙 Customer Loyalty Cashback State
  const [enableLoyaltyCashback, setEnableLoyaltyCashback] = useState<boolean>(true)
  const [loyaltyCashbackPercent, setLoyaltyCashbackPercent] = useState<number | string>(5)
  const [loyaltyMinOrderAmount, setLoyaltyMinOrderAmount] = useState<number | string>(0)
  const [savingCashback, setSavingCashback] = useState(false)
  const [cashbackSavedMsg, setCashbackSavedMsg] = useState('')

  // ⚡ Evening Flash Sale State
  const [flashSaleActive, setFlashSaleActive] = useState(() => {
    try {
      const cached = localStorage.getItem(`qs_flash_sale_${storeId}`)
      return cached ? JSON.parse(cached).active : false
    } catch {
      return false
    }
  })
  const [flashSaleDiscount, setFlashSaleDiscount] = useState<number>(() => {
    try {
      const cached = localStorage.getItem(`qs_flash_sale_${storeId}`)
      return cached ? JSON.parse(cached).discount || 25 : 25
    } catch {
      return 25
    }
  })
  const [flashSaleTitle, setFlashSaleTitle] = useState(() => {
    try {
      const cached = localStorage.getItem(`qs_flash_sale_${storeId}`)
      return cached ? JSON.parse(cached).title || 'Evening Clearance Sale' : 'Evening Clearance Sale'
    } catch {
      return 'Evening Clearance Sale'
    }
  })
  const [flashSaleMsg, setFlashSaleMsg] = useState('')

  const updateFlashSaleConfig = (active: boolean, discount: number, title: string) => {
    setFlashSaleActive(active)
    setFlashSaleDiscount(discount)
    setFlashSaleTitle(title)
    const payload = { active, discount, title }
    try {
      localStorage.setItem(`qs_flash_sale_${storeId}`, JSON.stringify(payload))
      if (store?.slug) {
        localStorage.setItem(`qs_flash_sale_${store.slug}`, JSON.stringify(payload))
      }
      localStorage.setItem('qs_flash_sale_global', JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('qs-flash-sale-updated', { detail: payload }))
      setFlashSaleMsg(active ? '⚡ Flash Sale is LIVE!' : '⚪ Flash Sale turned OFF.')
      setTimeout(() => setFlashSaleMsg(''), 3000)
    } catch {}
  }

  // 🎁 Customer Scratch & Win Welcome Gift Card State
  const [scratchConfig, setScratchConfig] = useState<ScratchCardConfig>(() => {
    try {
      const saved = localStorage.getItem(`qs_scratch_config_${storeId}`)
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
  const [scratchSavedMsg, setScratchSavedMsg] = useState('')
  const [showWhatsAppCrmModal, setShowWhatsAppCrmModal] = useState(false)
  const [customersList, setCustomersList] = useState<any[]>([])

  const fetchCustomersForCrm = async () => {
    try {
      const [whatsappOrdersRes, standardOrdersRes] = await Promise.all([
        api.get(`/seller/stores/${storeId}/whatsapp-orders/`).catch(() => ({ data: [] })),
        api.get('/orders/').catch(() => ({ data: [] }))
      ])

      const rawOrders = [
        ...(Array.isArray(whatsappOrdersRes.data) ? whatsappOrdersRes.data : (whatsappOrdersRes.data?.results || [])),
        ...(Array.isArray(standardOrdersRes.data) ? standardOrdersRes.data : (standardOrdersRes.data?.results || []))
      ]

      const storeOrders = rawOrders.filter((o: any) => !o.store || String(o.store) === String(storeId))

      const map: { [key: string]: any } = {}
      storeOrders.forEach((o: any) => {
        const phone = (o.customer_phone || '').trim()
        const name = (o.customer_name || '').trim()
        const key = phone || name || `order_${o.id}`
        if (!map[key]) {
          map[key] = {
            phone: phone,
            name: name || 'Customer',
            ordersCount: 0,
            totalSpent: 0,
            lastOrderDate: o.created_at
          }
        }
        map[key].ordersCount += 1
        map[key].totalSpent += parseFloat(o.total) || 0
      })

      const list = Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent)
      setCustomersList(list)
    } catch (err) {
      console.error(err)
    }
  }

  // 📲 In-page WhatsApp Marketing Tab State
  const [whatsappSegment, setWhatsappSegment] = useState<'VIP' | 'LAPSED' | 'NEW' | 'ALL'>('VIP')
  const [whatsappCoupon, setWhatsappCoupon] = useState<string>('WELCOME50')
  const [whatsappDiscountText, setWhatsappDiscountText] = useState('15% OFF')
  const [whatsappNote, setWhatsappNote] = useState('Special exclusive gift for you on your next order!')
  const [whatsappCopiedMsg, setWhatsappCopiedMsg] = useState(false)
  const [whatsappCopiedPhones, setWhatsappCopiedPhones] = useState(false)

  const handleSelectWhatsappSegment = (seg: 'VIP' | 'LAPSED' | 'NEW' | 'ALL') => {
    setWhatsappSegment(seg)
    if (seg === 'VIP') {
      setWhatsappDiscountText('FLAT 20% OFF')
      setWhatsappNote('Thank you for being our VIP customer! Enjoy this special offer.')
    } else if (seg === 'LAPSED') {
      setWhatsappDiscountText('FLAT 15% OFF')
      setWhatsappNote('We missed you! It’s been a while since your last order.')
    } else if (seg === 'NEW') {
      setWhatsappDiscountText('FLAT 10% OFF')
      setWhatsappNote('Thank you for shopping with us! Here is a welcome bonus.')
    } else {
      setWhatsappDiscountText('SPECIAL OFFER')
      setWhatsappNote('Check out our new arrivals & exclusive deals today!')
    }
  }

  const buildWhatsappTabMessage = (customerName?: string) => {
    const nameStr = customerName ? `Hi ${customerName}!` : 'Hello!'
    const storeLink = `${window.location.origin}/store/${store?.slug || ''}`
    const couponStr = whatsappCoupon ? `\n🎟️ Use Coupon Code: *${whatsappCoupon}*` : ''

    return [
      `${nameStr} 🛍️ *Special Offer from ${store?.name || 'our store'}*`,
      ``,
      `🎉 *${whatsappDiscountText}* on your entire cart!`,
      `${whatsappNote}`,
      `${couponStr}`,
      ``,
      `🛒 Shop Online Directly Here:`,
      `${storeLink}`,
      ``,
      `⏱️ Express Doorstep Delivery & COD Available.`
    ].join('\n')
  }

  const handleSaveScratchConfig = (newConfig: ScratchCardConfig) => {
    setScratchConfig(newConfig)
    try {
      localStorage.setItem(`qs_scratch_config_${storeId}`, JSON.stringify(newConfig))
      if (store?.slug) {
        localStorage.setItem(`qs_scratch_config_${store.slug}`, JSON.stringify(newConfig))
      }
      setScratchSavedMsg('🎁 Scratch Card settings updated!')
      setTimeout(() => setScratchSavedMsg(''), 4000)
    } catch {}
  }

  const fetchStoreData = async () => {
    try {
      const res = await api.get('/stores/')
      const found = res.data.results?.find((s: any) => String(s.id) === String(storeId)) || res.data.find?.((s: any) => String(s.id) === String(storeId)) || res.data[0]
      if (found) {
        setStore(found)
        setEnableLoyaltyCashback(found.enable_loyalty_cashback ?? true)
        setLoyaltyCashbackPercent(found.loyalty_cashback_percent ?? 5)
        setLoyaltyMinOrderAmount(found.loyalty_min_order_amount ?? 0)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveCashbackSettings = async () => {
    try {
      setSavingCashback(true)
      const payload = {
        enable_loyalty_cashback: enableLoyaltyCashback,
        loyalty_cashback_percent: Number(loyaltyCashbackPercent) || 0,
        loyalty_min_order_amount: Number(loyaltyMinOrderAmount) || 0,
      }
      const res = await api.patch(`/stores/${storeId}/`, payload)
      setStore(res.data)
      setCashbackSavedMsg('🪙 Cashback settings saved!')
      setTimeout(() => setCashbackSavedMsg(''), 4000)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update cashback settings.')
    } finally {
      setSavingCashback(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/')
      const list = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setProducts(list.filter((p: any) => String(p.store) === String(storeId)))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await api.get('/coupons/')
      const list = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setCoupons(list.filter((c: any) => String(c.store) === String(storeId)))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStoreData()
    fetchProducts()
    fetchCoupons()
    fetchCustomersForCrm()
  }, [storeId])

  const openCreateModal = () => {
    setEditingCoupon(null)
    setCode('')
    setDiscountType('FLAT')
    setDiscountValue('')
    setMinOrderAmount('0')
    setMaxDiscountAmount('')
    setSelectedProductId('')
    setProductSearchQuery('')
    setError('')
    setCreateModalOpen(true)
  }

  // Quick Preset Helper for Coupons
  const applyCouponPreset = (presetCode: string, type: 'FLAT' | 'PERCENTAGE' | 'BOGO' | 'FREE_DELIVERY', val: string, minOrd: string) => {
    setCode(presetCode)
    setDiscountType(type)
    setDiscountValue(val)
    setMinOrderAmount(minOrd)
  }

  const openEditModal = (coupon: any) => {
    setEditingCoupon(coupon)
    setCode(coupon.code || '')
    setDiscountType(coupon.discount_type || 'FLAT')
    setDiscountValue(String(coupon.discount_value || ''))
    setMinOrderAmount(String(coupon.min_order_amount || '0'))
    setMaxDiscountAmount(coupon.max_discount_amount ? String(coupon.max_discount_amount) : '')
    setSelectedProductId(coupon.product_id ? String(coupon.product_id) : (coupon.product ? String(coupon.product) : ''))
    setProductSearchQuery('')
    setError('')
    setCreateModalOpen(true)
  }

  const handleSaveCoupon = async (e: React.FormEvent, isPublished: boolean) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Coupon code is required.')
      return
    }
    if (discountType !== 'BOGO' && discountType !== 'FREE_DELIVERY') {
      if (!discountValue || Number(discountValue) <= 0) {
        setError('Valid discount value is required.')
        return
      }
    }

    setError('')
    setSaving(true)

    const payload = {
      store: Number(storeId),
      product_id: selectedProductId ? Number(selectedProductId) : null,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue ? Number(discountValue) : 0,
      min_order_amount: Number(minOrderAmount || 0),
      max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      is_active: isPublished
    }

    try {
      if (editingCoupon) {
        await api.patch(`/coupons/${editingCoupon.id}/`, payload)
        setSuccessMsg(`Coupon "${code.toUpperCase()}" updated as ${isPublished ? 'ACTIVE' : 'DRAFT'}!`)
      } else {
        await api.post('/coupons/', payload)
        setSuccessMsg(`Coupon "${code.toUpperCase()}" created as ${isPublished ? 'ACTIVE' : 'DRAFT'}!`)
      }

      setEditingCoupon(null)
      setCode('')
      setDiscountValue('')
      setMinOrderAmount('0')
      setMaxDiscountAmount('')
      setSelectedProductId('')
      setCreateModalOpen(false)
      fetchCoupons()

      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.code?.[0] || 'Failed to save coupon.')
    } finally {
      setSaving(false)
    }
  }

  const toggleCouponStatus = async (coupon: any) => {
    try {
      const nextStatus = !coupon.is_active
      await api.patch(`/coupons/${coupon.id}/`, { is_active: nextStatus })
      setSuccessMsg(`Coupon "${coupon.code}" moved to ${nextStatus ? 'ACTIVE' : 'DRAFT'}!`)
      fetchCoupons()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return
    try {
      await api.delete(`/coupons/${id}/`)
      fetchCoupons()
    } catch (err) {
      console.error(err)
    }
  }

  const publishedCoupons = coupons.filter(c => c.is_active)
  const draftCoupons = coupons.filter(c => !c.is_active)
  const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0)

  const filteredCoupons = coupons.filter(c => {
    if (statusFilter === 'PUBLISHED') return c.is_active
    if (statusFilter === 'DRAFT') return !c.is_active
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-14 sm:pb-16">
      {store && <SellerHeader store={store} activeTabTitle="Promotions & Growth Hub" onStoreUpdate={fetchStoreData} />}

      {/* 100% FULL-WIDTH CONTAINER LIKE SETUP / STOREMANAGER TAB */}
      <main className="w-full p-2.5 sm:p-6 space-y-3 sm:space-y-6">
        
        {/* 🌟 PWA & WEB ADAPTIVE HERO BANNER (ULTRA-SMALL ANDROID CARD / RICH DESKTOP BANNER) */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-2.5 sm:p-6 lg:p-8 text-white border border-indigo-900/60 shadow-xs sm:shadow-md">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

          {/* Top Row: Title + Action Button */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 text-[10px] sm:text-sm shrink-0">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-lg lg:text-2xl font-black text-white tracking-tight truncate">
                  Promotions Hub
                </h1>
                <p className="text-[9px] sm:text-xs text-indigo-300 font-bold truncate">
                  Discounts, Flash Sale, Coins & Gifts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center gap-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 px-2.5 sm:px-5 py-1.5 sm:py-2.5 text-[10px] sm:text-xs font-black text-white shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>+ New Coupon</span>
            </button>
          </div>

          {/* ⚡ 5-PILLAR LIVE STATUS SNAPSHOT (2-COL / 3-COL / 5-COL RESPONSIVE GRID) */}
          <div className="mt-2 pt-2 sm:mt-5 sm:pt-4 border-t border-indigo-800/40 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2.5">
            {/* Pill 1: Coupons */}
            <button
              type="button"
              onClick={() => setActiveTab('coupons')}
              className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-indigo-600/35 border-indigo-400 shadow-xs ring-1 ring-indigo-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-indigo-300 flex items-center gap-1 truncate">
                  <Tag className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">1. Coupons</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-black text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-500/30 shrink-0">
                  {publishedCoupons.length} LIVE
                </span>
              </div>
              <p className="text-[9px] sm:text-xs font-black text-white mt-0.5 truncate">
                {coupons.length} Codes
              </p>
            </button>

            {/* Pill 2: Flash Sale */}
            <button
              type="button"
              onClick={() => setActiveTab('flash_sale')}
              className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'flash_sale'
                  ? 'bg-rose-600/35 border-rose-400 shadow-xs ring-1 ring-rose-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-rose-300 flex items-center gap-1 truncate">
                  <Zap className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">2. Flash</span>
                </span>
                <span className={`text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded border shrink-0 ${
                  flashSaleActive ? 'bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {flashSaleActive ? `${flashSaleDiscount}%` : 'OFF'}
                </span>
              </div>
              <p className="text-[9px] sm:text-xs font-black text-white mt-0.5 truncate">
                {flashSaleActive ? 'Clearance 🔥' : 'Sale OFF'}
              </p>
            </button>

            {/* Pill 3: Loyalty Coins */}
            <button
              type="button"
              onClick={() => setActiveTab('loyalty')}
              className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'loyalty'
                  ? 'bg-amber-600/35 border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-300 flex items-center gap-1 truncate">
                  <Coins className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">3. Coins</span>
                </span>
                <span className={`text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded border shrink-0 ${
                  enableLoyaltyCashback ? 'bg-amber-950 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {enableLoyaltyCashback ? `${loyaltyCashbackPercent}%` : 'OFF'}
                </span>
              </div>
              <p className="text-[9px] sm:text-xs font-black text-white mt-0.5 truncate">
                {enableLoyaltyCashback ? 'Cashback ON' : 'Coins OFF'}
              </p>
            </button>

            {/* Pill 4: Scratch Card */}
            <button
              type="button"
              onClick={() => setActiveTab('scratch')}
              className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'scratch'
                  ? 'bg-purple-600/35 border-purple-400 shadow-xs ring-1 ring-purple-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-purple-300 flex items-center gap-1 truncate">
                  <Gift className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">4. Gift</span>
                </span>
                <span className={`text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded border shrink-0 ${
                  scratchConfig.enabled ? 'bg-purple-950 text-purple-300 border-purple-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {scratchConfig.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[9px] sm:text-xs font-black text-white mt-0.5 truncate">
                {scratchConfig.enabled ? scratchConfig.couponCode : 'Popup OFF'}
              </p>
            </button>

            {/* Pill 5: WhatsApp Blast */}
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`col-span-2 sm:col-span-1 p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600/35 border-emerald-400 shadow-xs ring-1 ring-emerald-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-300 flex items-center gap-1 truncate">
                  <MessageSquare className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">5. WhatsApp</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-black text-emerald-300 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-500/40 shrink-0">
                  {customersList.length} Buyers
                </span>
              </div>
              <p className="text-[9px] sm:text-xs font-black text-white mt-0.5 truncate">
                Offer Blast 🚀
              </p>
            </button>
          </div>
        </div>

        {/* 🚀 PROMINENT 1-CLICK WHATSAPP OFFER BROADCAST ACTION BANNER */}
        <div className="rounded-xl sm:rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-950 p-3 sm:p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-sm sm:text-lg border border-emerald-400/30 shadow-xs">
              📲
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black text-white truncate">
                  Instant WhatsApp Offer Broadcast
                </h2>
                <span className="rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black uppercase">
                  🚀 3x Repeat Orders
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-teal-300/90 font-medium truncate">
                Send active store coupons ({publishedCoupons.length} live) directly to customer WhatsApp in 1-Click!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-400/50 px-3 py-2 text-xs font-black text-emerald-200 transition-all cursor-pointer"
            >
              <span>View Offers Studio ↓</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await fetchCustomersForCrm()
                setShowWhatsAppCrmModal(true)
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-black text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              <span>🚀 1-Click Broadcast</span>
            </button>
          </div>
        </div>

        {/* Global Toast Messages */}
        {successMsg && (
          <div className="rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-300 p-2.5 sm:p-3 text-[11px] sm:text-xs font-bold text-emerald-900 flex items-center justify-between animate-fade-in shadow-xs">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-700 font-black text-xs ml-2">✕</button>
          </div>
        )}

        {/* 🎛️ SEGMENTED NAVIGATION TABS (COMPACT ANDROID SCROLL SNAP) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 border-b border-slate-200 no-scrollbar snap-x snap-mandatory">
          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all shrink-0 cursor-pointer snap-start ${
              activeTab === 'coupons'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>1. Coupons ({coupons.length})</span>
            {publishedCoupons.length > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black border ${
                activeTab === 'coupons' ? 'bg-white/20 text-white border-white/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {publishedCoupons.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flash_sale')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all shrink-0 cursor-pointer snap-start ${
              activeTab === 'flash_sale'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>2. Flash Sale</span>
            {flashSaleActive && (
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black border ${
                activeTab === 'flash_sale' ? 'bg-white/20 text-white border-white/30' : 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
              }`}>
                {flashSaleDiscount}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('loyalty')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all shrink-0 cursor-pointer snap-start ${
              activeTab === 'loyalty'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>3. Cashback</span>
            {enableLoyaltyCashback && (
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black border ${
                activeTab === 'loyalty' ? 'bg-white/20 text-white border-white/30' : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {loyaltyCashbackPercent}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scratch')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all shrink-0 cursor-pointer snap-start ${
              activeTab === 'scratch'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>4. Welcome Gift</span>
            {scratchConfig.enabled && (
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black border ${
                activeTab === 'scratch' ? 'bg-white/20 text-white border-white/30' : 'bg-purple-100 text-purple-800 border-purple-200'
              }`}>
                ON
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all shrink-0 cursor-pointer snap-start ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>5. WhatsApp Offers</span>
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black border ${
              activeTab === 'whatsapp' ? 'bg-white/20 text-white border-white/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}>
              {customersList.length}
            </span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: 🎟️ STORE COUPONS MANAGEMENT */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'coupons' && (
          <div className="space-y-2.5 sm:space-y-5 animate-fade-in">
            {/* Simple How-it-Works Hint */}
            <div className="rounded-lg sm:rounded-xl bg-indigo-50/70 border border-indigo-200 p-2.5 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-xs shrink-0">
                  💡
                </span>
                <div>
                  <p className="font-extrabold text-indigo-950 text-[11px] sm:text-xs">How Coupons Work:</p>
                  <p className="text-indigo-800 font-medium text-[10px] sm:text-[11px]">
                    Customers enter your coupon code at checkout to get an instant discount (e.g. Flat ₹50 OFF or 10% OFF).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] sm:text-xs font-black text-white hover:bg-indigo-700 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="h-3 w-3" />
                <span>+ Create Coupon</span>
              </button>
            </div>

            {/* Stats Summary Grid (Compact on Mobile) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-lg sm:rounded-2xl bg-white border border-emerald-200 p-2.5 sm:p-4 space-y-0.5 shadow-xs text-center sm:text-left">
                <p className="text-[9px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-tight truncate">🟢 Active</p>
                <p className="text-base sm:text-2xl font-black text-emerald-600">{publishedCoupons.length}</p>
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-medium hidden sm:block">Live for customers</p>
              </div>
              <div className="rounded-lg sm:rounded-2xl bg-white border border-amber-200 p-2.5 sm:p-4 space-y-0.5 shadow-xs text-center sm:text-left">
                <p className="text-[9px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-tight truncate">🟡 Drafts</p>
                <p className="text-base sm:text-2xl font-black text-amber-600">{draftCoupons.length}</p>
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-medium hidden sm:block">Hidden (Not live)</p>
              </div>
              <div className="rounded-lg sm:rounded-2xl bg-white border border-indigo-200 p-2.5 sm:p-4 space-y-0.5 shadow-xs text-center sm:text-left">
                <p className="text-[9px] sm:text-[11px] font-bold text-indigo-700 uppercase tracking-tight truncate">Times Used</p>
                <p className="text-base sm:text-2xl font-black text-indigo-600">{totalUsage}</p>
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-medium hidden sm:block">Orders placed</p>
              </div>
            </div>

            {/* Coupons List Section */}
            <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200 p-3 sm:p-5 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <h2 className="text-xs sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
                  <span>Store Coupons ({filteredCoupons.length})</span>
                </h2>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({coupons.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PUBLISHED')}
                    className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                      statusFilter === 'PUBLISHED'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟢 Active ({publishedCoupons.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('DRAFT')}
                    className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                      statusFilter === 'DRAFT'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟡 Drafts ({draftCoupons.length})
                  </button>
                  <button
                    onClick={fetchCoupons}
                    className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
                    title="Refresh List"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-500 text-xs font-medium">Loading store coupons…</div>
              ) : filteredCoupons.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <span className="text-2xl sm:text-3xl">🏷️</span>
                  <p className="text-xs font-bold text-slate-700">
                    {statusFilter === 'PUBLISHED' ? 'No active coupons' : statusFilter === 'DRAFT' ? 'No draft coupons' : 'No coupons created yet'}
                  </p>
                  <p className="text-[10px] text-slate-500">Create discount coupons to give customers a deal!</p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-1 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create First Coupon</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
                  {filteredCoupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className={`rounded-xl border p-3 space-y-2.5 transition-all relative ${
                        coupon.is_active
                          ? 'bg-white border-emerald-300 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-black text-xs tracking-wider">
                            {coupon.code}
                          </span>
                          <p className="mt-1 text-xs font-extrabold flex items-center gap-1">
                            {coupon.discount_type === 'BOGO' ? (
                              <span className="text-purple-600 font-black flex items-center gap-1">
                                🎁 BOGO (Buy 1 Get 1 Free)
                              </span>
                            ) : coupon.discount_type === 'FREE_DELIVERY' ? (
                              <span className="text-sky-600 font-black flex items-center gap-1">
                                🚚 Free Doorstep Delivery
                              </span>
                            ) : coupon.discount_type === 'PERCENTAGE' ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                <span>{coupon.discount_value}% OFF</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                <span>FLAT ₹{coupon.discount_value} OFF</span>
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0 ${
                          coupon.is_active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {coupon.is_active ? <>🟢 ACTIVE</> : <>🟡 DRAFT</>}
                        </span>
                      </div>

                      {/* Applicable Scope */}
                      <div className="rounded-md bg-slate-50 p-1.5 border border-slate-200 text-[10px]">
                        <p className="text-[8px] font-extrabold text-slate-500 uppercase">Applies To:</p>
                        {coupon.product_name ? (
                          <p className="text-indigo-700 font-bold flex items-center gap-1 mt-0.5 truncate text-[10px]">
                            <ShoppingBag className="h-2.5 w-2.5 text-indigo-600 shrink-0" />
                            <span className="truncate">Only: {coupon.product_name}</span>
                          </p>
                        ) : (
                          <p className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5 text-[10px]">
                            <span>🌐</span>
                            <span>All Products in Store</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-0.5 text-[10px] text-slate-600 border-t border-slate-100 pt-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Min Order:</span>
                          <strong className="text-slate-900 font-black">₹{coupon.min_order_amount || 0}</strong>
                        </div>
                        {coupon.discount_type === 'PERCENTAGE' && coupon.max_discount_amount && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Max Discount:</span>
                            <strong className="text-slate-900 font-black">₹{coupon.max_discount_amount}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Times Used:</span>
                          <strong className="text-indigo-600 font-black">{coupon.usage_count || 0} orders</strong>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => openEditModal(coupon)}
                          className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200 flex items-center gap-1 cursor-pointer"
                        >
                          <span>✏️ Edit</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleCouponStatus(coupon)}
                            className={`px-2 py-1 rounded-md text-[9px] font-black transition-all cursor-pointer ${
                              coupon.is_active
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {coupon.is_active ? 'Pause' : '🚀 Make Active'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="text-rose-600 p-1 rounded-md bg-rose-50 border border-rose-200 cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: ⚡ EVENING FLASH CLEARANCE SALE (ANDROID COMPACT) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'flash_sale' && (
          <div className="space-y-2.5 sm:space-y-5 animate-fade-in">
            <div className="rounded-lg sm:rounded-xl bg-rose-50/70 border border-rose-200 p-2.5 sm:p-3 flex items-center gap-2 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-600 text-white font-bold text-xs shrink-0">
                ⚡
              </span>
              <div>
                <p className="font-extrabold text-rose-950 text-[11px] sm:text-xs">How Flash Sale Works:</p>
                <p className="text-rose-800 font-medium text-[10px] sm:text-[11px]">
                  Turn this ON during evening stock clearance. A glowing red banner appears on your store, and all items get an automatic discount!
                </p>
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl bg-white border border-rose-200 p-3.5 sm:p-6 space-y-3.5 shadow-xs text-slate-900 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-rose-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg text-base sm:text-xl font-black shadow-xs ${
                    flashSaleActive ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-100 text-rose-600 border border-rose-200'
                  }`}>
                    ⚡
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-base font-black text-slate-900">Urgent Flash Sale</h2>
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                        flashSaleActive 
                          ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {flashSaleActive ? `${flashSaleDiscount}% LIVE` : 'OFF'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-tight">
                      Automatic flat discount across entire store without any promo code.
                    </p>
                  </div>
                </div>

                {/* Compact Switch Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                  <span className={`text-[10px] sm:text-xs font-black ${flashSaleActive ? 'text-rose-600' : 'text-slate-500'}`}>
                    {flashSaleActive ? '⚡ Flash Sale ON' : '⚪ Sale OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateFlashSaleConfig(!flashSaleActive, flashSaleDiscount, flashSaleTitle)}
                    className={`relative inline-flex h-5 w-10 sm:h-6 sm:w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                      flashSaleActive ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        flashSaleActive ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {flashSaleMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-300 p-2 text-[11px] font-black text-rose-900 animate-fade-in flex items-center justify-between">
                  <span>{flashSaleMsg}</span>
                  <button onClick={() => setFlashSaleMsg('')} className="text-rose-700">✕</button>
                </div>
              )}

              {/* Controls & Simulator */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                  <h3 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Set Discount Percentage
                  </h3>

                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-700">
                      Select Discount (%):
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[10, 15, 20, 25, 30, 40, 50].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => updateFlashSaleConfig(flashSaleActive, d, flashSaleTitle)}
                          className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                            flashSaleDiscount === d
                              ? 'bg-rose-600 text-white shadow-xs scale-105'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {d}% OFF
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="text-[10px] sm:text-xs font-bold text-slate-700">
                      Banner Heading (Customer view):
                    </label>
                    <input
                      type="text"
                      value={flashSaleTitle}
                      onChange={(e) => updateFlashSaleConfig(flashSaleActive, flashSaleDiscount, e.target.value)}
                      placeholder="e.g. Evening Clearance Sale"
                      className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Simulator */}
                <div className="space-y-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="h-3 w-3 text-rose-600" />
                      <span>Live Customer Banner Preview</span>
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                      Customers opening your shop see this animated top banner:
                    </p>

                    <div className="mt-2 rounded-lg border border-rose-500/50 bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 p-2.5 text-white shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-rose-200 font-black animate-bounce text-[10px] shrink-0">
                            ⚡
                          </span>
                          <div>
                            <p className="text-[10px] sm:text-xs font-black tracking-wide text-white leading-tight">
                              {flashSaleTitle || 'EVENING FLASH CLEARANCE!'}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-rose-200">
                              Flat {flashSaleDiscount}% discount applied directly in cart!
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 bg-white text-rose-900 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase">
                          {flashSaleDiscount}% OFF
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[9px] sm:text-[10px] text-slate-500 font-medium">
                    Status: {flashSaleActive ? <strong className="text-emerald-700">🟢 Broadcaster Active</strong> : <strong className="text-slate-400">⚪ Inactive</strong>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: 🪙 STORE LOYALTY COINS & CASHBACK (ANDROID COMPACT) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'loyalty' && (
          <div className="space-y-2.5 sm:space-y-5 animate-fade-in">
            <div className="rounded-lg sm:rounded-xl bg-amber-50/70 border border-amber-200 p-2.5 sm:p-3 flex items-center gap-2 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-slate-950 font-bold text-xs shrink-0">
                🪙
              </span>
              <div>
                <p className="font-extrabold text-amber-950 text-[11px] sm:text-xs">How Cashback Coins Work:</p>
                <p className="text-amber-900 font-medium text-[10px] sm:text-[11px]">
                  Customers earn coins on every purchase (1 Coin = ₹1 Rupee). Next time they order, they use coins for a discount!
                </p>
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl bg-white border border-amber-200 p-3.5 sm:p-6 space-y-3.5 shadow-xs text-slate-900 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-slate-950 text-base sm:text-xl font-black shadow-xs">
                    🪙
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-base font-black text-slate-900">Cashback Coins Program</h2>
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                        enableLoyaltyCashback 
                          ? 'bg-amber-100 text-amber-800 border-amber-300' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {enableLoyaltyCashback ? `${loyaltyCashbackPercent}% Active` : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-tight">
                      Give automatic cashback coins on orders to keep customers coming back.
                    </p>
                  </div>
                </div>

                {/* Compact Switch Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                  <span className={`text-[10px] sm:text-xs font-black ${enableLoyaltyCashback ? 'text-amber-700' : 'text-slate-500'}`}>
                    {enableLoyaltyCashback ? '🪙 Cashback ON' : '⚪ Cashback OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEnableLoyaltyCashback(!enableLoyaltyCashback)}
                    className={`relative inline-flex h-5 w-10 sm:h-6 sm:w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                      enableLoyaltyCashback ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        enableLoyaltyCashback ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {cashbackSavedMsg && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2 text-[11px] font-black text-emerald-900 animate-fade-in flex items-center justify-between">
                  <span>🎉 {cashbackSavedMsg}</span>
                  <button onClick={() => setCashbackSavedMsg('')} className="text-emerald-700">✕</button>
                </div>
              )}

              {/* Loyalty Config Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] sm:text-xs font-bold text-slate-800">
                        Cashback Rate (% of order):
                      </label>
                      <span className="font-mono font-black text-[10px] sm:text-xs text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                        {loyaltyCashbackPercent}% Cashback
                      </span>
                    </div>

                    {/* Quick percentage pills */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 2, 5, 8, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setLoyaltyCashbackPercent(pct)}
                          className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                            Number(loyaltyCashbackPercent) === pct
                              ? 'bg-amber-500 text-slate-950 shadow-xs scale-105'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pct === 0 ? '0%' : `${pct}% ${pct === 5 ? '⭐' : ''}`}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="0.5"
                        value={loyaltyCashbackPercent}
                        onChange={(e) => setLoyaltyCashbackPercent(e.target.value)}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.5"
                          value={loyaltyCashbackPercent}
                          onChange={(e) => setLoyaltyCashbackPercent(e.target.value)}
                          className="w-14 rounded-lg border border-slate-300 bg-white p-1 text-center text-xs font-black text-amber-900 focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-slate-500">%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-800">
                      Minimum Order for Cashback (₹):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={loyaltyMinOrderAmount}
                      onChange={(e) => setLoyaltyMinOrderAmount(e.target.value)}
                      placeholder="0 = All orders"
                      className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Simulator & Save */}
                <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] sm:text-xs font-black text-amber-800 uppercase tracking-wider">
                      💡 Example Calculation for Customer
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                      If a customer buys items worth <strong className="text-slate-900 font-black">₹1,000</strong>:
                    </p>
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🪙</span>
                        <div>
                          <p className="text-xs sm:text-sm font-black text-amber-950">
                            Customer Earns: +₹{((1000 * (Number(loyaltyCashbackPercent) || 0)) / 100).toFixed(0)} Coins
                          </p>
                          <p className="text-[8px] sm:text-[9px] text-amber-800 font-medium">
                            Deducts ₹{((1000 * (Number(loyaltyCashbackPercent) || 0)) / 100).toFixed(0)} on next order
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveCashbackSettings}
                      disabled={savingCashback}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-4 py-2 text-xs font-black text-slate-950 shadow-xs hover:brightness-110 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{savingCashback ? 'Saving...' : 'Save Cashback Settings'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: 🎁 CUSTOMER SCRATCH & WIN WELCOME GIFT CARD (ANDROID COMPACT) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'scratch' && (
          <div className="space-y-2.5 sm:space-y-5 animate-fade-in">
            <div className="rounded-lg sm:rounded-xl bg-purple-50/70 border border-purple-200 p-2.5 sm:p-3 flex items-center gap-2 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600 text-white font-bold text-xs shrink-0">
                🎁
              </span>
              <div>
                <p className="font-extrabold text-purple-950 text-[11px] sm:text-xs">How Welcome Scratch Gift Works:</p>
                <p className="text-purple-900 font-medium text-[10px] sm:text-[11px]">
                  When a new person opens your shop website for the first time, a scratch card pops up giving them a welcome coupon!
                </p>
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl bg-white border border-purple-200 p-3.5 sm:p-6 space-y-3.5 shadow-xs text-slate-900 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg text-base sm:text-xl font-black shadow-xs ${
                    scratchConfig.enabled ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600 border border-purple-200'
                  }`}>
                    🎁
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-base font-black text-slate-900">Welcome Scratch Gift</h2>
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                        scratchConfig.enabled 
                          ? 'bg-purple-100 text-purple-800 border-purple-300' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {scratchConfig.enabled ? 'Welcome Gift ON' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-tight">
                      Turns 1st-time visitors into buyers with an interactive scratch reward.
                    </p>
                  </div>
                </div>

                {/* Compact Switch Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                  <span className={`text-[10px] sm:text-xs font-black ${scratchConfig.enabled ? 'text-purple-700' : 'text-slate-500'}`}>
                    {scratchConfig.enabled ? '🎁 Gift Card ON' : '⚪ Gift Card OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveScratchConfig({ ...scratchConfig, enabled: !scratchConfig.enabled })}
                    className={`relative inline-flex h-5 w-10 sm:h-6 sm:w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                      scratchConfig.enabled ? 'bg-purple-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        scratchConfig.enabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {scratchSavedMsg && (
                <div className="rounded-lg bg-purple-50 border border-purple-300 p-2 text-[11px] font-black text-purple-900 animate-fade-in flex items-center justify-between">
                  <span>{scratchSavedMsg}</span>
                  <button onClick={() => setScratchSavedMsg('')} className="text-purple-700">✕</button>
                </div>
              )}

              {/* Controls & Mockup */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
                <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                  <h3 className="text-[10px] sm:text-xs font-black text-purple-800 uppercase tracking-wider">
                    ⚙️ Gift Details
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-slate-800">Coupon Code:</label>
                      <input
                        type="text"
                        value={scratchConfig.couponCode}
                        onChange={(e) => handleSaveScratchConfig({ ...scratchConfig, couponCode: e.target.value.toUpperCase().trim() })}
                        placeholder="LUCKY50"
                        className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-black font-mono text-purple-800 focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-slate-800">Min Order (₹):</label>
                      <input
                        type="number"
                        min="0"
                        value={scratchConfig.minOrder}
                        onChange={(e) => handleSaveScratchConfig({ ...scratchConfig, minOrder: Number(e.target.value) })}
                        placeholder="299"
                        className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-800">
                      {scratchConfig.discountType === 'fixed' ? 'Discount Amount (₹)' : 'Discount (%)'}:
                    </label>
                    <div className="flex gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleSaveScratchConfig({ ...scratchConfig, discountType: scratchConfig.discountType === 'fixed' ? 'percentage' : 'fixed' })}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-[10px] font-black text-slate-700"
                      >
                        {scratchConfig.discountType === 'fixed' ? '₹ Flat' : '% Off'}
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={scratchConfig.discountValue}
                        onChange={(e) => handleSaveScratchConfig({ ...scratchConfig, discountValue: Number(e.target.value) })}
                        placeholder="50"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-black text-slate-900 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-800">Card Heading:</label>
                    <input
                      type="text"
                      value={scratchConfig.title}
                      onChange={(e) => handleSaveScratchConfig({ ...scratchConfig, title: e.target.value })}
                      placeholder="🎉 Scratch & Win Welcome Gift!"
                      className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-800">Offer Line:</label>
                    <input
                      type="text"
                      value={scratchConfig.rewardText}
                      onChange={(e) => handleSaveScratchConfig({ ...scratchConfig, rewardText: e.target.value })}
                      placeholder="Flat ₹50 OFF on orders above ₹299"
                      className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Scratch Mockup Preview */}
                <div className="space-y-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] sm:text-xs font-black text-purple-800 uppercase tracking-wider">
                      ✨ Customer Screen Preview
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                      New shoppers receive this popup on opening your link:
                    </p>

                    <div className="mt-2 mx-auto max-w-[260px] sm:max-w-xs rounded-xl bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 p-3 border border-purple-500/40 text-center shadow-xs text-white space-y-1.5">
                      <div className="text-xl">🎁</div>
                      <h4 className="text-[11px] sm:text-xs font-black text-white">{scratchConfig.title}</h4>
                      <div className="rounded-lg bg-purple-950/90 border border-purple-400/50 p-2 space-y-0.5">
                        <p className="text-[10px] sm:text-[11px] font-black text-amber-300 font-mono">
                          CODE: {scratchConfig.couponCode}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-purple-200">
                          {scratchConfig.rewardText}
                        </p>
                      </div>
                      <p className="text-[8px] sm:text-[9px] text-slate-300">
                        Min purchase: ₹{scratchConfig.minOrder} • Single use
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[9px] sm:text-[10px] text-slate-500 font-medium">
                    Status: {scratchConfig.enabled ? <strong className="text-emerald-700">🟢 Pop-up Active</strong> : <strong className="text-slate-400">⚪ Disabled</strong>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: 📲 WHATSAPP MARKETING & OFFER BROADCAST STUDIO */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-3 sm:space-y-4 animate-fade-in">
            {/* Header & Launcher Card */}
            <div className="rounded-xl sm:rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 p-3.5 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-base sm:text-xl border border-emerald-400/30">
                  📲
                </span>
                <div>
                  <h2 className="text-xs sm:text-base font-black text-white">WhatsApp Marketing & Customer Offers</h2>
                  <p className="text-[10px] sm:text-xs text-teal-300 font-medium">
                    Send personalized offers & discount coupons directly to customer WhatsApp
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppCrmModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-all cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Open Fullscreen Studio ↗</span>
                </button>
              </div>
            </div>

            {/* In-page 4 Steps Studio Container */}
            <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200 p-3 sm:p-5 space-y-4 shadow-xs">
              {/* STEP 1: Select Target Customer Audience */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>1. Target Audience</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-500">
                    {customersList.filter((c) => {
                      if (whatsappSegment === 'VIP') return (c.ordersCount || 0) >= 2 || Number(c.totalSpent || 0) >= 1500
                      if (whatsappSegment === 'NEW') return (c.ordersCount || 0) === 1
                      return true
                    }).length} Customers Selected
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {[
                    { key: 'VIP', label: '🌟 VIP Customers', desc: '≥ 2 Orders / Top Spend', count: customersList.filter(c => (c.ordersCount || 0) >= 2).length },
                    { key: 'LAPSED', label: '⏳ Inactive (>14 Days)', desc: 'Needs Re-engagement', count: customersList.filter(c => c.lastOrderDate && new Date(c.lastOrderDate) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)).length },
                    { key: 'NEW', label: '🆕 1st Time Buyers', desc: '1 Order (Welcome back)', count: customersList.filter(c => (c.ordersCount || 0) === 1).length },
                    { key: 'ALL', label: '👥 All Customers', desc: 'Full Customer Base', count: customersList.length },
                  ].map((seg) => (
                    <button
                      key={seg.key}
                      type="button"
                      onClick={() => handleSelectWhatsappSegment(seg.key as any)}
                      className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                        whatsappSegment === seg.key
                          ? 'border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-500/40'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className="text-[11px] sm:text-xs font-black text-slate-900">{seg.label}</p>
                      <p className="text-[9px] text-slate-500 font-medium truncate">{seg.desc}</p>
                      <span className="mt-1 inline-block text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                        {seg.count} People
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 2: Configure Offer Details */}
              <div className="space-y-2.5 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-emerald-600" />
                  <span>2. Offer Details & Coupon</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Discount Headline</label>
                    <input
                      type="text"
                      value={whatsappDiscountText}
                      onChange={(e) => setWhatsappDiscountText(e.target.value)}
                      placeholder="e.g. FLAT 20% OFF"
                      className="mt-0.5 w-full rounded-lg sm:rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Attach Coupon Code</label>
                    <select
                      value={whatsappCoupon}
                      onChange={(e) => setWhatsappCoupon(e.target.value)}
                      className="mt-0.5 w-full rounded-lg sm:rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      {coupons.map((c) => (
                        <option key={c.id || c.code} value={c.code}>
                          {c.code} ({c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`})
                        </option>
                      ))}
                      <option value="SPECIAL10">SPECIAL10 (Custom 10% OFF)</option>
                      <option value="WELCOME50">WELCOME50 (Flat ₹50 OFF)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-600">Personal Note / Message</label>
                    <input
                      type="text"
                      value={whatsappNote}
                      onChange={(e) => setWhatsappNote(e.target.value)}
                      placeholder="Custom warm note to your customer"
                      className="mt-0.5 w-full rounded-lg sm:rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 3 & 4: Live Preview & Broadcast Action Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Live Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>3. Message Preview</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(buildWhatsappTabMessage())
                        setWhatsappCopiedMsg(true)
                        setTimeout(() => setWhatsappCopiedMsg(false), 2000)
                      }}
                      className="text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md hover:bg-emerald-100 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {whatsappCopiedMsg ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{whatsappCopiedMsg ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <div className="rounded-xl bg-[#E5DDD5] p-2.5 shadow-inner border border-slate-300 relative overflow-hidden">
                    <div className="bg-white rounded-xl rounded-tl-xs p-2.5 shadow-xs border border-slate-200/80 space-y-1 text-xs text-slate-900">
                      <p className="font-bold text-slate-900">Hi Rahul! 🛍️ <span className="text-emerald-700 font-black">Special Offer from {store?.name || 'Store'}</span></p>
                      <p className="font-black text-emerald-700">🎉 {whatsappDiscountText} on your entire cart!</p>
                      <p className="text-slate-600">{whatsappNote}</p>
                      {whatsappCoupon && (
                        <p className="font-mono font-black text-indigo-700 bg-indigo-50 p-1 rounded-md border border-indigo-200">
                          🎟️ Use Coupon Code: <span className="underline">{whatsappCoupon}</span>
                        </p>
                      )}
                      <div className="pt-0.5 text-[10px] text-teal-700 font-bold">
                        <p>🛒 Shop Online Directly Here:</p>
                        <p className="underline truncate">{window.location.origin}/store/{store?.slug || ''}</p>
                      </div>
                      <p className="text-[8px] text-slate-400 text-right">12:30 PM ✓✓</p>
                    </div>
                  </div>
                </div>

                {/* 1-Click Send List */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                      <Send className="h-3.5 w-3.5 text-emerald-600" />
                      <span>4. Send Offers</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const valid = customersList.map(c => formatPhoneForWhatsApp(c.phone)).filter(Boolean).join(', ')
                        navigator.clipboard.writeText(valid)
                        setWhatsappCopiedPhones(true)
                        setTimeout(() => setWhatsappCopiedPhones(false), 2000)
                      }}
                      className="text-[9px] sm:text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-300 px-2 py-0.5 rounded-md hover:bg-indigo-100 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {whatsappCopiedPhones ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{whatsappCopiedPhones ? 'Copied!' : 'Copy Numbers'}</span>
                    </button>
                  </div>

                  <div className="max-h-48 sm:max-h-56 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
                    {(() => {
                      const filtered = customersList.filter((c) => {
                        if (whatsappSegment === 'VIP') return (c.ordersCount || 0) >= 2 || Number(c.totalSpent || 0) >= 1500
                        if (whatsappSegment === 'NEW') return (c.ordersCount || 0) === 1
                        if (whatsappSegment === 'LAPSED') {
                          const lastDate = c.lastOrderDate ? new Date(c.lastOrderDate) : null
                          return lastDate ? lastDate < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) : false
                        }
                        return true
                      })

                      if (filtered.length === 0) {
                        return (
                          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 font-medium">
                            {customersList.length === 0
                              ? 'No customer orders recorded yet. As customers order, they will automatically appear here.'
                              : 'No customers in this specific segment. Try selecting "All Customers" above.'}
                          </div>
                        )
                      }

                      return filtered.map((cust, idx) => {
                        const whatsappUrl = cust.phone
                          ? `https://wa.me/${formatPhoneForWhatsApp(cust.phone)}?text=${encodeURIComponent(buildWhatsappTabMessage(cust.name))}`
                          : ''

                        return (
                          <div
                            key={cust.phone || idx}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all pt-1.5"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-900 font-black text-[10px]">
                                {cust.name ? cust.name[0].toUpperCase() : '👤'}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-[11px] sm:text-xs font-black text-slate-900 truncate">
                                    {cust.name || 'Customer'}
                                  </p>
                                  <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                    {cust.ordersCount} orders • ₹{Number(cust.totalSpent || 0).toFixed(0)}
                                  </span>
                                </div>
                                <p className="text-[9px] font-mono text-slate-400 truncate">
                                  {cust.phone || 'No phone'}
                                </p>
                              </div>
                            </div>

                            {cust.phone ? (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>Send WhatsApp ↗</span>
                              </a>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400">No Phone</span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Create / Edit Coupon Modal (PWA Native Bottom Sheet on Mobile / Centered on Web) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-3xl bg-white p-3.5 sm:p-6 border border-slate-200 shadow-2xl space-y-3 text-slate-900 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Discount Coupon'}
                </h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-lg text-slate-400 hover:text-slate-700 cursor-pointer p-0.5">
                ✕
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-300 p-2 text-[11px] font-bold text-rose-800">
                {error}
              </div>
            )}

            {/* ⚡ 1-Click Popular Templates Bar */}
            {!editingCoupon && (
              <div className="rounded-lg bg-indigo-50/80 border border-indigo-200/80 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-indigo-950 tracking-wider">
                    ⚡ 1-Click Templates:
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-indigo-600 font-bold">Tap to auto-fill</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => applyCouponPreset('BUY1GET1', 'BOGO', '0', '0')}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      code === 'BUY1GET1' ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-white border-purple-200 text-purple-900 hover:bg-purple-50'
                    }`}
                  >
                    <p className="text-[10px] font-black">🎁 Buy 1 Get 1</p>
                    <p className={`text-[8px] ${code === 'BUY1GET1' ? 'text-purple-100' : 'text-slate-500'}`}>BOGO Offer</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyCouponPreset('FREEDEL', 'FREE_DELIVERY', '0', '0')}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      code === 'FREEDEL' ? 'bg-sky-600 text-white border-sky-600 shadow-2xs' : 'bg-white border-sky-200 text-sky-900 hover:bg-sky-50'
                    }`}
                  >
                    <p className="text-[10px] font-black">🚚 Free Delivery</p>
                    <p className={`text-[8px] ${code === 'FREEDEL' ? 'text-sky-100' : 'text-slate-500'}`}>0 Shipping</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyCouponPreset('WELCOME50', 'FLAT', '50', '299')}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      code === 'WELCOME50' ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50'
                    }`}
                  >
                    <p className="text-[10px] font-black">💰 Flat ₹50</p>
                    <p className={`text-[8px] ${code === 'WELCOME50' ? 'text-indigo-100' : 'text-slate-500'}`}>On ₹299+</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyCouponPreset('SAVE15', 'PERCENTAGE', '15', '0')}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      code === 'SAVE15' ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50'
                    }`}
                  >
                    <p className="text-[10px] font-black">🔥 15% OFF</p>
                    <p className={`text-[8px] ${code === 'SAVE15' ? 'text-indigo-100' : 'text-slate-500'}`}>Storewide</p>
                  </button>
                </div>
              </div>
            )}

            <form className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Coupon Code Name *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BUY1GET1, FREEDEL, SAVE20"
                  className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white p-2 text-xs font-black font-mono text-indigo-700 tracking-wider focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Discount Type *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="FLAT">Flat ₹ Discount</option>
                    <option value="PERCENTAGE">Percentage (%) Off</option>
                    <option value="BOGO">Buy 1 Get 1 Free (BOGO) 🎁</option>
                    <option value="FREE_DELIVERY">Free Doorstep Delivery 🚚</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Discount Value *</label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={
                      discountType === 'BOGO'
                        ? '0 (Auto BOGO Item)'
                        : discountType === 'FREE_DELIVERY'
                        ? '0 (Free Shipping)'
                        : discountType === 'FLAT'
                        ? '₹ 50'
                        : '15%'
                    }
                    className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0 = Any"
                    className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Max Discount Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="Optional"
                    disabled={discountType !== 'PERCENTAGE'}
                    className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Scope Selector with Live Product Search */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">Which items does this apply to?</label>
                  {products.length > 0 && (
                    <span className="text-[9px] font-bold text-indigo-600">
                      {products.length} products
                    </span>
                  )}
                </div>

                {/* Instant Product Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder="🔍 Type product name to search..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProductSearchQuery('')}
                      className="absolute right-2 top-1.5 text-xs font-black text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="">🌐 All Products in Store (Full Cart)</option>
                  {products
                    .filter((p) =>
                      productSearchQuery
                        ? p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                        : true
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🛍️ Specific: {p.name} (₹{p.price})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSaveCoupon(e, false)}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-slate-100 py-2 text-xs font-black text-amber-800 hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  {saving ? 'Saving...' : '🟡 Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveCoupon(e, true)}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-xs font-black text-white hover:brightness-110 shadow-xs cursor-pointer"
                >
                  {saving ? 'Publishing...' : '🚀 Make Active'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📲 WhatsApp Marketing & Offer Broadcast Modal */}
      {showWhatsAppCrmModal && store && (
        <WhatsAppMarketingCrmModal
          store={store}
          customers={customersList}
          coupons={coupons}
          onClose={() => setShowWhatsAppCrmModal(false)}
        />
      )}

      {/* Unified Seller Bottom Navigation Bar */}
      {store && <SellerBottomNav storeId={store.id} activeTab="coupons" />}
    </div>
  )
}
