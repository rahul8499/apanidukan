import React from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, MessageSquare, BarChart3 } from 'lucide-react'

interface SellerBottomNavProps {
  storeId: string | number
  activeTab?: string
}

export default function SellerBottomNav({ storeId, activeTab }: SellerBottomNavProps) {
  const [unreadCount, setUnreadCount] = React.useState<number>(0)

  React.useEffect(() => {
    if (!storeId) return

    const fetchCount = () => {
      import('../services/api').then(({ default: api }) => {
         api.get(`/seller/stores/${storeId}/chat-count/`)
           .then(res => setUnreadCount(res.data.unread_count || 0))
           .catch(() => {})
      })
    }

    fetchCount()
    window.addEventListener('qs-chat-count-updated', fetchCount)
    const interval = setInterval(fetchCount, 5000)

    return () => {
      window.removeEventListener('qs-chat-count-updated', fetchCount)
      clearInterval(interval)
    }
  }, [storeId])

  const tabs = [
    {
      key: 'dashboard',
      matchKeys: ['dashboard', 'products', 'inventory', 'manage', 'setup'],
      label: 'Setup',
      icon: LayoutDashboard,
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
      matchKeys: ['analytics', 'payments', 'coupons'],
      label: 'Analytics',
      icon: BarChart3,
      path: `/stores/${storeId}/analytics`,
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-800/80 bg-slate-950/95 px-2 sm:px-6 pt-1 pb-1 sm:py-1.5 backdrop-blur-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      style={{
        paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))'
      }}
    >
      {/* Sleek Top Neon Stroke */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-teal-500/0 via-teal-400/80 to-indigo-500/0 shadow-[0_0_10px_#14b8a6]" />

      <div className="mx-auto flex w-full max-w-5xl items-center justify-around gap-1 sm:gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.matchKeys.includes(activeTab || '')

          return (
            <Link
              key={tab.key}
              to={tab.path}
              className={`group relative flex flex-1 flex-col sm:flex-row items-center justify-center py-1 sm:py-1.5 px-1.5 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-b sm:bg-gradient-to-r from-teal-500/25 via-emerald-500/15 to-cyan-500/15 text-teal-200 font-black border border-teal-500/40 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 font-medium'
              }`}
            >
              {/* Active top glow indicator */}
              {isActive && (
                <span className="absolute -top-1 sm:-top-1.5 h-0.5 w-6 sm:w-12 rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 shadow-[0_0_8px_#14b8a6]" />
              )}

              {/* Icon container */}
              <div className="relative flex items-center justify-center shrink-0">
                <Icon
                  className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform duration-200 ${
                    isActive
                      ? 'scale-105 text-teal-300 drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]'
                      : 'group-hover:scale-105 group-hover:text-slate-200'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />

                {/* Live Unread Badge */}
                {tab.badge && unreadCount > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 text-white font-black text-[8px] px-0.5 border border-slate-950 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  tab.badge && (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400 border border-slate-950"></span>
                    </span>
                  )
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-0.5 sm:mt-0 sm:ml-2 text-[10px] sm:text-xs tracking-tight transition-colors ${
                  isActive ? 'text-teal-200 font-black' : 'text-slate-400 group-hover:text-slate-200 font-bold'
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
