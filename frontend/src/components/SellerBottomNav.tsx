import React from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, MessageSquare, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SellerBottomNavProps {
  storeId: string | number
  activeTab?: string
}

export default function SellerBottomNav({ storeId, activeTab }: SellerBottomNavProps) {
  const { t } = useTranslation()
  const [unreadCount, setUnreadCount] = React.useState<number>(0)
  const [newOrderCount, setNewOrderCount] = React.useState<number>(0)
  const [wsConnected, setWsConnected] = React.useState(false)

  React.useEffect(() => {
    if (!storeId) return

    const fetchCount = () => {
      if (document.hidden) return
      import('../services/api').then(({ default: api }) => {
        if (!wsConnected) {
          api.get(`/seller/stores/${storeId}/chat-count/`)
            .then(res => setUnreadCount(res.data.unread_count || 0))
            .catch(() => {})
          api.get(`/seller/stores/${storeId}/whatsapp-orders/count/`)
            .then(res => setNewOrderCount(res.data.new_orders_count || 0))
            .catch(() => {})
        }
      })
    }

    fetchCount()
    window.addEventListener('qs-chat-count-updated', fetchCount)
    window.addEventListener('qs-order-count-updated', fetchCount)
    const interval = window.setInterval(fetchCount, 60000)
    const handleWsStatus = (event: Event) => {
      const detail = (event as CustomEvent).detail || {}
      if (String(detail.storeId) === String(storeId)) setWsConnected(Boolean(detail.connected))
    }
    window.addEventListener('qs-seller-ws-status', handleWsStatus)

    return () => {
      window.removeEventListener('qs-chat-count-updated', fetchCount)
      window.removeEventListener('qs-order-count-updated', fetchCount)
      window.removeEventListener('qs-seller-ws-status', handleWsStatus)
      window.clearInterval(interval)
    }
  }, [storeId, wsConnected])

  const tabs = [
    {
      key: 'dashboard',
      matchKeys: ['dashboard', 'products', 'inventory', 'manage', 'setup'],
      label: t('setup'),
      icon: LayoutDashboard,
      path: `/stores/${storeId}/manage`,
    },
    {
      key: 'orders',
      matchKeys: ['orders', 'requests'],
      label: t('orders'),
      icon: ShoppingBag,
      path: `/stores/${storeId}/orders`,
      badge: 'orders',
    },
    {
      key: 'chat',
      matchKeys: ['chat'],
      label: t('chat'),
      icon: MessageSquare,
      path: `/stores/${storeId}/chat`,
      badge: 'chat',
    },
    {
      key: 'analytics',
      matchKeys: ['analytics', 'payments', 'coupons'],
      label: t('analytics'),
      icon: BarChart3,
      path: `/stores/${storeId}/analytics`,
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-slate-200 bg-white/95 px-2 sm:px-6 pt-1 pb-1 sm:py-1.5 backdrop-blur-2xl shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
      style={{
        paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))'
      }}
    >
      {/* Sleek Top Neon Stroke */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-seller-300 via-seller-500 to-seller-400" />

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
                  ? 'bg-seller-50 text-seller-700 font-black border border-seller-100 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              {/* Active top glow indicator */}
              {isActive && (
                <span className="absolute -top-1 sm:-top-1.5 h-0.5 w-6 sm:w-12 rounded-full bg-seller-500" />
              )}

              {/* Icon container */}
              <div className="relative flex items-center justify-center shrink-0">
                <Icon
                  className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform duration-200 ${
                    isActive
                      ? 'scale-105 text-seller-600'
                      : 'group-hover:scale-105 group-hover:text-slate-800'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />

                {/* Live Unread Badge */}
                {(tab.badge === 'orders' ? newOrderCount : unreadCount) > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 text-white font-black text-[8px] px-0.5 border border-white shadow-xs animate-pulse">
                    {(tab.badge === 'orders' ? newOrderCount : unreadCount) > 99 ? '99+' : (tab.badge === 'orders' ? newOrderCount : unreadCount)}
                  </span>
                ) : tab.badge ? (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-seller-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-seller-500 border border-white"></span>
                  </span>
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`mt-0.5 sm:mt-0 sm:ml-2 text-[10px] sm:text-xs tracking-tight transition-colors ${
                  isActive ? 'text-seller-700 font-black' : 'text-slate-500 group-hover:text-slate-800 font-bold'
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
