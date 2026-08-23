import React from 'react'

interface SellerSplashLoaderProps {
  label?: string
}

export default function SellerSplashLoader({ label = 'Opening Seller Workspace...' }: SellerSplashLoaderProps) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Large Rounded Logo Container — Premium Android PWA Splash */}
        <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-3xl bg-white p-3 shadow-xl border border-slate-200/80 transform transition-transform hover:scale-105">
          <img
            src="/apanidukan1.png"
            alt="Apani Dukan"
            className="h-full w-full object-contain drop-shadow-sm"
          />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md border-2 border-white">
            ⚡
          </span>
        </div>

        {/* Brand Name & Spinner Status */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Apani Dukan</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-slate-500 animate-pulse">{label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
