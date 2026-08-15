import React from 'react'
import { Link } from 'react-router-dom'
import { useStoreCart } from '../context/StoreCartContext'
import { Home, Grid, ShoppingBag, PackageCheck, MessageCircle } from 'lucide-react'

export default function CustomerBottomNav({ storeSlug, active }: { storeSlug: string; active?: 'home' | 'shop' | 'cart' | 'orders' | 'chat' }){
  const cart = useStoreCart()

  const tabs = [
    { key: 'home', label: 'Home', icon: Home, path: `/store/${storeSlug}` },
    { key: 'shop', label: 'Shop', icon: Grid, path: `/store/${storeSlug}#products` },
    { key: 'cart', label: 'Cart', icon: ShoppingBag, path: `/store/${storeSlug}/cart`, badge: cart.count },
    { key: 'orders', label: 'Orders', icon: PackageCheck, path: `/store/${storeSlug}/orders` },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-200/90 bg-white/95 px-3 sm:px-8 py-2 sm:py-3 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(15,23,42,0.1)]">
      {/* Ambient background glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

      <div className="mx-auto flex w-full max-w-7xl items-center justify-around gap-2 sm:gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.key

          return (
            <Link
              key={tab.key}
              to={tab.path}
              className={`group relative flex flex-1 flex-col sm:flex-row items-center justify-center py-2 sm:py-2.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-indigo-50/90 text-indigo-700 font-extrabold shadow-xs border border-indigo-100'
                  : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute -top-2 sm:-top-3 h-1 w-8 sm:w-14 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
              )}

              <div className="relative flex items-center justify-center shrink-0">
                <Icon
                  className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 ${
                    isActive ? 'scale-110 text-indigo-600' : 'group-hover:scale-105 group-hover:text-slate-700'
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />

                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`mt-1 sm:mt-0 sm:ml-2.5 text-[11px] sm:text-xs font-semibold tracking-wide ${isActive ? 'text-indigo-900 font-extrabold' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* Floating Chat trigger button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('qs-open-chat'))}
          className={`group relative flex flex-1 flex-col sm:flex-row items-center justify-center py-2 sm:py-2.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 ${
            active === 'chat'
              ? 'bg-indigo-50/90 text-indigo-700 font-extrabold shadow-xs border border-indigo-100'
              : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 font-medium'
          }`}
        >
          {active === 'chat' && (
            <span className="absolute -top-2 sm:-top-3 h-1 w-8 sm:w-14 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
          )}
          <div className="relative flex items-center justify-center shrink-0">
            <MessageCircle
              className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 ${
                active === 'chat' ? 'scale-110 text-indigo-600' : 'group-hover:scale-105 group-hover:text-slate-700'
              }`}
              strokeWidth={active === 'chat' ? 2.4 : 1.8}
            />
          </div>
          <span className={`mt-1 sm:mt-0 sm:ml-2.5 text-[11px] sm:text-xs font-semibold tracking-wide ${active === 'chat' ? 'text-indigo-900 font-extrabold' : 'text-slate-500'}`}>
            Chat
          </span>
        </button>
      </div>
    </nav>
  )
}



