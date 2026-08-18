import React, { useState } from 'react'
import {
  X, MessageSquare, Send, Users, Sparkles, Copy, Check,
  Tag
} from 'lucide-react'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'

interface CustomerRecord {
  phone: string
  name: string
  ordersCount: number
  totalSpent: number
  lastOrderDate?: string
}

interface WhatsAppMarketingCrmModalProps {
  store: any
  customers: CustomerRecord[]
  coupons: any[]
  onClose: () => void
}

type SegmentType = 'ALL' | 'VIP' | 'LAPSED' | 'NEW'

export default function WhatsAppMarketingCrmModal({
  store,
  customers,
  coupons,
  onClose,
}: WhatsAppMarketingCrmModalProps) {
  const [selectedSegment, setSelectedSegment] = useState<SegmentType>('VIP')
  const [selectedCoupon, setSelectedCoupon] = useState<string>(coupons[0]?.code || 'WELCOME50')
  const [customDiscountText, setCustomDiscountText] = useState('15% OFF')
  const [customNote, setCustomNote] = useState('Special exclusive gift for you on your next order!')
  const [copiedMsg, setCopiedMsg] = useState(false)
  const [copiedPhones, setCopiedPhones] = useState(false)

  // Segment customers
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const segmentedCustomers = customers.filter((c) => {
    const isRepeat = (c.ordersCount || 0) >= 2 || Number(c.totalSpent || 0) >= 1500
    const isNew = (c.ordersCount || 0) === 1
    const lastDate = c.lastOrderDate ? new Date(c.lastOrderDate) : null
    const isLapsed = lastDate ? lastDate < fourteenDaysAgo : false

    if (selectedSegment === 'VIP') return isRepeat
    if (selectedSegment === 'NEW') return isNew
    if (selectedSegment === 'LAPSED') return isLapsed
    return true
  })

  // Template pre-sets
  const handleSelectSegment = (seg: SegmentType) => {
    setSelectedSegment(seg)
    if (seg === 'VIP') {
      setCustomDiscountText('FLAT 20% OFF')
      setCustomNote('Thank you for being our VIP customer! Enjoy this special offer.')
    } else if (seg === 'LAPSED') {
      setCustomDiscountText('FLAT 15% OFF')
      setCustomNote('We missed you! It’s been a while since your last order.')
    } else if (seg === 'NEW') {
      setCustomDiscountText('FLAT 10% OFF')
      setCustomNote('Thank you for shopping with us! Here is a welcome bonus.')
    } else {
      setCustomDiscountText('SPECIAL OFFER')
      setCustomNote('Check out our new arrivals & exclusive deals today!')
    }
  }

  const buildMessage = (customerName?: string) => {
    const nameStr = customerName ? `Hi ${customerName}!` : 'Hello!'
    const storeLink = `${window.location.origin}/store/${store.slug}`
    const couponStr = selectedCoupon ? `\n🎟️ Use Coupon Code: *${selectedCoupon}*` : ''

    return [
      `${nameStr} 🛍️ *Special Offer from ${store.name}*`,
      ``,
      `🎉 *${customDiscountText}* on your entire cart!`,
      `${customNote}`,
      `${couponStr}`,
      ``,
      `🛒 Shop Online Directly Here:`,
      `${storeLink}`,
      ``,
      `⏱️ Express Doorstep Delivery & COD Available.`
    ].join('\n')
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(buildMessage())
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 2000)
  }

  const handleCopyAllPhones = () => {
    const validPhones = segmentedCustomers
      .map(c => formatPhoneForWhatsApp(c.phone))
      .filter(Boolean)
      .join(', ')
    navigator.clipboard.writeText(validPhones)
    setCopiedPhones(true)
    setTimeout(() => setCopiedPhones(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-3.5 sm:px-5 py-3 sm:py-4 text-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-sm sm:text-base border border-emerald-400/30">
              📲
            </span>
            <div>
              <h2 className="text-xs sm:text-base font-black text-white">WhatsApp Marketing & Offers</h2>
              <p className="text-[10px] sm:text-xs text-teal-300 font-medium">
                Send personalized offers & discount coupons directly to customer WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 sm:space-y-4 text-slate-900">

          {/* STEP 1: Select Customer Audience */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                <span>1. Select Target Audience</span>
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                {segmentedCustomers.length} Customers
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {[
                { key: 'VIP', label: '🌟 VIP Customers', desc: '≥ 2 Orders / Top Spend', count: customers.filter(c => (c.ordersCount || 0) >= 2).length },
                { key: 'LAPSED', label: '⏳ Inactive (>14 Days)', desc: 'Needs Re-engagement', count: customers.filter(c => c.lastOrderDate && new Date(c.lastOrderDate) < fourteenDaysAgo).length },
                { key: 'NEW', label: '🆕 1st Time Buyers', desc: '1 Order (Welcome back)', count: customers.filter(c => (c.ordersCount || 0) === 1).length },
                { key: 'ALL', label: '👥 All Customers', desc: 'Full Customer Base', count: customers.length },
              ].map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  onClick={() => handleSelectSegment(seg.key as SegmentType)}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                    selectedSegment === seg.key
                      ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-[11px] sm:text-xs font-black text-slate-900">{seg.label}</p>
                  <p className="text-[9px] text-slate-500 font-medium truncate">{seg.desc}</p>
                  <span className="mt-1 inline-block text-[9px] font-black text-indigo-800 bg-indigo-100 px-1.5 py-0.2 rounded">
                    {seg.count} People
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Configure Offer & Promo Code */}
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
                  value={customDiscountText}
                  onChange={(e) => setCustomDiscountText(e.target.value)}
                  placeholder="e.g. FLAT 20% OFF"
                  className="mt-0.5 w-full rounded-lg sm:rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600">Attach Coupon Code</label>
                <div className="mt-0.5 flex gap-1">
                  <select
                    value={selectedCoupon}
                    onChange={(e) => setSelectedCoupon(e.target.value)}
                    className="w-full rounded-lg sm:rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
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
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-600">Personal Note / Message</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Custom warm note to your customer"
                  className="mt-0.5 w-full rounded-lg sm:rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: Live WhatsApp Chat Bubble Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>3. Live WhatsApp Message Preview</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md hover:bg-emerald-100 flex items-center gap-1 cursor-pointer transition-all"
              >
                {copiedMsg ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedMsg ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="rounded-xl sm:rounded-2xl bg-[#E5DDD5] p-2.5 sm:p-3.5 shadow-inner border border-slate-300 relative overflow-hidden">
              <div className="max-w-md bg-white rounded-xl rounded-tl-xs p-2.5 shadow-xs border border-slate-200/80 space-y-1 text-xs text-slate-900">
                <p className="font-bold text-slate-900">Hi Rahul! 🛍️ <span className="text-emerald-700 font-black">Special Offer from {store.name}</span></p>
                <p className="font-black text-emerald-700">🎉 {customDiscountText} on your entire cart!</p>
                <p className="text-slate-600">{customNote}</p>
                {selectedCoupon && (
                  <p className="font-mono font-black text-indigo-700 bg-indigo-50 p-1 rounded-md border border-indigo-200">
                    🎟️ Use Coupon Code: <span className="underline">{selectedCoupon}</span>
                  </p>
                )}
                <div className="pt-0.5 text-[10px] sm:text-[11px] text-teal-700 font-bold">
                  <p>🛒 Shop Online Directly Here:</p>
                  <p className="underline truncate">{window.location.origin}/store/{store.slug}</p>
                </div>
                <p className="text-[8px] text-slate-400 text-right">12:30 PM ✓✓</p>
              </div>
            </div>
          </div>

          {/* STEP 4: Segmented Customers Broadcast List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                <Send className="h-3.5 w-3.5 text-emerald-600" />
                <span>4. Send Offers ({segmentedCustomers.length})</span>
              </label>
              <button
                type="button"
                onClick={handleCopyAllPhones}
                className="text-[9px] sm:text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-300 px-2 py-0.5 rounded-md hover:bg-indigo-100 flex items-center gap-1 cursor-pointer transition-all"
              >
                {copiedPhones ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedPhones ? 'Copied!' : 'Copy Numbers'}</span>
              </button>
            </div>

            <div className="max-h-48 sm:max-h-56 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
              {segmentedCustomers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 font-medium">
                  No customers found in this segment yet.
                </div>
              ) : (
                segmentedCustomers.map((cust, idx) => {
                  const whatsappUrl = cust.phone
                    ? `https://wa.me/${formatPhoneForWhatsApp(cust.phone)}?text=${encodeURIComponent(buildMessage(cust.name))}`
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
                              {cust.ordersCount} orders
                            </span>
                          </div>
                          <p className="text-[9px] font-mono text-slate-400 truncate">
                            {cust.phone}
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
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3.5 sm:px-5 py-2.5 sm:py-3 shrink-0">
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500">
            💡 Sending coupon offers helps drive repeat orders.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg sm:rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
