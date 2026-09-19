import React from 'react'
import { Link } from 'react-router-dom'
import { Star, X, Store as StoreIcon, MapPin, ExternalLink, Trash2 } from 'lucide-react'
import { useCustomerFavorites, FavoriteStoreItem } from '../utils/customerFavorites'

interface CustomerFavoritesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CustomerFavoritesModal({ isOpen, onClose }: CustomerFavoritesModalProps) {
  const { favorites, count, removeFavorite } = useCustomerFavorites()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-3.5 text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <Star className="h-4.5 w-4.5 fill-amber-200 text-amber-100" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-tight text-white sm:text-base">My Favorite Stores</h2>
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black text-white">
                  {count}
                </span>
              </div>
              <p className="text-[10px] font-medium text-amber-100">Aapki pasandida dukaanein ek jagah</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {favorites.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 border border-amber-100 shadow-sm">
                <Star className="h-8 w-8 fill-amber-100 text-amber-400" />
              </div>
              <h3 className="mt-4 text-sm font-black text-slate-800">Koi favorite store nahi mila</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Kisi bhi store card par bane Star (★) icon par click karke use yahan bookmark karein.
              </p>
              <Link
                to="/customer-stores"
                onClick={onClose}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-sm transition"
              >
                <StoreIcon className="h-3.5 w-3.5" />
                Stores Explore Karein →
              </Link>
            </div>
          ) : (
            favorites.map((store: FavoriteStoreItem) => (
              <div
                key={store.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xs hover:border-amber-200 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 border border-slate-100">
                    {store.logo ? (
                      <img src={store.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <StoreIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-xs sm:text-sm font-black text-slate-900">{store.name}</h4>
                      <span className="shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-orange-600">
                        {store.business_type || 'Local Store'}
                      </span>
                    </div>
                    {store.address && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-500">
                        <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                        <span className="truncate">{store.address}</span>
                      </p>
                    )}
                    <p className="mt-1 text-[9px] font-bold text-slate-500">
                      {store.allow_home_delivery ? '🚚 Delivery Available' : '🏬 Store Pickup Only'}
                    </p>
                  </div>
                </div>

                <div className="flex w-full sm:w-auto items-center justify-end gap-2 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                  <button
                    onClick={() => removeFavorite(store.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                    title="Favorites se hatayein"
                    aria-label="Remove favorite"
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500 hover:fill-none hover:text-slate-400 transition" />
                  </button>
                  <Link
                    to={`/s/${store.slug}`}
                    onClick={onClose}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-blue-700 shadow-xs active:scale-95 transition"
                  >
                    Visit Store
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {favorites.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-[10px] font-bold text-slate-500">
            Aapke pasandida stores hamesha yahan available rahenge.
          </div>
        )}
      </div>
    </div>
  )
}
