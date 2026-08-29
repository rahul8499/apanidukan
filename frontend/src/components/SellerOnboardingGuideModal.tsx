import React, { useState } from 'react'
import { Sparkles, X, QrCode, Package, Share2, Bell, CheckCircle2, ChevronRight, Play } from 'lucide-react'
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
      color: 'from-blue-600 to-indigo-700',
      bullets: [
        'WhatsApp Order Number save karein jisse direct orders aayenge.',
        'Official Store Link copy karke customers ya WhatsApp status par share karein.',
        '🖨️ QR Standee button se HD print poster print karke counter par lagayein.'
      ]
    },
    {
      id: 'step2',
      badge: 'Step 02',
      title: '📦 Product Categories (वर्गीकरण)',
      subtitle: 'Dukaan ke aytem ko categories me organize karein.',
      icon: Package,
      color: 'from-amber-600 to-orange-600',
      bullets: [
        'Category name type karke instant category create karein.',
        'Electronics, Kirana, Mobiles, Garments jaisi multiple categories add karein.',
        'Categories se customer ko aapka dukaan browse karne me aasan hota hai.'
      ]
    },
    {
      id: 'step3',
      badge: 'Step 03',
      title: '⚡ Add & Publish Products',
      subtitle: 'Single product instantly publish karein (Photo optional).',
      icon: Sparkles,
      color: 'from-emerald-600 to-teal-700',
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
      color: 'from-purple-600 to-pink-700',
      bullets: [
        'Seller Catalog me har product par 📲 Share button se WhatsApp par promo bhejein.',
        '📋 Copy Link se single product URL kisi ko bhi bhejein.',
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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 font-sans animate-fade-in bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-white">
        
        {/* Header Banner */}
        <div className={`bg-gradient-to-r ${current.color} p-4 sm:p-5 text-white relative transition-all duration-300`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase backdrop-blur-xs">
              {current.badge}
            </span>
            <span className="text-[10px] text-white/80 font-bold">Apani Dukan Seller Tour</span>
          </div>

          <h2 className="text-base sm:text-lg font-black tracking-tight mt-1 flex items-center gap-2">
            <current.icon className="h-5 w-5 shrink-0" />
            <span>{current.title}</span>
          </h2>
          <p className="text-xs text-white/90 font-medium mt-0.5">{current.subtitle}</p>

          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 mt-3">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveStep(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeStep ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2.5">
            {current.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3 text-xs text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{bullet}</span>
              </div>
            ))}
          </div>

          {/* Quick Tip Box */}
          <div className="rounded-2xl bg-indigo-950/50 border border-indigo-500/30 p-3 text-xs text-indigo-200 space-y-1">
            <p className="font-extrabold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Pro Tip for Sellers:</span>
            </p>
            <p className="text-[11px] text-indigo-200/90 leading-snug">
              Dukaan ko hamesha <strong>🟢 LIVE</strong> mode me rakhein aur WhatsApp number updated rakhein taaki orders direct aapko milein!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950/90 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Don't show this tour again on login</span>
            </label>

            <span className="text-[10px] font-bold text-slate-500">
              {activeStep + 1} of {steps.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev - 1)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Back
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev + 1)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-black text-white hover:opacity-90 transition-all shadow-md cursor-pointer"
              >
                <span>🚀 Start Managing Shop</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
