import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'

export default function NotificationBellHeader({ className = '' }: { className?: string }) {
  const isSellerRoute = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/stores/') ||
    window.location.pathname === '/dashboard' ||
    window.location.pathname === '/platform'
  )

  const {
    notifications,
    unreadCount,
    showNotifDrawer,
    setShowNotifDrawer,
    permission,
    requestPermission,
    markAllRead,
    clearAll,
    removeNotification,
    addNotification
  } = useNotifications()

  const navigate = useNavigate()

  function testAlert() {
    addNotification({
      type: 'order',
      title: '🎁 Test Live Order Notification',
      body: 'New order #DEMO123 received for ₹499!'
    })
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setShowNotifDrawer(!showNotifDrawer)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 hover:bg-slate-700 text-lg transition-colors cursor-pointer text-white shadow-xs"
        title="Notifications Center"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-md animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifDrawer && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Notification Center</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Real-Time App & Store Alerts</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifDrawer(false)}
                className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {permission !== 'granted' && (
              <div className={`mt-3 flex flex-col gap-1.5 rounded-xl p-2.5 border transition-all ${
                permission === 'denied' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${permission === 'denied' ? 'text-rose-900' : 'text-amber-900'}`}>
                    {permission === 'denied' ? '⚠️ Notifications Blocked' : 'Enable PWA & Browser Push'}
                  </p>
                  <button
                    type="button"
                    onClick={requestPermission}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold text-white shadow-xs transition-all cursor-pointer ${
                      permission === 'denied' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {permission === 'denied' ? 'Fix Block 🔒' : 'Enable 🔔'}
                  </button>
                </div>
                {permission === 'denied' && (
                  <p className="text-[10px] font-medium text-rose-700 leading-snug">
                    Click 🔒 icon near address bar ➔ Site Settings ➔ Allow Notifications ➔ Refresh page.
                  </p>
                )}
              </div>
            )}

            <div className="my-3 flex items-center justify-between gap-2">
              {isSellerRoute && (
                <button
                  type="button"
                  onClick={testAlert}
                  className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                >
                  ⚡ Test Alert
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={markAllRead} className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 cursor-pointer">Mark read</button>
                <button onClick={clearAll} className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer">Clear</button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <span className="text-3xl">🔕</span>
                  <p className="mt-2 text-xs font-bold text-slate-600">No new notifications</p>
                  <p className="text-[11px] text-slate-400">All live store alerts will be listed here.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-2xl border transition-all relative group ${!n.read ? 'bg-indigo-50/70 border-indigo-200 shadow-xs' : 'bg-slate-50 border-slate-200/80'}`}
                  >
                    <div
                      onClick={() => {
                        setShowNotifDrawer(false)
                        markAllRead()
                        if (n.link) {
                          navigate(n.link)
                        } else if (n.action) {
                          n.action()
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <p className="font-bold text-xs text-slate-900">{n.title}</p>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium leading-snug">{n.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeNotification(n.id)
                      }}
                      className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-slate-200/70 text-slate-500 text-[10px] font-bold hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100"
                      title="Remove notification"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
