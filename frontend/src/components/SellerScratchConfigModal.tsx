import React, { useState } from 'react'
import { Gift, Save, X, Sparkles, DollarSign, Percent, Check } from 'lucide-react'
import { ScratchCardConfig } from './CustomerScratchCardModal'

interface SellerScratchConfigModalProps {
  storeId: number
  currentConfig: ScratchCardConfig
  onSave: (newConfig: ScratchCardConfig) => void
  onClose: () => void
}

export default function SellerScratchConfigModal({ currentConfig, onSave, onClose }: SellerScratchConfigModalProps) {
  const [enabled, setEnabled] = useState(currentConfig.enabled)
  const [title, setTitle] = useState(currentConfig.title)
  const [rewardText, setRewardText] = useState(currentConfig.rewardText)
  const [couponCode, setCouponCode] = useState(currentConfig.couponCode)
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(currentConfig.discountType)
  const [discountValue, setDiscountValue] = useState(currentConfig.discountValue)
  const [minOrder, setMinOrder] = useState(currentConfig.minOrder)
  const [saved, setSaved] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updated: ScratchCardConfig = {
      enabled,
      title,
      rewardText,
      couponCode: couponCode.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrder: Number(minOrder)
    }
    onSave(updated)
    setSaved(true)
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-white my-auto flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Scratch Card Reward Settings</h3>
              <p className="text-[11px] text-slate-400">Configure welcome gift cards for store visitors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Toggle Enable */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <p className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" /> Enable Scratch Card Popup
              </p>
              <p className="text-[11px] text-slate-400">Show reward scratch card to new store visitors</p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Title & Reward Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Scratch Card Modal Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 🎉 Scratch & Win Welcome Gift!"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reward Highlight Text (Revealed Prize)</label>
            <input
              type="text"
              value={rewardText}
              onChange={e => setRewardText(e.target.value)}
              placeholder="e.g. Flat ₹50 OFF on orders above ₹299"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount Type</label>
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${discountType === 'fixed' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400'}`}
                >
                  <DollarSign className="h-3.5 w-3.5" /> Fixed (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${discountType === 'percentage' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400'}`}
                >
                  <Percent className="h-3.5 w-3.5" /> Percentage (%)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount Value</label>
              <input
                type="number"
                value={discountValue}
                onChange={e => setDiscountValue(Number(e.target.value))}
                placeholder="50"
                min="1"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Coupon Code & Min Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coupon Code</label>
              <input
                type="text"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="LUCKY50"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono font-black text-amber-400 focus:outline-none focus:border-amber-500 uppercase"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Min Order Value (₹)</label>
              <input
                type="number"
                value={minOrder}
                onChange={e => setMinOrder(Number(e.target.value))}
                placeholder="299"
                min="0"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saved}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Scratch Card Settings Saved!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Scratch Card Config</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
