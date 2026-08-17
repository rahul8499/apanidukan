import React from 'react'
import { Link } from 'react-router-dom'
import {
  SlidersHorizontal,
  ShoppingBag,
  MessageSquare,
  BarChart3
} from 'lucide-react'

interface SellerBottomNavProps {
  storeId: string | number
  activeTab?: string
}

export default function SellerBottomNav({ storeId, activeTab }: SellerBottomNavProps) {
  const [unreadCount, setUnreadCount] = React.useState<number>(() => {
    try {
      const cached = localStorage.getItem(`unread_chat_count_${storeId}`)
      return cached ? parseInt(cached, 10) : 0
    } catch {
      return 0
    }
  })

  React.useEffect(() => {
    if (!storeId) return

    const updateFromCache = () => {
      try {
        const cached = localStorage.getItem(`unread_chat_count_${storeId}`)
        setUnreadCount(cached ? parseInt(cached, 10) : 0)
      } catch {}
    }

    updateFromCache()
    window.addEventListener('unread_chat_updated', updateFromCache)

    return () => {
      window.removeEventListener('unread_chat_updated', updateFromCache)
    }
  }, [storeId])

  const tabs = [
    {
      key: 'setup',
      matchKeys: ['setup', 'catalog'],
      label: 'Setup',
      icon: SlidersHorizontal,
      path: `/stores/${storeId}/manage`,
    },
    {
      key: 'orders',
      matchKeys: ['orders', 'requests'],
      label: 'Orders',
      icon: ShoppingBag,
      path: `/stores/${storeId}/orders`,
    },
    {
      key: 'chat',
      matchKeys: ['chat'],
      label: 'Chat',
      icon: MessageSquare,
      path: `/stores/${storeId}/chat`,
      badge: true,
    },
    {
      key: 'analytics',
      matchKeys: ['analytics', 'payments'],
      label: 'Analytics',
      icon: BarChart3,
      path: `/stores/${storeId}/analytics`,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-800/80 bg-slate-950/95 px-3 sm:px-8 py-2.5 sm:py-3 backdrop-blur-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.7)]">
      {/* Animated Neon Ambient Gradient Top Stroke */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-teal-500/0 via-teal-400/80 via-cyan-400/80 to-indigo-500/0 shadow-[0_0_15px_#14b8a6]" />

      <div className="mx-auto flex w-full max-w-7xl items-center justify-around gap-2 sm:gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.matchKeys.includes(activeTab)

          return (
            <Link
              key={tab.key}
              to={tab.path}
              className={`group relative flex flex-1 flex-col sm:flex-row items-center justify-center py-2 sm:py-2.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-b sm:bg-gradient-to-r from-teal-500/25 via-cyan-500/15 to-indigo-500/15 text-teal-200 font-black shadow-[0_0_20px_rgba(20,184,166,0.2)] border border-teal-500/40'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100 font-medium'
              }`}
            >
              {/* Active top glow indicator bar */}
              {isActive && (
                <span className="absolute -top-2.5 sm:-top-3 h-1 w-10 sm:w-16 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400 shadow-[0_0_14px_#14b8a6]" />
              )}

              {/* Icon container */}
              <div className="relative flex items-center justify-center shrink-0">
                <Icon
                  className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 ${
                    isActive
                      ? 'scale-110 text-teal-300 drop-shadow-[0_0_10px_rgba(20,184,166,0.9)]'
                      : 'group-hover:scale-105 group-hover:text-slate-200'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />

                {/* WhatsApp-Style Unread Counter Badge */}
                {tab.key === 'chat' && unreadCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] px-1 border border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  tab.badge && unreadCount === 0 && (
                    <span className="absolute -right-1.5 -top-1 sm:-right-2 sm:-top-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400 border border-slate-950 shadow-[0_0_6px_#14b8a6]"></span>
                    </span>
                  )
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-1 sm:mt-0 sm:ml-2.5 text-[11px] sm:text-xs tracking-wide transition-colors ${
                  isActive ? 'text-teal-200 font-black' : 'text-slate-400 group-hover:text-slate-200 font-semibold'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
