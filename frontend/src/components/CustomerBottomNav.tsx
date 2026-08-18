import React from 'react'
import { Link } from 'react-router-dom'
import { useStoreCart } from '../context/StoreCartContext'
import { Home, ShoppingCart, PackageCheck, MessageCircle } from 'lucide-react'

export default function CustomerBottomNav({ storeSlug, active }: { storeSlug: string; active?: 'home' | 'shop' | 'cart' | 'orders' | 'chat' }) {
  const cart = useStoreCart()

  const tabs = [
    { key: 'home', label: 'Home', icon: Home, path: `/store/${storeSlug}` },
    { key: 'cart', label: 'Cart', icon: ShoppingCart, path: `/store/${storeSlug}/cart`, badge: cart.count },
    { key: 'orders', label: 'Orders', icon: PackageCheck, path: `/store/${storeSlug}/orders` },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-800/80 bg-slate-950/95 px-2.5 sm:px-8 pt-2.5 pb-8 sm:py-2.5 backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
      style={{
        paddingBottom: typeof window !== 'undefined' && window.innerWidth >= 640 ? '0.625rem' : 'max(2.4rem, env(safe-area-inset-bottom))'
      }}
    >
      {/* Animated Neon Ambient Gradient Top Stroke */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500/0 via-indigo-400/80 via-purple-400/80 to-violet-500/0 shadow-[0_0_15px_#6366f1]" />

      <div className="mx-auto flex w-full max-w-7xl items-center justify-around gap-1.5 sm:gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.key

          return (
            <Link
              key={tab.key}
              to={tab.path}
              className={`group relative flex flex-1 flex-col sm:flex-row items-center justify-center py-1.5 sm:py-2 px-1.5 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-b sm:bg-gradient-to-r from-indigo-500/25 via-purple-500/15 to-violet-500/15 text-indigo-200 font-black shadow-[0_0_20px_rgba(99,102,241,0.25)] border border-indigo-500/40'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100 font-medium'
              }`}
            >
              {/* Active top glow indicator bar */}
              {isActive && (
                <span className="absolute -top-1.5 sm:-top-2 h-1 w-8 sm:w-16 rounded-full bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400 shadow-[0_0_14px_#6366f1]" />
              )}

              {/* Icon container */}
              <div className="relative flex items-center justify-center shrink-0">
                <Icon
                  className={`h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-300 ${
                    isActive
                      ? 'scale-110 text-indigo-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.9)]'
                      : 'group-hover:scale-105 group-hover:text-slate-200'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.9}
                />

                {/* Notification Badge */}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-white font-black text-[9px] px-1 border border-slate-950 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-1 sm:mt-0 sm:ml-2.5 text-[11px] sm:text-xs tracking-wide transition-colors ${
                  isActive ? 'text-indigo-200 font-black' : 'text-slate-400 group-hover:text-slate-200 font-bold'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* Live Chat Trigger Button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('qs-open-chat'))}
          className={`group relative flex flex-1 flex-col sm:flex-row items-center justify-center py-1.5 sm:py-2 px-1.5 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 ${
            active === 'chat'
              ? 'bg-gradient-to-b sm:bg-gradient-to-r from-indigo-500/25 via-purple-500/15 to-violet-500/15 text-indigo-200 font-black shadow-[0_0_20px_rgba(99,102,241,0.25)] border border-indigo-500/40'
              : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100 font-medium'
          }`}
        >
          {active === 'chat' && (
            <span className="absolute -top-1.5 sm:-top-2 h-1 w-8 sm:w-16 rounded-full bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400 shadow-[0_0_14px_#6366f1]" />
          )}
          <div className="relative flex items-center justify-center shrink-0">
            <MessageCircle
              className={`h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-300 ${
                active === 'chat'
                  ? 'scale-110 text-indigo-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.9)]'
                  : 'group-hover:scale-105 group-hover:text-slate-200'
              }`}
              strokeWidth={active === 'chat' ? 2.5 : 1.9}
            />
          </div>
          <span
            className={`mt-1 sm:mt-0 sm:ml-2.5 text-[11px] sm:text-xs tracking-wide transition-colors ${
              active === 'chat' ? 'text-indigo-200 font-black' : 'text-slate-400 group-hover:text-slate-200 font-bold'
            }`}
          >
            Chat
          </span>
        </button>
      </div>
    </nav>
  )
}
