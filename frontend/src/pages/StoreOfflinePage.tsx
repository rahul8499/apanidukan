import React from 'react'
import { Link } from 'react-router-dom'
import { Store, ArrowLeft, ShoppingBag, Clock } from 'lucide-react'

export default function StoreOfflinePage() {
  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 text-center shadow-2xl space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 text-3xl border border-amber-500/30">
          🏪
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white">Store Under Maintenance</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            This store is currently offline. The seller will be back soon. Please check back later.
          </p>
        </div>
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-left text-xs text-emerald-200 space-y-1">
          <p className="font-bold text-emerald-300 flex items-center gap-1">
            <span>🛡️</span>
            <span>Your Existing Orders Are Safe!</span>
          </p>
          <p className="text-[11px] text-emerald-200/90 leading-snug">
            Aapke placed orders safe hain. Seller dwara normally process ho rahe hain.
          </p>
        </div>
        <Link
          to="/orders/track"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md"
        >
          <span>Track Existing Order</span>
        </Link>
      </div>
    </div>
  )
}
