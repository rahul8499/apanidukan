import React, { useState } from 'react'
import { X, Check, Palette, Layers, Eye, Sparkles, Crown, Sprout, ShieldCheck, ShoppingCart, Search, Star, Smartphone, Monitor, Globe, RefreshCw, Type, CornerUpRight, ShoppingBag, Tag } from 'lucide-react'
import api from '../services/api'
import { STORE_THEME_PRESETS, StoreThemeConfig, getStoreTheme } from '../utils/storeTheme'

interface SellerThemeCustomizerModalProps {
  store: any
  onSaveSuccess: () => void
  onClose: () => void
}

export default function SellerThemeCustomizerModal({
  store,
  onSaveSuccess,
  onClose,
}: SellerThemeCustomizerModalProps) {
  const currentTheme = getStoreTheme(store)

  const [selectedCategory, setSelectedCategory] = useState<string>(currentTheme.category || 'KIRANA')
  const [primaryColor, setPrimaryColor] = useState<string>(currentTheme.primary_color || '#059669')
  const [customGradient, setCustomGradient] = useState<string>(currentTheme.banner_bg_gradient || '')
  const [tierFilter, setTierFilter] = useState<'ALL' | 'BASIC' | 'PREMIUM'>('ALL')
  const [previewDevice, setPreviewDevice] = useState<'MOBILE' | 'DESKTOP'>('MOBILE')
  const [previewTab, setPreviewTab] = useState<'HOME' | 'PRODUCT' | 'CART'>('HOME')
  const [borderRadius, setBorderRadius] = useState<'rounded-lg' | 'rounded-2xl' | 'rounded-3xl'>('rounded-2xl')
  const [fontStyle, setFontStyle] = useState<'font-sans' | 'font-serif' | 'font-mono'>('font-sans')
  const [customTagline, setCustomTagline] = useState<string>(currentTheme.tagline || '')
  const [customSubTagline, setCustomSubTagline] = useState<string>(currentTheme.sub_tagline || 'Order directly from our shop for fast doorstep delivery & verified quality.')

  // ULTRA-ADVANCED COMPETITOR-BEATING CONTROLS
  const [showAnnouncementBar, setShowAnnouncementBar] = useState<boolean>(currentTheme.show_announcement_bar ?? true)
  const [announcementText, setAnnouncementText] = useState<string>(currentTheme.announcement_text || '')
  const [featuredCouponCode, setFeaturedCouponCode] = useState<string>(currentTheme.featured_coupon_code || '')
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [trustBadges, setTrustBadges] = useState<string[]>(currentTheme.trust_badges || ['10MIN', 'GENUINE', 'WHATSAPP'])
  const [soundFxPlaying, setSoundFxPlaying] = useState<boolean>(false)

  const [scratchConfig] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`qs_scratch_config_${store.id}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { enabled: true, couponCode: 'LUCKY50', discountValue: 50, rewardText: 'Flat ₹50 OFF' }
  })

  const [flashSaleConfig] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`qs_flash_sale_${store.id}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { active: false, discount: 25, title: 'Evening Clearance Sale' }
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  React.useEffect(() => {
    const fetchStoreCoupons = async () => {
      try {
        const res = await api.get('/coupons/')
        const list = Array.isArray(res.data) ? res.data : (res.data.results || [])
        const storeCoupons = list.filter((c: any) => String(c.store) === String(store.id) && c.is_active)
        setAvailableCoupons(storeCoupons)
      } catch (err) {
        console.error('Failed to fetch coupons for theme studio:', err)
      }
    }
    fetchStoreCoupons()
  }, [store.id])


  const handleSelectPreset = (catKey: string) => {
    setSelectedCategory(catKey)
    const preset = STORE_THEME_PRESETS[catKey]
    if (preset) {
      setPrimaryColor(preset.primary_color)
      setCustomGradient(preset.banner_bg_gradient)
      setCustomTagline(preset.tagline || '')
    }
  }

  // AI Tagline Generator Presets based on Store Category
  const aiTaglines: Record<string, string[]> = {
    KIRANA: [
      '⚡ 10-Minute Express Grocery Delivery to Your Doorstep!',
      '🌾 100% Organic, Fresh & Wholesale Prices Daily',
      '🚚 Free Doorstep Shipping on Orders Above ₹499',
    ],
    PHARMACY: [
      '💊 100% Genuine Medicines & Licensed Healthcare Partner',
      '🩸 Instant Prescription Upload & 24/7 Home Delivery',
      '🩺 Authentic Wellness & Vital Care at Best Discount',
    ],
    BOUTIQUE: [
      '👗 Premium Handpicked Designer Wear & Luxury Fabrics',
      '✨ Trending Collections • Festive Offers Live',
      '🛍️ Easy Returns & Cash on Delivery Available',
    ],
    ELECTRONICS: [
      '📱 100% Brand Warranty & Express Gadget Delivery',
      '🔥 Super Deals on Laptops, Mobiles & Accessories',
      '⚡ Genuine Accessories with Instant Replacement',
    ],
    DEFAULT: [
      '⚡ Fast Doorstep Delivery & Verified Quality Guarantee',
      '🎉 Exclusive Special Discount on Direct Storefront Orders',
      '⭐ Rated 4.9 Stars by Local Happy Customers',
    ],
  }

  const handleAiTaglineGenerate = () => {
    const list = aiTaglines[selectedCategory] || aiTaglines.DEFAULT
    const randomIndex = Math.floor(Math.random() * list.length)
    setCustomTagline(list[randomIndex])
  }

  const toggleTrustBadge = (badgeKey: string) => {
    if (trustBadges.includes(badgeKey)) {
      setTrustBadges(trustBadges.filter(b => b !== badgeKey))
    } else {
      if (trustBadges.length < 3) {
        setTrustBadges([...trustBadges, badgeKey])
      }
    }
  }

  const playSoundFxTest = () => {
    setSoundFxPlaying(true)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15) // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.3)
    } catch (e) {
      console.log('Audio test error', e)
    }
    setTimeout(() => setSoundFxPlaying(false), 400)
  }


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccessMsg('')

    const basePreset = STORE_THEME_PRESETS[selectedCategory] || STORE_THEME_PRESETS.KIRANA
    const updatedThemeData: StoreThemeConfig = {
      category: selectedCategory,
      preset_id: basePreset.preset_id,
      name: basePreset.name,
      tier: basePreset.tier || 'basic',
      tagline: customTagline || basePreset.tagline,
      sub_tagline: customSubTagline,
      icon: basePreset.icon,
      primary_color: primaryColor || basePreset.primary_color,
      secondary_color: basePreset.secondary_color,
      accent_color: basePreset.accent_color,
      banner_bg_gradient: customGradient || basePreset.banner_bg_gradient,
      font_style: fontStyle,
      card_radius: borderRadius,
      show_announcement_bar: showAnnouncementBar,
      announcement_text: announcementText,
      featured_coupon_code: featuredCouponCode,
      trust_badges: trustBadges,
      is_dark_mode: basePreset.is_dark_mode,
      page_bg_class: basePreset.page_bg_class,
      card_bg_class: basePreset.card_bg_class,
      card_border_class: basePreset.card_border_class,
      header_bg_class: basePreset.header_bg_class,
      sub_bar_bg_class: basePreset.sub_bar_bg_class,
      text_primary_class: basePreset.text_primary_class,
      text_secondary_class: basePreset.text_secondary_class,
      btn_gradient: basePreset.btn_gradient,
      accent_glow_color: basePreset.accent_glow_color,
      accent_badge_class: basePreset.accent_badge_class,
    }

    try {
      await api.patch(`/stores/${store.id}/`, {
        theme: updatedThemeData,
      })

      setSaveSuccessMsg('🎉 Store Theme Template Applied & Saved Successfully!')
      setTimeout(() => {
        onSaveSuccess()
        onClose()
      }, 800)
    } catch (err) {
      alert('Failed to save store theme settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const activePreset = STORE_THEME_PRESETS[selectedCategory] || STORE_THEME_PRESETS.KIRANA
  const activeGradient = customGradient || activePreset.banner_bg_gradient
  const displayTagline = customTagline || activePreset.tagline || 'Fast Doorstep Delivery'

  const filteredPresets = Object.entries(STORE_THEME_PRESETS).filter(([_, p]) => {
    if (tierFilter === 'BASIC') return p.tier === 'basic'
    if (tierFilter === 'PREMIUM') return p.tier === 'premium'
    return true
  })

  // Curated Color Swatches
  const colorSwatches = [
    { name: 'Emerald', hex: '#059669' },
    { name: 'Crimson', hex: '#dc2626' },
    { name: 'Flame', hex: '#ea580c' },
    { name: 'Neon Indigo', hex: '#6366f1' },
    { name: 'Rose Velvet', hex: '#e11d48' },
    { name: 'Cyber Cyan', hex: '#06b6d4' },
    { name: 'Warm Caramel', hex: '#d97706' },
    { name: '24K Gold', hex: '#eab308' },
    { name: 'Pacific Blue', hex: '#2563eb' },
    { name: 'Zen Matcha', hex: '#15803d' },
    { name: 'Electric Violet', hex: '#9333ea' },
    { name: 'Matte Obsidian', hex: '#1e293b' },
  ]

  // Curated Hero Gradient Presets
  const gradientPresets = [
    { name: 'Aurora Teal', gradient: 'from-emerald-950 via-teal-900 to-slate-950' },
    { name: 'Carbon Red', gradient: 'from-slate-950 via-red-950/80 to-slate-950' },
    { name: 'Cyber Matrix', gradient: 'from-slate-950 via-cyan-950 to-slate-950' },
    { name: 'Sunset Aura', gradient: 'from-rose-950 via-purple-950 to-amber-950' },
    { name: 'Midnight Royal', gradient: 'from-slate-950 via-indigo-950 to-slate-900' },
    { name: '24K Obsidian', gradient: 'from-black via-zinc-950 to-amber-950/70' },
    { name: 'Pacific Deep', gradient: 'from-slate-950 via-blue-950 to-cyan-950' },
    { name: 'Velvet Pink', gradient: 'from-purple-950 via-rose-950 to-slate-950' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[900px] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden my-auto text-white">

        {/* SHOPIFY STYLE STUDIO HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 text-lg shadow-md border border-white/20">
              🎨
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">Shopify Theme & Vibe Studio Pro</h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Customizer
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Customize colors, typography, taglines & layout for {store?.name || 'your store'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Device Switcher (Mobile vs Desktop) */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewDevice('MOBILE')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === 'MOBILE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mobile View</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('DESKTOP')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === 'DESKTOP' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Desktop View</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* TWO COLUMN STUDIO BODY */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden bg-slate-900">

          {/* LEFT PANEL: CONTROLS & THEME PRESETS (6 COLS ON DESKTOP) */}
          <div className="md:col-span-6 flex flex-col overflow-y-auto p-4 space-y-4 border-r border-slate-800/80 bg-slate-900">
            {saveSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-3 text-xs font-bold text-emerald-300 shadow-xs flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Step 1: Select Preset Template */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  <span>1. Choose Theme Template</span>
                </label>

                {/* Basic vs Premium Filter */}
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTierFilter('ALL')}
                    className={`px-2 py-0.5 text-[9.5px] font-black rounded-lg transition-all ${
                      tierFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({Object.keys(STORE_THEME_PRESETS).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTierFilter('BASIC')}
                    className={`px-2 py-0.5 text-[9.5px] font-black rounded-lg transition-all flex items-center gap-0.5 ${
                      tierFilter === 'BASIC' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sprout className="h-2.5 w-2.5" /> Basic
                  </button>
                  <button
                    type="button"
                    onClick={() => setTierFilter('PREMIUM')}
                    className={`px-2 py-0.5 text-[9.5px] font-black rounded-lg transition-all flex items-center gap-0.5 ${
                      tierFilter === 'PREMIUM' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Crown className="h-2.5 w-2.5" /> Premium
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredPresets.map(([key, preset]) => {
                  const isSelected = selectedCategory === key
                  const isPremium = preset.tier === 'premium'

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs relative overflow-hidden group min-h-[90px] ${
                        isSelected
                          ? isPremium
                            ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/40'
                            : 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400/30'
                          : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl group-hover:scale-110 transition-transform">{preset.icon}</span>
                          <div className="flex items-center gap-1">
                            {isPremium ? (
                              <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-2xs flex items-center gap-0.5">
                                <Crown className="h-2.5 w-2.5" /> Premium
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Basic
                              </span>
                            )}
                            <span
                              className="h-3 w-3 rounded-full border border-white/20 shadow-xs ml-0.5"
                              style={{ backgroundColor: preset.primary_color }}
                            />
                          </div>
                        </div>

                        <p className="mt-1 text-xs font-black text-white leading-tight">
                          {preset.name.split('&')[0].trim()}
                        </p>
                        {preset.tagline && (
                          <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
                            {preset.tagline}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full mt-1.5 pt-1 border-t border-white/10">
                        <span className="text-[8px] font-bold text-slate-400">1-Click Apply</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded ${
                          isPremium ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {preset.gradient_name?.split(' ')[0]}
                        </span>
                      </div>

                      {isSelected && (
                        <div className={`absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white shadow-xs ${
                          isPremium ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}>
                          <Check className="h-2.5 w-2.5 text-slate-950 font-bold" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Hero Banner Gradient Style */}
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>2. Hero Banner Gradient Style</span>
                </label>
                <span className="text-[10px] font-bold text-slate-500">8 Presets</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {gradientPresets.map((g) => {
                  const isActive = activeGradient === g.gradient

                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setCustomGradient(g.gradient)}
                      className={`p-2 rounded-lg border text-left text-[10px] font-black text-white bg-gradient-to-r ${g.gradient} transition-all cursor-pointer shadow-2xs flex items-center justify-between ${
                        isActive ? 'ring-2 ring-indigo-400 border-white scale-102' : 'border-slate-800 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span className="truncate">{g.name}</span>
                      {isActive && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 3: Primary Accent & Button Color */}
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-indigo-400" />
                  <span>3. Primary Accent & Button Color</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-slate-400">{primaryColor}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {colorSwatches.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setPrimaryColor(col.hex)}
                    title={col.name}
                    className={`h-7 w-7 rounded-lg transition-all cursor-pointer shadow-2xs border-2 ${
                      primaryColor === col.hex
                        ? 'border-white scale-115 ring-2 ring-indigo-400'
                        : 'border-slate-800 hover:scale-108'
                    }`}
                    style={{ backgroundColor: col.hex }}
                  />
                ))}

                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] font-bold text-slate-400">Custom:</span>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-7 w-8 rounded-md border border-slate-700 cursor-pointer p-0.5 bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: AI Storefront Tagline & Hero Description */}
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>4. Storefront Hero Headline & Description</span>
                </label>
                <button
                  type="button"
                  onClick={handleAiTaglineGenerate}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-black text-white hover:brightness-110 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> AI Suggest
                </button>
              </div>

              {/* Main Headline */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Hero Banner Title / Main Tagline:</label>
                <input
                  type="text"
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  placeholder="e.g. Clean & Fresh Grocery Theme"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Sub-Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Banner Sub-Description / Quality Pitch:</label>
                <input
                  type="text"
                  value={customSubTagline}
                  onChange={(e) => setCustomSubTagline(e.target.value)}
                  placeholder="e.g. Order directly from our shop for fast doorstep delivery & verified quality."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Step 5: Dynamic Coupon Announcement Ticker Bar Switch & Selector */}
            <div className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-amber-400" />
                    <span>5. Top Coupon Ticker & Selection</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Feature a specific coupon offer at the top of your customer storefront!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAnnouncementBar(!showAnnouncementBar)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showAnnouncementBar ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      showAnnouncementBar ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {showAnnouncementBar && (
                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Select Offer / Promo to Feature at Header:</span>
                      {availableCoupons.length === 0 && !scratchConfig?.enabled && !store?.enable_loyalty_cashback && !flashSaleConfig?.active && (
                        <span className="text-amber-400 text-[9px] font-bold">No Active Offers</span>
                      )}
                    </label>
                    <select
                      value={featuredCouponCode}
                      onChange={(e) => setFeaturedCouponCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-amber-300 focus:border-amber-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">✨ Automatic Best Offer (Auto-Select Highest Discount)</option>

                      {/* Group 1: Store Coupons */}
                      {availableCoupons.length > 0 && (
                        <optgroup label="🎟️ Store Coupons">
                          {availableCoupons.map((c: any) => (
                            <option key={c.id} value={`COUPON:${c.code}`}>
                              🎟️ Coupon "{c.code}" - {c.discount_type === 'BOGO' ? 'BUY 1 GET 1 FREE' : c.discount_type === 'FREE_DELIVERY' ? 'FREE SHIPPING' : c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `FLAT ₹${c.discount_value} OFF`}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* Group 2: Welcome Scratch Gift Card */}
                      {scratchConfig?.enabled && (
                        <optgroup label="🎁 Welcome Scratch Gift">
                          <option value={`SCRATCH:${scratchConfig.couponCode || 'LUCKY50'}`}>
                            🎁 Scratch Card Gift - Code "{scratchConfig.couponCode || 'LUCKY50'}" ({scratchConfig.rewardText || `Flat ₹${scratchConfig.discountValue || 50} OFF`})
                          </option>
                        </optgroup>
                      )}

                      {/* Group 3: Customer Loyalty Cashback */}
                      {store?.enable_loyalty_cashback && (
                        <optgroup label="🪙 Customer Loyalty Cashback">
                          <option value={`CASHBACK:${store.loyalty_cashback_percent || 5}`}>
                            🪙 Loyalty Reward - Earn {store.loyalty_cashback_percent || 5}% Cashback Coins on Every Order
                          </option>
                        </optgroup>
                      )}

                      {/* Group 4: Evening Flash Sale */}
                      {flashSaleConfig?.active && (
                        <optgroup label="⚡ Evening Flash Sale">
                          <option value={`FLASH:${flashSaleConfig.discount || 25}`}>
                            ⚡ Flash Sale - Flat {flashSaleConfig.discount || 25}% OFF Live Now
                          </option>
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2 text-[10px] text-amber-300 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400 animate-bounce" />
                    <span>
                      {featuredCouponCode
                        ? `Selected Offer "${featuredCouponCode}" will be pinned at the top header!`
                        : 'Auto-Select Mode: Shows best active coupon or promo dynamically!'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 5: Typography & Card Shape Customizer */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Type className="h-3 w-3 text-indigo-400" /> Typography
                </label>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFontStyle('font-sans')}
                    className={`flex-1 py-1 text-[9.5px] font-black rounded-lg ${
                      fontStyle === 'font-sans' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Modern
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontStyle('font-serif')}
                    className={`flex-1 py-1 text-[9.5px] font-serif font-black rounded-lg ${
                      fontStyle === 'font-serif' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Royal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontStyle('font-mono')}
                    className={`flex-1 py-1 text-[9.5px] font-mono font-black rounded-lg ${
                      fontStyle === 'font-mono' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Tech
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <CornerUpRight className="h-3 w-3 text-teal-400" /> Card Shape
                </label>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBorderRadius('rounded-lg')}
                    className={`flex-1 py-1 text-[9.5px] font-black rounded-lg ${
                      borderRadius === 'rounded-lg' ? 'bg-teal-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Sharp
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorderRadius('rounded-2xl')}
                    className={`flex-1 py-1 text-[9.5px] font-black rounded-lg ${
                      borderRadius === 'rounded-2xl' ? 'bg-teal-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Sleek
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorderRadius('rounded-3xl')}
                    className={`flex-1 py-1 text-[9.5px] font-black rounded-lg ${
                      borderRadius === 'rounded-3xl' ? 'bg-teal-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Pill
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 px-5 py-2 text-xs font-black text-white shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSaving ? 'Applying Template...' : 'Apply & Save Theme'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: SHOPIFY LIVE STOREFRONT DEVICE PREVIEW (6 COLS ON DESKTOP) */}
          <div className="md:col-span-6 bg-slate-950 p-4 flex flex-col items-center justify-start border-l border-slate-800/80 overflow-y-auto">
            
            {/* Interactive Preview Bar Header */}
            <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-teal-400 font-extrabold text-[11px]">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{previewDevice === 'DESKTOP' ? 'Desktop Browser Preview' : 'Mobile App View'}</span>
                </span>
              </div>

              {/* View Tab Selector */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewTab('HOME')}
                  className={`px-2.5 py-0.5 font-black rounded-lg ${
                    previewTab === 'HOME' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('PRODUCT')}
                  className={`px-2.5 py-0.5 font-black rounded-lg ${
                    previewTab === 'PRODUCT' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Product Detail
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('CART')}
                  className={`px-2.5 py-0.5 font-black rounded-lg ${
                    previewTab === 'CART' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Cart
                </button>
              </div>
            </div>

            {/* DYNAMICALLY RESPONSIVE DEVICE MOCKUP FRAME */}
            <div
              className={`w-full transition-all duration-300 ${fontStyle} ${
                previewDevice === 'DESKTOP' ? 'max-w-2xl' : 'max-w-[340px]'
              }`}
            >
              <div className={`border-4 border-slate-800 bg-slate-900 shadow-2xl overflow-hidden text-slate-900 relative ${borderRadius}`}>

                {/* TOP HEADER FRAME: CHROME BROWSER BAR (DESKTOP) VS NOTCH (MOBILE) */}
                {previewDevice === 'DESKTOP' ? (
                  <div className="bg-slate-950 px-3 py-2 flex items-center justify-between border-b border-slate-800 text-slate-400 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-0.5 rounded-lg text-[10px] text-slate-300 font-mono w-64 truncate">
                      <Globe className="h-3 w-3 text-teal-400 shrink-0" />
                      <span>https://{store?.slug || 'store'}.apanidukan.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>Desktop 1080p</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 px-4 py-1.5 flex items-center justify-between text-[9px] text-slate-400 font-mono border-b border-slate-800">
                    <span>9:41</span>
                    <div className="h-2 w-10 bg-slate-800 rounded-full" />
                    <span>5G ⚡</span>
                  </div>
                )}

                {/* SHOPIFY STORE NAVBAR */}
                <div className="bg-slate-950 px-3.5 py-2.5 text-white flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-base shrink-0">
                      {activePreset.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-black text-white truncate">{store?.name || 'Apani Store'}</p>
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-bold flex items-center gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-[10px] text-slate-400">
                      <Search className="h-3 w-3" />
                      <span>Search items...</span>
                    </div>
                    <div className="relative cursor-pointer">
                      <ShoppingCart className="h-4 w-4 text-teal-400" />
                      <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                  </div>
                </div>

                {/* PREVIEW CONTENT SWITCHER (HOME / PRODUCT DETAIL / CART) */}
                {previewTab === 'HOME' && (
                  <>
                    {/* DYNAMIC HERO BANNER */}
                    <div className={`bg-gradient-to-br ${activeGradient} p-4 text-white space-y-2 relative overflow-hidden`}>
                      <div
                        className="absolute -top-8 -right-8 h-32 w-32 rounded-full blur-xl opacity-40 pointer-events-none"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <div className="relative z-10 space-y-1.5">
                        <span className="text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white/15 text-teal-300 border border-white/20 inline-block">
                          {displayTagline}
                        </span>
                        <h3 className="text-xs sm:text-base font-black leading-snug text-white">
                          Welcome to {store?.name || 'Apani Dukan'}
                        </h3>
                        <p className="text-[9.5px] sm:text-xs text-slate-300 font-medium">
                          Order online & get instant doorstep delivery!
                        </p>
                      </div>
                    </div>

                    {/* SHOPIFY PRODUCT GRID */}
                    <div className="p-3 bg-slate-950 space-y-2 min-h-[240px]">
                      <div className="flex items-center justify-between px-0.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Featured Products
                        </p>
                        <span className="text-[9px] font-bold text-teal-400">View All ➔</span>
                      </div>

                      <div className={`grid gap-2 ${previewDevice === 'DESKTOP' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {/* Demo Product Card 1 */}
                        <div className={`bg-slate-900 border border-slate-800 p-2 text-white space-y-1.5 flex flex-col justify-between shadow-sm ${borderRadius}`}>
                          <div>
                            <div className="h-16 sm:h-20 rounded-lg bg-slate-800 flex items-center justify-center text-2xl relative overflow-hidden">
                              🛍️
                              <span className="absolute top-1 left-1 text-[7px] font-black px-1.5 py-0.2 rounded bg-rose-500 text-white">
                                28% OFF
                              </span>
                            </div>
                            <p className="text-[10.5px] sm:text-xs font-black text-white truncate mt-1.5">
                              Demo Product Item
                            </p>
                            <div className="flex items-center gap-1 text-[8.5px] text-amber-400 font-bold mt-0.5">
                              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                              <span>4.9 (42 reviews)</span>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1">
                            <div>
                              <p className="text-xs sm:text-sm font-black text-white">₹499</p>
                              <p className="text-[8px] text-slate-500 line-through">₹699</p>
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1 text-[9.5px] font-black rounded-lg text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                              style={{ backgroundColor: primaryColor }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                        {/* Demo Product Card 2 */}
                        <div className={`bg-slate-900 border border-slate-800 p-2 text-white space-y-1.5 flex flex-col justify-between shadow-sm ${borderRadius}`}>
                          <div>
                            <div className="h-16 sm:h-20 rounded-lg bg-slate-800 flex items-center justify-center text-2xl relative overflow-hidden">
                              📦
                              <span className="absolute top-1 left-1 text-[7px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-white">
                                BEST SELLER
                              </span>
                            </div>
                            <p className="text-[10.5px] sm:text-xs font-black text-white truncate mt-1.5">
                              Daily Essential Pack
                            </p>
                            <div className="flex items-center gap-1 text-[8.5px] text-amber-400 font-bold mt-0.5">
                              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                              <span>5.0 (98 reviews)</span>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1">
                            <div>
                              <p className="text-xs sm:text-sm font-black text-white">₹299</p>
                              <p className="text-[8px] text-slate-500 line-through">₹399</p>
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1 text-[9.5px] font-black rounded-lg text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                              style={{ backgroundColor: primaryColor }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                        {/* Demo Product Card 3 (Shows on Desktop View) */}
                        {previewDevice === 'DESKTOP' && (
                          <div className={`bg-slate-900 border border-slate-800 p-2 text-white space-y-1.5 flex flex-col justify-between shadow-sm ${borderRadius}`}>
                            <div>
                              <div className="h-20 rounded-lg bg-slate-800 flex items-center justify-center text-2xl relative overflow-hidden">
                                💎
                                <span className="absolute top-1 left-1 text-[7px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                                  NEW ARRIVAL
                                </span>
                              </div>
                              <p className="text-xs font-black text-white truncate mt-1.5">
                                Premium Special Combo
                              </p>
                              <div className="flex items-center gap-1 text-[8.5px] text-amber-400 font-bold mt-0.5">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                <span>4.8 (15 reviews)</span>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1">
                              <div>
                                <p className="text-sm font-black text-white">₹899</p>
                                <p className="text-[8px] text-slate-500 line-through">₹1,199</p>
                              </div>
                              <button
                                type="button"
                                className="px-2.5 py-1 text-[9.5px] font-black rounded-lg text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                                style={{ backgroundColor: primaryColor }}
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* PRODUCT DETAIL CARD VIEW */}
                {previewTab === 'PRODUCT' && (
                  <div className="p-4 bg-slate-950 text-white space-y-3 min-h-[280px]">
                    <div className="h-32 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-4xl relative">
                      🛍️
                      <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded bg-rose-500 text-white">
                        28% OFF SPECIAL
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-white">Demo Premium Item</h4>
                      <p className="text-[10px] text-slate-400">High quality daily essential item direct from store.</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-base font-black text-white">₹499.00</span>
                        <span className="text-xs text-slate-500 line-through">₹699.00</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full py-2.5 text-xs font-black text-white rounded-xl shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Buy Now / Add to Cart</span>
                    </button>
                  </div>
                )}

                {/* CART DRAWER VIEW */}
                {previewTab === 'CART' && (
                  <div className="p-4 bg-slate-950 text-white space-y-3 min-h-[280px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <p className="text-xs font-black text-white">Your Shopping Cart (2)</p>
                      <span className="text-[9px] text-teal-400 font-bold">Clear All</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span>🛍️</span>
                          <div>
                            <p className="font-bold text-white">Demo Product Item</p>
                            <p className="text-[9px] text-slate-400">Qty: 1 • ₹499</p>
                          </div>
                        </div>
                        <span className="font-black text-white">₹499</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Total Payable:</span>
                        <span className="text-sm font-black text-emerald-400">₹499.00</span>
                      </div>
                      <button
                        type="button"
                        className="w-full py-2 text-xs font-black text-white rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Proceed to WhatsApp Checkout ➔
                      </button>
                    </div>
                  </div>
                )}

                {/* FOOTER BAR INSIDE MOCKUP */}
                <div className="bg-slate-950 px-3 py-2 text-center border-t border-slate-800">
                  <p className="text-[8.5px] font-bold text-slate-500">
                    ⚡ Powered by Apani Dukan Storefront Studio Engine
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
