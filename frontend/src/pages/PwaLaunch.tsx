import React from 'react'
import { Navigate } from 'react-router-dom'

/**
 * Multi-Tenant PWA Launch Controller:
 * 1. Customer PWA -> Directly launches into that specific store (/store/:slug)
 * 2. Seller PWA -> Directly launches into Seller Orders Dashboard (/stores/:id/orders)
 */
export default function PwaLaunch() {
  const installType = localStorage.getItem('multistore-installed-type')
  const customerStore = localStorage.getItem('multistore-installed-store')
  const sellerStoreId = localStorage.getItem('multistore-installed-seller-id')

  if (installType === 'customer' && customerStore) {
    return <Navigate to={`/store/${customerStore}`} replace />
  }

  if (installType === 'seller' && sellerStoreId) {
    return <Navigate to={`/stores/${sellerStoreId}/orders`} replace />
  }

  if (customerStore) {
    return <Navigate to={`/store/${customerStore}`} replace />
  }

  return <Navigate to="/start" replace />
}
