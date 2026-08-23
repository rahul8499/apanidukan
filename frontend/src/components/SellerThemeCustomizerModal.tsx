import React, { useState } from 'react'
import { X, Check, Palette, Layers, Eye, Sparkles, Crown, Sprout, ShieldCheck, ShoppingCart, Search, Star, Smartphone, Monitor } from 'lucide-react'
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
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  const handleSelectPreset = (catKey: string) => {
    setSelectedCategory(catKey)
    const preset = STORE_THEME_PRESETS[catKey]
    if (preset) {
      setPrimaryColor(preset.primary_color)
      setCustomGradient(preset.banner_bg_gradient)
    }
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
      tagline: basePreset.tagline,
      icon: basePreset.icon,
      primary_color: primaryColor || basePreset.primary_color,
      secondary_color: basePreset.secondary_color,
      accent_color: basePreset.accent_color,
      banner_bg_gradient: customGradient || basePreset.banner_bg_gradient,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden my-auto text-white">

        {/* SHOPIFY STYLE STUDIO HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 text-lg shadow-md border border-white/20">
              🎨
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">Shopify Theme Studio</h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Customizer
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Customize colors, templates, and storefront vibe for {store?.name || 'your store'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Device Switcher */}
            <div className="hidden sm:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewDevice('MOBILE')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewDevice === 'MOBILE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('DESKTOP')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewDevice === 'DESKTOP' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Desktop</span>
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

          {/* LEFT PANEL: CONTROLS & THEME PRESETS (7 COLS ON DESKTOP) */}
          <div className="md:col-span-7 flex flex-col overflow-y-auto p-4 space-y-4 border-r border-slate-800/80 bg-slate-900">
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
                      className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs relative overflow-hidden group min-h-[92px] ${
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

            {/* Step 3: Primary Accent Color */}
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

            {/* Bottom Actions */}
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

          {/* RIGHT PANEL: SHOPIFY LIVE STOREFRONT DEVICE PREVIEW (5 COLS ON DESKTOP) */}
          <div className="md:col-span-5 bg-slate-950 p-4 flex flex-col items-center justify-center border-l border-slate-800/80 overflow-y-auto">
            <div className="w-full max-w-sm space-y-2">
              {/* Device Frame Header */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                <span className="flex items-center gap-1 text-teal-400 font-extrabold text-[11px]">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Real-Time Customer View</span>
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">
                  {activePreset.name}
                </span>
              </div>

              {/* REALISTIC SHOPIFY MOBILE STOREFRONT MOCKUP FRAME */}
              <div className="rounded-3xl border-4 border-slate-800 bg-slate-900 shadow-2xl overflow-hidden text-slate-900 transition-all duration-300 relative">

                {/* Mobile Top Notch & Battery Bar */}
                <div className="bg-slate-950 px-4 py-1.5 flex items-center justify-between text-[9px] text-slate-400 font-mono border-b border-slate-800">
                  <span>9:41</span>
                  <div className="h-2 w-10 bg-slate-800 rounded-full" />
                  <span>5G ⚡</span>
                </div>

                {/* Shopify Store Navbar */}
                <div className="bg-slate-950 px-3.5 py-2 text-white flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-base shrink-0">
                      {activePreset.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{store.name || 'Store Name'}</p>
                      <p className="text-[8px] text-emerald-400 font-bold flex items-center gap-0.5 truncate">
                        <ShieldCheck className="h-2.5 w-2.5" /> Verified Shop
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <div className="relative">
                      <ShoppingCart className="h-4 w-4 text-teal-400" />
                      <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Hero Banner */}
                <div className={`bg-gradient-to-br ${activeGradient} p-3.5 text-white space-y-2 relative overflow-hidden`}>
                  {/* Subtle Ambient Glow */}
                  <div
                    className="absolute -top-8 -right-8 h-28 w-28 rounded-full blur-xl opacity-40 pointer-events-none"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div className="relative z-10 space-y-1">
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-white/15 text-teal-300 border border-white/20">
                      {activePreset.tagline || 'Fast Delivery'}
                    </span>
                    <h3 className="text-xs font-black leading-snug text-white">
                      Welcome to {store.name || 'Apani Dukan'}
                    </h3>
                    <p className="text-[9.5px] text-slate-300 font-medium leading-tight">
                      Order online & get instant doorstep delivery!
                    </p>
                  </div>
                </div>

                {/* Shopify Store Category Bar */}
                <div className="bg-slate-900 px-3 py-2 flex items-center gap-1.5 overflow-x-auto text-[9.5px] font-bold text-slate-300 border-b border-slate-800">
                  <span className="px-2.5 py-1 rounded-full text-white font-black shrink-0" style={{ backgroundColor: primaryColor }}>
                    🔥 All Items
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 shrink-0">
                    Grocery
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 shrink-0">
                    Essentials
                  </span>
                </div>

                {/* SHOPIFY PRODUCT GRID PREVIEW */}
                <div className="p-3 bg-slate-950 space-y-2 min-h-[220px]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-0.5">
                    Featured Products
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Demo Product Card 1 */}
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-white space-y-1.5 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="h-16 rounded-lg bg-slate-800 flex items-center justify-center text-2xl relative overflow-hidden">
                          🛍️
                          <span className="absolute top-1 left-1 text-[7px] font-black px-1 rounded bg-rose-500 text-white">
                            28% OFF
                          </span>
                        </div>
                        <p className="text-[10.5px] font-black text-white truncate mt-1.5">
                          Demo Product Item
                        </p>
                        <div className="flex items-center gap-1 text-[8.5px] text-amber-400 font-bold mt-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          <span>4.9 (42)</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-black text-white">₹499</p>
                          <p className="text-[8px] text-slate-500 line-through">₹699</p>
                        </div>
                        <button
                          type="button"
                          className="px-2 py-1 text-[9.5px] font-black rounded-lg text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                          style={{ backgroundColor: primaryColor }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* Demo Product Card 2 */}
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-white space-y-1.5 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="h-16 rounded-lg bg-slate-800 flex items-center justify-center text-2xl relative overflow-hidden">
                          📦
                          <span className="absolute top-1 left-1 text-[7px] font-black px-1 rounded bg-emerald-500 text-white">
                            BEST SELLER
                          </span>
                        </div>
                        <p className="text-[10.5px] font-black text-white truncate mt-1.5">
                          Premium Daily Essential
                        </p>
                        <div className="flex items-center gap-1 text-[8.5px] text-amber-400 font-bold mt-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          <span>5.0 (98)</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-black text-white">₹299</p>
                          <p className="text-[8px] text-slate-500 line-through">₹399</p>
                        </div>
                        <button
                          type="button"
                          className="px-2 py-1 text-[9.5px] font-black rounded-lg text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                          style={{ backgroundColor: primaryColor }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Bar inside Mockup */}
                <div className="bg-slate-950 px-3 py-2 text-center border-t border-slate-800">
                  <p className="text-[8.5px] font-bold text-slate-500">
                    ⚡ Powered by Apani Dukan Storefront Engine
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
