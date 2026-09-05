import React, { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

const customerPlayStoreUrl = (import.meta as any).env?.VITE_CUSTOMER_PLAY_STORE_URL || ''

export default function DownloadApp() {
  const [searchParams] = useSearchParams()
  const storeSlug = searchParams.get('store')?.trim() || ''
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )

    if (storeSlug) {
      localStorage.setItem('pending-customer-store', storeSlug)
      localStorage.setItem('multistore-installed-store', storeSlug)
      localStorage.setItem('multistore-installed-type', 'customer')
    }
  }, [storeSlug])

  if (isStandalone && storeSlug) return <Navigate to={`/s/${storeSlug}`} replace />

  const referrer = storeSlug ? `?referrer=${encodeURIComponent(`store=${storeSlug}`)}` : ''
  const playStoreUrl = customerPlayStoreUrl
    ? `${customerPlayStoreUrl}${referrer}`
    : ''

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-16 text-center text-slate-900">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <img src="/apanidukan1.png" alt="Apani Dukan" className="mx-auto mb-5 h-20 w-20 rounded-2xl" />
        <h1 className="text-2xl font-black">Apani Dukan Customer App</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Install the app to open this store and shop from local sellers.
        </p>
        {playStoreUrl ? (
          <a
            href={playStoreUrl}
            className="mt-7 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Get the app on Google Play
          </a>
        ) : (
          <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            The Play Store link is not configured yet.
          </p>
        )}
        {storeSlug && (
          <Link to={`/s/${storeSlug}`} className="mt-5 block text-sm font-semibold text-indigo-700">
            Continue in browser
          </Link>
        )}
      </div>
    </main>
  )
}