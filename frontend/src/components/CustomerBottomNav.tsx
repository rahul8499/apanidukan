import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStoreCart } from '../context/StoreCartContext'
import { Home, ShoppingCart, PackageCheck, MessageCircle } from 'lucide-react'
import api from '../services/api'
import { getStoreTheme } from '../utils/storeTheme'

export default function CustomerBottomNav({ storeSlug, active }: { storeSlug: string; active?: 'home' | 'shop' | 'cart' | 'orders' | 'chat' }) {
  const cart = useStoreCart()
  const [storeTheme, setStoreTheme] = useState<any>(() => getStoreTheme(null))

  useEffect(() => {
    if (!storeSlug) return
    api.get(`/public/stores/${storeSlug}/`)
      .then(res => {
        const storeData = res.data.data || res.data
        if (storeData) {
          setStoreTheme(getStoreTheme(storeData))
        }
      })
      .catch(() => {})
  }, [storeSlug])

  const tabs = [
    { key: 'home', label: 'Home', icon: Home, path: `/store/${storeSlug}` },
    { key: 'cart', label: 'Cart', icon: ShoppingCart, path: `/store/${storeSlug}/cart`, badge: cart.count },
    { key: 'orders', label: 'Orders', icon: PackageCheck, path: `/store/${storeSlug}/orders` },
  ]

  const primaryCol = storeTheme?.primary_color || '#6366f1'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-800/80 bg-slate-950/95 px-2.5 sm:px-8 pt-2.5 pb-8 sm:py-2.5 backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
      style={{
        paddingBottom: typeof window !== 'undefined' && window.innerWidth >= 640 ? '0.625rem' : 'max(2.4rem, env(safe-area-inset-bottom))'
      }}
    >
      {/* Dynamic Ambient Stroke matching Theme Accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${primaryCol}, transparent)`,
          boxShadow: `0 0 12px ${primaryCol}`,
        }}
      />

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
                  ? 'text-white font-black shadow-lg'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100 font-medium'
              }`}
              style={isActive ? {
                backgroundColor: `${primaryCol}25`,
                borderColor: `${primaryCol}50`,
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: `0 0 16px ${primaryCol}30`,
              } : undefined}
            >
              {/* Active top glow indicator bar */}
              {isActive && (
                <span
                  className="absolute -top-1.5 sm:-top-2 h-1 w-8 sm:w-16 rounded-full"
                  style={{
                    backgroundColor: primaryCol,
                    boxShadow: `0 0 10px ${primaryCol}`,
                  }}
                />
              )}

              {/* Icon container */}
              <div className="relative flex items-center justify-center shrink-0">
                <Icon
                  className={`h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105 group-hover:text-slate-200'
                  }`}
                  style={isActive ? { color: primaryCol } : undefined}
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
                  isActive ? 'font-black text-white' : 'text-slate-400 group-hover:text-slate-200 font-bold'
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
              ? 'text-white font-black shadow-lg'
              : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100 font-medium'
          }`}
          style={active === 'chat' ? {
            backgroundColor: `${primaryCol}25`,
            borderColor: `${primaryCol}50`,
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: `0 0 16px ${primaryCol}30`,
          } : undefined}
        >
          {active === 'chat' && (
            <span
              className="absolute -top-1.5 sm:-top-2 h-1 w-8 sm:w-16 rounded-full"
              style={{
                backgroundColor: primaryCol,
                boxShadow: `0 0 10px ${primaryCol}`,
              }}
            />
          )}
          <div className="relative flex items-center justify-center shrink-0">
            <MessageCircle
              className={`h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-300 ${
                active === 'chat' ? 'scale-110' : 'group-hover:scale-105 group-hover:text-slate-200'
              }`}
              style={active === 'chat' ? { color: primaryCol } : undefined}
              strokeWidth={active === 'chat' ? 2.5 : 1.9}
            />
          </div>
          <span
            className={`mt-1 sm:mt-0 sm:ml-2.5 text-[11px] sm:text-xs tracking-wide transition-colors ${
              active === 'chat' ? 'font-black text-white' : 'text-slate-400 group-hover:text-slate-200 font-bold'
            }`}
          >
            Chat
          </span>
        </button>
      </div>
    </nav>
  )
}
