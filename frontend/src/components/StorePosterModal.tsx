import React, { useState, useRef } from 'react'
import { Sparkles, Download, Share2, X, Palette, Tag, Check, Image as ImageIcon } from 'lucide-react'

interface StorePosterModalProps {
  store: {
    id: number
    name: string
    slug: string
    logo?: string
    tagline?: string
    phone_number?: string
  }
  publicUrl: string
  onClose: () => void
}

const THEMES = [
  { id: 'emerald', name: 'Royal Emerald', bg: 'from-emerald-950 via-teal-900 to-slate-950', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', accent: 'text-emerald-400', button: 'bg-emerald-600 hover:bg-emerald-500' },
  { id: 'indigo', name: 'Deep Indigo', bg: 'from-indigo-950 via-purple-900 to-slate-950', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', accent: 'text-indigo-400', button: 'bg-indigo-600 hover:bg-indigo-500' },
  { id: 'sunset', name: 'Sunset Gold', bg: 'from-amber-950 via-rose-900 to-slate-950', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', accent: 'text-amber-400', button: 'bg-amber-600 hover:bg-amber-500' },
  { id: 'crimson', name: 'Neon Crimson', bg: 'from-rose-950 via-red-900 to-slate-950', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', accent: 'text-rose-400', button: 'bg-rose-600 hover:bg-rose-500' }
]

export default function StorePosterModal({ store, publicUrl, onClose }: StorePosterModalProps) {
  const [offerTitle, setOfferTitle] = useState('🎉 SPECIAL FESTIVE SALE: FLAT 20% OFF!')
  const [subheading, setSubheading] = useState('On All Prescription Medicines & Wellness Products')
  const [couponCode, setCouponCode] = useState('FESTIVE20')
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0])
  const [copied, setCopied] = useState(false)

  const posterRef = useRef<HTMLDivElement>(null)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}`

  const whatsappCaption = encodeURIComponent(
    `🔥 *${offerTitle}*\n` +
    `📍 *${store.name}*\n` +
    `✨ ${subheading}\n` +
    `🎟️ Use Code: *${couponCode}*\n\n` +
    `📲 *Scan or Click to Order Online:* ${publicUrl}`
  )

  const handleShareWhatsapp = () => {
    window.open(`https://api.whatsapp.com/send?text=${whatsappCaption}`, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-white my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">AI WhatsApp Status Poster Generator</h3>
              <p className="text-[11px] text-slate-400">Generate high-converting offer banners for your WhatsApp status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Theme Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <Palette className="h-3.5 w-3.5 text-indigo-400" /> Choose Poster Theme:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTheme(t)}
                  className={`p-2 rounded-xl border text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${selectedTheme.id === t.id ? 'bg-slate-800 border-indigo-500 text-white shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  <span>{t.name}</span>
                  {selectedTheme.id === t.id && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Offer Headline / Discount Text</label>
              <input
                type="text"
                value={offerTitle}
                onChange={e => setOfferTitle(e.target.value)}
                placeholder="e.g. 🎉 FLAT 20% OFF ON MEDICINES!"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Offer Subheading / Details</label>
              <input
                type="text"
                value={subheading}
                onChange={e => setSubheading(e.target.value)}
                placeholder="e.g. On All Orders Above ₹499"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Promo Coupon Code</label>
              <input
                type="text"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-bold text-amber-400 uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* POSTER PREVIEW CARD (WhatsApp Status 9:16 Format) */}
          <div className="flex justify-center">
            <div
              ref={posterRef}
              className={`w-full max-w-sm rounded-3xl border-4 border-slate-900 bg-gradient-to-b ${selectedTheme.bg} p-6 text-center text-white shadow-2xl space-y-4 relative overflow-hidden`}
            >
              {/* Background Glow Circles */}
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

              {/* Header Badge */}
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${selectedTheme.badge}`}>
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>OFFICIAL WHATSAPP STATUS OFFER</span>
              </div>

              {/* Store Name & Logo */}
              <div className="flex flex-col items-center justify-center">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="h-12 w-12 rounded-2xl object-cover border-2 border-white/20 shadow-md mb-2" />
                ) : (
                  <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-lg font-black text-white shadow-md mb-2">
                    {store.name.charAt(0)}
                  </div>
                )}
                <h2 className="text-xl font-black tracking-tight text-white">{store.name}</h2>
                <p className="text-[11px] font-bold text-slate-300">{store.tagline || 'Shop Online • Fastest Local Delivery'}</p>
              </div>

              {/* Offer Highlight Box */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md space-y-2">
                <h1 className="text-lg sm:text-xl font-black text-amber-300 tracking-tight leading-tight">{offerTitle}</h1>
                <p className="text-xs text-slate-200 font-medium">{subheading}</p>
                
                {couponCode && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-md uppercase tracking-wider">
                      <Tag className="h-3.5 w-3.5" /> CODE: {couponCode}
                    </span>
                  </div>
                )}
              </div>

              {/* QR Code Container */}
              <div className="bg-white/90 p-3 rounded-2xl mx-auto w-40 h-40 flex items-center justify-center shadow-xl ring-2 ring-white/30">
                <img src={qrImageUrl} alt="Store QR" className="w-full h-full object-contain rounded-xl" />
              </div>

              <p className="text-[11px] font-black text-white tracking-wide">
                📲 SCAN QR OR TAP LINK TO CLAIM OFFER!
              </p>

              <div className="pt-2 border-t border-white/10 text-[9px] font-mono text-slate-300 truncate">
                {publicUrl.replace(/^https?:\/\//, '')}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Action Bar */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <ImageIcon className="h-4 w-4 text-slate-400" />}
            <span>{copied ? 'Link Copied!' : 'Copy Store Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsapp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
            <span>📲 Share on WhatsApp Status</span>
          </button>
        </div>

      </div>
    </div>
  )
}
