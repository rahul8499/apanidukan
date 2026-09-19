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
      <header className="flex items-center justify-between gap-3 pb-4">
        <Link to="/customer-home" className="flex min-w-0 items-center gap-2.5" aria-label="Apani Dukan customer home">
          <img src="/customer-icon-512.png" alt="Apani Dukan Customer" className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200 sm:h-14 sm:w-14" />
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">Apani Dukan</p>
            <p className="truncate text-[9px] font-black uppercase tracking-wider text-orange-500">Customer marketplace · {subtitle}</p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {/* Favorite Stores Button */}
          <button
            type="button"
            onClick={() => setShowFavoritesModal(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50/50 transition cursor-pointer active:scale-95"
            aria-label="My Favorite Stores"
            title="My Favorite Stores"
          >
            <Star className={`h-4.5 w-4.5 ${count > 0 ? 'fill-amber-400 text-amber-500' : 'text-slate-600'}`} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white shadow-xs animate-in zoom-in">
                {count}
              </span>
            )}
          </button>

          <NotificationBellHeader className="text-slate-700" />
          <Link to="/customer-orders" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition" aria-label="My orders">
            <ClipboardList className="h-4.5 w-4.5" />
          </Link>
        </div>
      </header>

      <CustomerFavoritesModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
      />
    </>
  )
}
