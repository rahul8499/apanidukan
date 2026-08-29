import React, { useState } from 'react'
import { Sparkles, X, QrCode, Package, Share2, CheckCircle2, ChevronRight, ArrowRight, Lightbulb } from 'lucide-react'
import api from '../services/api'

interface SellerOnboardingGuideModalProps {
  isOpen: boolean
  onClose: () => void
  storeId?: string | number
  onDismissPermanently?: () => void
}

export default function SellerOnboardingGuideModal({
  isOpen,
  onClose,
  storeId,
  onDismissPermanently
}: SellerOnboardingGuideModalProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const steps = [
    {
      id: 'step1',
      badge: 'Step 01',
      title: '🌐 WhatsApp & Counter QR Standee',
      subtitle: 'Order phone save karein & Official Standee Poster print karein.',
      icon: QrCode,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      accentColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      bullets: [
        'WhatsApp Order Number save karein jisse direct customer orders aayenge.',
        'Official Store Link copy karke customers ya WhatsApp status par share karein.',
        '🖨️ QR Standee button se HD print poster print karke shop counter par lagayein.'
      ]
    },
    {
      id: 'step2',
      badge: 'Step 02',
      title: '📦 Product Categories (वर्गीकरण)',
      subtitle: 'Dukaan ke items ko categories me organize karein.',
      icon: Package,
      gradient: 'from-amber-500 via-orange-600 to-red-600',
      accentColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      bullets: [
        'Category name type karke instant category create karein.',
        'Electronics, Kirana, Mobiles, Garments jaisi multiple categories add karein.',
        'Categories se customers ko aapka dukaan browse karna aur shopping karna aasan hota hai.'
      ]
    },
    {
      id: 'step3',
      badge: 'Step 03',
      title: '⚡ Add & Publish Products',
      subtitle: 'Single product instantly publish karein (Photo optional).',
      icon: Sparkles,
      gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
      accentColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bullets: [
        'Product Name, Price (₹) aur Stock Quantity enter karein.',
        'Ordering Unit choose karein (Pieces/नग, Kg, Liters, Meters, Box).',
        '🖼️ Product Photos add karna OPTIONAL hai - bina photo ke bhi publish kar sakte hain.'
      ]
    },
    {
      id: 'step4',
      badge: 'Step 04',
      title: '📲 1-Click WhatsApp Share & Orders',
      subtitle: 'Har product ki direct share link aur sound order alerts.',
      icon: Share2,
      gradient: 'from-purple-600 via-pink-600 to-rose-600',
      accentColor: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      bullets: [
        'Seller Catalog me har product par 📲 Share button se WhatsApp par promo bhejein.',
        '📋 Copy Link se single product URL kisi ko bhi directly bhejein.',
        '🔔 Naye customer order aane par Soundbell alert bajega.'
      ]
    }
  ]

  const handleFinish = async () => {
    setSaving(true)
    try {
      if (storeId) {
        localStorage.setItem(`qs_hide_seller_tour_${storeId}`, 'true')
        if (dontShowAgain) {
          await api.patch(`/stores/${storeId}/`, { has_seen_onboarding_tour: true }).catch(() => {})
        }
      }
    } catch {}
    finally {
      setSaving(false)
      if (dontShowAgain && onDismissPermanently) {
        onDismissPermanently()
      }
      onClose()
    }
  }

  const current = steps[activeStep]
  const progressPercent = ((activeStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 font-sans animate-fade-in bg-slate-950/85 backdrop-blur-xl">
      {/* Outer Glow Ring Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-slate-100 flex flex-col">
        
        {/* Top Slim Ambient Progress Line */}
        <div className="w-full bg-slate-800 h-1 relative overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${current.gradient} transition-all duration-500 ease-out`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Clean Header Section */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-800/80 bg-slate-900/90 relative">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-400">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                <span>Apani Dukan Tour</span>
              </span>
              <span className="text-[11px] font-extrabold text-slate-400">
                Step {activeStep + 1} of {steps.length}
              </span>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700/60 shrink-0"
              title="Close Tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title & Badge */}
          <div className="flex items-start gap-3">
            <div className={`h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br ${current.gradient} p-0.5 shadow-lg flex items-center justify-center`}>
              <div className="h-full w-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <current.icon className={`h-5 w-5 ${current.accentColor}`} />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                {current.title}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5 leading-normal">
                {current.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[55vh] overflow-y-auto bg-slate-950/40">
          
          {/* Step Bullets List */}
          <div className="space-y-2.5">
            {current.bullets.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-2xl bg-slate-850/80 border border-slate-800 p-3.5 text-xs text-slate-200 transition-all hover:border-slate-700"
              >
                <CheckCircle2 className={`h-4 w-4 ${current.accentColor} shrink-0 mt-0.5`} />
                <span className="leading-relaxed font-semibold text-slate-200">{bullet}</span>
              </div>
            ))}
          </div>

          {/* Pro Tip Callout Card */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 p-3.5 text-xs text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-400">
              <Lightbulb className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Pro Tip for Sellers:</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed font-medium pl-5">
              Dukaan ko hamesha <strong className="text-emerald-400">🟢 LIVE</strong> mode me rakhein aur WhatsApp number updated rakhein taaki customer orders direct aap tak pahuche!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-900/95 p-4 space-y-3">
          
          {/* Don't show again toggle */}
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer"
              />
              <span>Don't show this tour again on login</span>
            </label>

            {/* Step Pills */}
            <div className="flex items-center gap-1">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === activeStep ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev - 1)}
                className="flex-1 rounded-xl border border-slate-700/80 bg-slate-800 py-2.5 text-xs font-extrabold text-slate-300 hover:bg-slate-750 hover:text-white transition-all cursor-pointer"
              >
                Back
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev + 1)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-black text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 py-2.5 text-xs font-black text-white hover:opacity-95 transition-all shadow-lg cursor-pointer"
              >
                <span>🚀 Start Managing Shop</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
