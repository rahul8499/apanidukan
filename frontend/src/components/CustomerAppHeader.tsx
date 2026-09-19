import React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import NotificationBellHeader from './NotificationBellHeader'

export default function CustomerAppHeader({ subtitle = 'Shop near you' }: { subtitle?: string }) {
  return (
    <header className="flex items-center justify-between gap-3 pb-4">
      <Link to="/customer-home" className="flex min-w-0 items-center gap-2.5" aria-label="Apani Dukan customer home">
        <img src="/customer-icon-512.png" alt="Apani Dukan Customer" className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200 sm:h-14 sm:w-14" />
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">Apani Dukan</p>
          <p className="truncate text-[9px] font-black uppercase tracking-wider text-orange-500">Customer marketplace · {subtitle}</p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <NotificationBellHeader className="text-slate-700" />
        <Link to="/customer-orders" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm" aria-label="My orders">
          <ClipboardList className="h-4.5 w-4.5" />
        </Link>
      </div>
    </header>
  )
}
