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
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const steps = [
    {
      id: 'step1',
      badge: 'Step 01',
      title: '🌐 WhatsApp & Counter QR Standee',
      subtitle: 'Order phone save karein & Official Standee Poster print karein.',
      icon: QrCode,
      gradient: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      accentColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
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
      gradient: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      accentColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
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
      gradient: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      accentColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
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
      gradient: 'from-purple-600 to-pink-600',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
      accentColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      bullets: [
        'Seller Catalog me har product par 📲 Share button se WhatsApp par promo bhejein.',
        '📋 Copy Link se single product URL kisi ko bhi directly bhejein.',
        '🔔 Naye customer order aane par Soundbell alert bajega.'
      ]
    }
  ]

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true)
    try {
      if (storeId) {
        localStorage.setItem(`qs_hide_seller_tour_${storeId}`, 'true')
        await api.patch(`/stores/${storeId}/`, { has_seen_onboarding_tour: true }).catch(() => {})
      }
    } catch {}
    finally {
      setSaving(false)
      if (onDismissPermanently) {
        onDismissPermanently()
      }
      onClose()
    }
  }

  const current = steps[activeStep]
  const progressPercent = ((activeStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 font-sans animate-fade-in bg-slate-900/60 backdrop-blur-md">
      {/* Outer Clean White Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 flex flex-col">
        
        {/* Top Progress Line */}
        <div className="w-full bg-slate-100 h-1.5 relative overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${current.gradient} transition-all duration-500 ease-out`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Clean White Header Section */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-white relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${current.badgeBg}`}>
                <Sparkles className="h-3 w-3" />
                <span>Apani Dukan Tour</span>
              </span>
              <span className="text-[11px] font-extrabold text-slate-500">
                Step {activeStep + 1} of {steps.length}
              </span>
            </div>

            <button
              onClick={handleFinish}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer border border-slate-200 shrink-0"
              title="Close Tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title & Icon */}
          <div className="flex items-start gap-3">
            <div className={`h-11 w-11 shrink-0 rounded-2xl ${current.iconBg} border border-slate-200/80 p-2 shadow-xs flex items-center justify-center`}>
              <current.icon className={`h-6 w-6 ${current.accentColor}`} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                {current.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-normal">
                {current.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[55vh] overflow-y-auto bg-slate-50/50">
          
          {/* Step Bullets List */}
          <div className="space-y-2.5">
            {current.bullets.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-2xl bg-white border border-slate-200/90 p-3.5 text-xs text-slate-800 shadow-2xs transition-all hover:border-slate-300"
              >
                <CheckCircle2 className={`h-4.5 w-4.5 ${current.accentColor} shrink-0 mt-0.5`} />
                <span className="leading-relaxed font-semibold text-slate-800">{bullet}</span>
              </div>
            ))}
          </div>

          {/* Pro Tip Callout Card */}
          <div className="rounded-2xl bg-amber-50/90 border border-amber-200/90 p-3.5 text-xs text-amber-900 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
              <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Pro Tip for Sellers:</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium pl-5">
              Dukaan ko hamesha <strong className="text-emerald-700">🟢 LIVE</strong> mode me rakhein aur WhatsApp number updated rakhein taaki customer orders direct aap तक pahuche!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/90 p-4 space-y-3">
          
          {/* Step Pills */}
          <div className="flex items-center justify-center w-full px-1">
            <div className="flex items-center gap-1">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === activeStep ? 'w-5 bg-indigo-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
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
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              >
                Back
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => prev + 1)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-black text-white hover:opacity-95 transition-all shadow-md cursor-pointer"
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
