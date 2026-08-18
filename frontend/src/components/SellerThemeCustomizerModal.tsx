import React, { useState } from 'react'
import { X, Check, Palette, Layers, Eye, Sparkles, Sun, Moon, Flame, Zap, ShieldCheck } from 'lucide-react'
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
  const [themeFilter, setThemeFilter] = useState<'ALL' | 'DARK' | 'LIGHT'>('ALL')
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

      setSaveSuccessMsg('🎉 Store Color Theme & Gradient updated successfully!')
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
    if (themeFilter === 'DARK') return p.is_dark_mode
    if (themeFilter === 'LIGHT') return !p.is_dark_mode
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[94vh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-4 sm:px-6 py-3.5 sm:py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 text-lg shadow-md border border-white/20">
              🎨
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">Store Color Theme & Vibe Studio</h2>
              <p className="text-[10px] sm:text-xs text-teal-300 font-medium">
                Vibrant Gradients, Dark/Light Aesthetics & Live Storefront Customization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {saveSuccessMsg && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 shadow-xs flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 1: Live Interactive Storefront Preview Card */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-teal-600" />
                <span>Live Customer Storefront Preview</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  ☀️ Crisp White Canvas
                </span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {activePreset.gradient_name || 'Vibrant Gradient'}
                </span>
              </div>
            </div>

            {/* Dynamic Store Hero Mockup */}
            <div className={`rounded-2xl bg-gradient-to-br ${activeGradient} p-3.5 sm:p-4 text-white shadow-xl space-y-2.5 border border-slate-700/60 relative overflow-hidden transition-all duration-300`}>
              {/* Background Ambient Glow */}
              <div
                className="absolute -top-12 -right-12 h-36 w-36 rounded-full blur-2xl opacity-40 pointer-events-none"
                style={{ backgroundColor: primaryColor }}
              />

              {/* Store Header Banner Mockup */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 relative z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg border border-white/20 shadow-xs">
                    {activePreset.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-black text-white truncate">{store.name || 'Store Name'}</p>
                      <span className="flex items-center gap-0.5 text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1 py-0.2 rounded font-bold">
                        <ShieldCheck className="h-2.5 w-2.5" /> Verified
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-300 font-medium truncate">
                      {store.description || 'Fast Doorstep Delivery • Instant Orders'}
                    </p>
                  </div>
                </div>

                <span
                  className="rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Shop Now ➔
                </span>
              </div>

              {/* Mock Product Card Preview on Clean White Canvas */}
              <div className="pt-0.5 relative z-10">
                <div className="rounded-xl p-2.5 border bg-white border-slate-200 text-slate-900 shadow-sm flex items-center justify-between gap-2 transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-slate-100 text-base shrink-0">
                      🛍️
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-slate-900">Demo Product Item</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-slate-900">₹499.00</span>
                        <span className="text-[9px] text-slate-400 line-through">₹699.00</span>
                        <span
                          className="text-[8px] font-black px-1 rounded border"
                          style={{ color: primaryColor, backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}40` }}
                        >
                          28% OFF
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className="px-3 py-1.5 text-xs font-black rounded-lg text-white shadow-xs shrink-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>+ Add</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 2: Select Visual Theme Palette (12 Ultra Killer Presets) */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span>1. Select Color Theme Palette (White Canvas)</span>
              </label>
              <span className="text-[10px] font-bold text-slate-500">12 Curated Themes</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(STORE_THEME_PRESETS).map(([key, preset]) => {
                const isSelected = selectedCategory === key

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs relative overflow-hidden group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xl group-hover:scale-110 transition-transform">{preset.icon}</span>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white shadow-xs"
                        style={{ backgroundColor: preset.primary_color }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-black text-slate-900 leading-tight">
                      {preset.name.split('&')[0].trim()}
                    </p>
                    <div className="flex items-center justify-between w-full mt-1">
                      <span className="text-[8px] font-bold text-slate-400">
                        White Theme
                      </span>
                      <span className="text-[8px] font-black text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded">
                        {preset.gradient_name?.split(' ')[0]}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 3: Hero Banner Gradient Presets (Ultra Killer Feature) */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>2. Hero Banner Gradient Style</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400">8 Gradient Presets</span>
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
                      isActive ? 'ring-2 ring-indigo-500 border-white scale-102' : 'border-slate-700/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    {isActive && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 4: Brand Accent Color Harmonizer */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-indigo-600" />
                <span>3. Primary Accent & Button Color</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-500">{primaryColor}</span>
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
                      ? 'border-slate-950 scale-115 ring-2 ring-indigo-500/50'
                      : 'border-white hover:scale-108'
                  }`}
                  style={{ backgroundColor: col.hex }}
                />
              ))}

              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] font-bold text-slate-500">Custom:</span>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-7 w-8 rounded-md border border-slate-300 cursor-pointer p-0.5 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 px-5 py-2 text-xs font-black text-white shadow-md hover:from-indigo-500 hover:to-teal-500 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? 'Saving Theme...' : 'Apply & Save Theme'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
