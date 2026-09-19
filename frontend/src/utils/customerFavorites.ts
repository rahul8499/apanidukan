import { useEffect, useState } from 'react'

export interface FavoriteStoreItem {
  id: string | number
  name: string
  slug: string
  logo?: string | null
  business_type?: string
  address?: string | null
  allow_home_delivery?: boolean
  allow_store_pickup?: boolean
  distance_km?: number
  saved_at?: number
}

const STORAGE_KEY = 'apani_customer_favorite_stores'
const EVENT_NAME = 'customer-favorites-updated'

/**
 * Returns all saved favorite stores from localStorage.
 */
export function getFavoriteStores(): FavoriteStoreItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Checks if a given store ID is in the customer's favorites.
 */
export function isFavoriteStore(storeId: string | number): boolean {
  if (!storeId) return false
  const favorites = getFavoriteStores()
  return favorites.some((item) => String(item.id) === String(storeId) || item.slug === String(storeId))
}

/**
 * Toggles a store in favorites. Returns true if added, false if removed.
 */
export function toggleFavoriteStore(store: any): boolean {
  if (!store || (!store.id && !store.slug)) return false
  const current = getFavoriteStores()
  const existsIndex = current.findIndex(
    (item) => String(item.id) === String(store.id) || (store.slug && item.slug === store.slug)
  )

  let nextFavorites: FavoriteStoreItem[]
  let added = false

  if (existsIndex >= 0) {
    nextFavorites = current.filter((_, idx) => idx !== existsIndex)
    added = false
  } else {
    const newFav: FavoriteStoreItem = {
      id: store.id,
      name: store.name || 'Store',
      slug: store.slug,
      logo: store.logo || null,
      business_type: store.business_type || 'GENERAL',
      address: store.address || null,
      allow_home_delivery: store.allow_home_delivery !== false,
      allow_store_pickup: store.allow_store_pickup !== false,
      distance_km: store.distance_km,
      saved_at: Date.now(),
    }
    nextFavorites = [newFav, ...current]
    added = true
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFavorites))
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { favorites: nextFavorites, added, storeId: store.id } }))
  }

  return added
}

/**
 * Removes a specific store from favorites.
 */
export function removeFavoriteStore(storeId: string | number): void {
  if (!storeId) return
  const current = getFavoriteStores()
  const nextFavorites = current.filter(
    (item) => String(item.id) !== String(storeId) && item.slug !== String(storeId)
  )
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFavorites))
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { favorites: nextFavorites, added: false, storeId } }))
  }
}

/**
 * React hook to access and interact with favorite stores reactively.
 */
export function useCustomerFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStoreItem[]>(() => getFavoriteStores())

  useEffect(() => {
    function handleUpdate() {
      setFavorites(getFavoriteStores())
    }

    window.addEventListener(EVENT_NAME, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  return {
    favorites,
    count: favorites.length,
    isFavorite: (storeId: string | number) => isFavoriteStore(storeId),
    toggleFavorite: (store: any) => toggleFavoriteStore(store),
    removeFavorite: (storeId: string | number) => removeFavoriteStore(storeId),
  }
}
