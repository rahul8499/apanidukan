import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../services/api'

/**
 * Multi-Tenant PWA & Desktop Web Route Controller:
 * 1. Primary Customer Route: /s/:storeSlug (with /store/:storeSlug backward compatibility)
 * 2. Asynchronously validates backend store active status before PWA launch
 * 3. Logged-in Seller in Browser -> Opens Seller Dashboard (/dashboard)
 * 4. General Visitors in Browser -> Opens Platform Home / Create Store (/start)
 */
export default function PwaLaunch() {
  const token = localStorage.getItem('access_token')
  const installType = localStorage.getItem('multistore-installed-type')
  const customerStore = localStorage.getItem('multistore-installed-store')
  const sellerStoreId = localStorage.getItem('multistore-installed-seller-id')

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true

  const [verifying, setVerifying] = useState<boolean>(() => {
    return Boolean(isStandalone && installType === 'customer' && customerStore)
  })
  const [targetRoute, setTargetRoute] = useState<string | null>(null)

  useEffect(() => {
    if (!verifying || !customerStore) return

    let isMounted = true
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
    const wasValidatedBefore = localStorage.getItem('multistore-installed-store-validated') === 'true'

    // 1. Offline Mode: Allow launching into cached store if previously validated
    if (isOffline && wasValidatedBefore) {
      setTargetRoute(`/s/${customerStore}`)
      setVerifying(false)
      return
    }

    // 2. Online Mode: Perform Backend Verification
    api.get(`/public/stores/${customerStore}/`)
      .then(res => {
        if (!isMounted) return
        const data = res.data.data || res.data
        if (data?.slug && data?.is_published !== false) {
          // Store is valid & active -> update canonical slug & store ID
          localStorage.setItem('multistore-installed-store', data.slug)
          if (data.id) {
            localStorage.setItem('multistore-installed-store-id', String(data.id))
          }
          localStorage.setItem('multistore-installed-store-validated', 'true')
          setTargetRoute(`/s/${data.slug}`)
        } else {
          // Store un-published or inactive -> purge state
          localStorage.removeItem('multistore-installed-store')
          localStorage.removeItem('multistore-installed-store-id')
          localStorage.removeItem('multistore-installed-type')
          localStorage.removeItem('multistore-installed-store-validated')
          setTargetRoute('/start')
        }
      })
      .catch((error) => {
        if (!isMounted) return
        const isNetworkErr = !error.response
        if (isNetworkErr && wasValidatedBefore) {
          // Network connection error -> Fallback to cached store view
          setTargetRoute(`/s/${customerStore}`)
        } else {
          // Store deleted or 404 -> Purge state safely
          localStorage.removeItem('multistore-installed-store')
          localStorage.removeItem('multistore-installed-store-id')
          localStorage.removeItem('multistore-installed-type')
          localStorage.removeItem('multistore-installed-store-validated')
          setTargetRoute('/start')
        }
      })
      .finally(() => {
        if (isMounted) setVerifying(false)
      })

    return () => {
      isMounted = false
    }
  }, [verifying, customerStore])

  if (verifying) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-bold text-slate-300">Validating store connection…</p>
        </div>
      </div>
    )
  }

  if (targetRoute) {
    return <Navigate to={targetRoute} replace />
  }

  // 1. Installed Mobile PWA Standalone App Launch
  if (isStandalone) {
    if (installType === 'seller') {
      if (sellerStoreId) {
        return <Navigate to={`/stores/${sellerStoreId}/orders`} replace />
      }
      return <Navigate to="/dashboard" replace />
    }
  }

  // 2. Normal Web Browser Navigation:
  // If seller is logged in, redirect directly to Dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  // 3. General Visitors always land on /start (Never auto-redirect to unverified customer store!)
  return <Navigate to="/start" replace />
}
