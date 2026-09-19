import React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Grid2X2, Home, UserRound } from 'lucide-react'

type CustomerTab = 'home' | 'stores' | 'orders' | 'account'

export default function CustomerAppBottomNav({ active }: { active: CustomerTab }) {
  const tabs = [
    { key: 'home' as const, label: 'Home', icon: Home, path: '/customer-home' },
    { key: 'stores' as const, label: 'Stores', icon: Grid2X2, path: '/customer-stores' },
    { key: 'orders' as const, label: 'Orders', icon: ClipboardList, path: '/customer-orders' },
    { key: 'account' as const, label: 'Account', icon: UserRound, path: '/customer-account' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur-xl" style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex max-w-2xl items-center justify-around gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = active === tab.key
          return (
            <Link key={tab.key} to={tab.path} className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition ${selected ? 'bg-blue-50 text-blue-600' : 'text-slate-500 active:bg-slate-100'}`}>
              {selected && <span className="absolute -top-1.5 h-1 w-8 rounded-full bg-blue-600" />}
              <Icon className="h-5 w-5" strokeWidth={selected ? 2.6 : 2} />
              <span className={`text-[10px] ${selected ? 'font-black' : 'font-bold'}`}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
