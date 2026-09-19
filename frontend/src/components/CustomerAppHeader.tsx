import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Star } from 'lucide-react'
import NotificationBellHeader from './NotificationBellHeader'
import CustomerFavoritesModal from './CustomerFavoritesModal'
import { useCustomerFavorites } from '../utils/customerFavorites'

export default function CustomerAppHeader({ subtitle = 'Shop near you' }: { subtitle?: string }) {
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)
  const { count } = useCustomerFavorites()

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 border-b border-slate-200/70 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 py-2.5 sm:px-6 sm:py-3">
          <Link to="/customer-home" className="flex items-center gap-2 group cursor-pointer" aria-label="Apani Dukan Home">
            <img
              src="/apanidukan-customer-logo.png"
              alt="Apani Dukan"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Favorite Stores Button */}
            <button
              type="button"
              onClick={() => setShowFavoritesModal(true)}
              className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                count > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-500 shadow-xs shadow-amber-500/10'
                  : 'border-slate-200/80 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50/40 shadow-xs'
              }`}
              aria-label="My Favorite Stores"
              title="My Favorite Stores"
            >
              <Star className={`h-4.5 w-4.5 ${count > 0 ? 'fill-amber-400 text-amber-500' : ''}`} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white shadow-xs">
                  {count}
                </span>
              )}
            </button>

            <NotificationBellHeader className="text-slate-700" />
            <Link
              to="/customer-orders"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-xs hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/50 transition active:scale-95"
              aria-label="My orders"
              title="My Orders"
            >
              <ClipboardList className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>
      </header>

      <CustomerFavoritesModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
      />
    </>
  )
}
