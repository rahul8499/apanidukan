import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../services/api'
import SellerSplashLoader from '../components/SellerSplashLoader'
import CustomerHome from './CustomerHome'

/**
 * Multi-Tenant PWA & Desktop Web Route Controller:
 * 1. Primary Customer Route: /s/:storeSlug (with /store/:storeSlug backward compatibility)
 * 2. Asynchronously validates backend store active status before PWA launch
 * 3. Logged-in Seller in Browser -> Opens Seller Dashboard (/dashboard)
 * 4. General Visitors in Browser -> Opens Platform Home / Create Store (/start)
 */
export default function PwaLaunch() {
  const installType = localStorage.getItem('multistore-installed-type')
  const queryStore = new URLSearchParams(window.location.search).get('store')
  const pendingStore = localStorage.getItem('pending-customer-store')
  const customerStore = queryStore || pendingStore || localStorage.getItem('multistore-installed-store')

  if (queryStore) {
    localStorage.setItem('multistore-installed-store', queryStore)
    localStorage.setItem('multistore-installed-type', 'customer')
    localStorage.removeItem('pending-customer-store')
    window.history.replaceState({}, '', '/')
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.startsWith('android-app://') ||
    new URLSearchParams(window.location.search).get('source') === 'customer-app'

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
      <SellerSplashLoader
        label="Validating store connection..."
        variant={installType === 'customer' ? 'customer' : 'seller'}
      />
    )
  }

  if (targetRoute) {
    return <Navigate to={targetRoute} replace />
  }

  // The root URL belongs exclusively to the customer experience. Customer and
  // seller PWAs share origin storage, so seller tokens/install flags must never
  // decide what opens here. The seller app has its own /seller launch route.
  return <CustomerHome />
}
