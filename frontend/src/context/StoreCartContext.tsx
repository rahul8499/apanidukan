import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type StoreCartItem = { id: number; slug: string; name: string; price: string; image?: string; quantity: number }
type StoreCart = { items: StoreCartItem[]; add: (item: Omit<StoreCartItem, 'quantity'>, qty?: number) => void; change: (id: number, quantity: number) => void; clear: () => void; count: number; total: number }
const Context = createContext<StoreCart | undefined>(undefined)

export function StoreCartProvider({ storeSlug, children }: { storeSlug: string; children: React.ReactNode }) {
  const key = `multistore-cart-${storeSlug}`
  const [items, setItems] = useState<StoreCartItem[]>(() => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(items)) } catch {}
  }, [items, key])

  const value = useMemo(() => ({
    items,
    add: (item: Omit<StoreCartItem, 'quantity'>, qty: number = 1) => setItems(current => {
      const existing = current.find(x => x.id === item.id)
      const updated = existing
        ? current.map(x => x.id === item.id ? { ...x, quantity: x.quantity + qty } : x)
        : [...current, { ...item, quantity: qty }]
      try { localStorage.setItem(key, JSON.stringify(updated)) } catch {}
      return updated
    }),
    change: (id: number, quantity: number) => setItems(current => {
      const updated = quantity < 1 ? current.filter(x => x.id !== id) : current.map(x => x.id === id ? { ...x, quantity } : x)
      try { localStorage.setItem(key, JSON.stringify(updated)) } catch {}
      return updated
    }),
    clear: () => setItems(() => {
      try { localStorage.setItem(key, '[]') } catch {}
      return []
    }),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
  }), [items, key])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useStoreCart() {
  const value = useContext(Context)
  if (!value) return { items: [], add: () => {}, change: () => {}, clear: () => {}, count: 0, total: 0 }
  return value
}
