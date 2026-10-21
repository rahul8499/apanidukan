import React from 'react'

interface SellerSplashLoaderProps {
  label?: string
  variant?: 'seller' | 'customer'
}

export default function SellerSplashLoader(_props: SellerSplashLoaderProps) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 animate-in fade-in duration-300">
      <div className="flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
        <img
          src="/customer-icon-512.png"
          alt="Apani Dukan"
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  )
}
