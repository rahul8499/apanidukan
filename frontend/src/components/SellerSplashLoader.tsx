import React from 'react'

interface SellerSplashLoaderProps {
  label?: string
  variant?: 'seller' | 'customer'
}

export default function SellerSplashLoader({ variant = 'seller' }: SellerSplashLoaderProps) {
  const logoSrc = variant === 'customer' ? '/customer-icon-512.png' : '/apanidukan-brand-logo.png'
  const logoClass = variant === 'customer'
    ? 'h-24 w-24 object-contain'
    : 'h-auto w-[min(82vw,320px)] object-contain'

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 animate-in fade-in duration-300">
      <img
        src={logoSrc}
        alt="Apani Dukan"
        className={logoClass}
      />
    </div>
  )
}
