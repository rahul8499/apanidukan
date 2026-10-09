import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type StoreCartItem = { id: number; slug: string; name: string; price: string; image?: string; unit?: string; selectedSize?: string; selectedSizeStock?: number; quantity: number }
type StoreCart = { items: StoreCartItem[]; add: (item: Omit<StoreCartItem, 'quantity'>, qty?: number) => void; change: (id: number, quantity: number, selectedSize?: string) => void; sync: (items: StoreCartItem[]) => void; clear: () => void; count: number; total: number }
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
      const existing = current.find(x => x.id === item.id && (x.selectedSize || '') === (item.selectedSize || ''))
      const updated = existing
        ? current.map(x => x.id === item.id && (x.selectedSize || '') === (item.selectedSize || '') ? { ...x, quantity: x.quantity + qty } : x)
        : [...current, { ...item, quantity: qty }]
      try { localStorage.setItem(key, JSON.stringify(updated)) } catch {}
      return updated
    }),
    change: (id: number, quantity: number, selectedSize?: string) => setItems(current => {
      const matchesLine = (x: StoreCartItem) => x.id === id && (selectedSize === undefined || (x.selectedSize || '') === selectedSize)
      const updated = quantity < 1 ? current.filter(x => !matchesLine(x)) : current.map(x => matchesLine(x) ? { ...x, quantity } : x)
      try { localStorage.setItem(key, JSON.stringify(updated)) } catch {}
      return updated
    }),
    sync: (nextItems: StoreCartItem[]) => setItems(() => {
      try { localStorage.setItem(key, JSON.stringify(nextItems)) } catch {}
      return nextItems
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
  if (!value) return { items: [], add: () => {}, change: () => {}, sync: () => {}, clear: () => {}, count: 0, total: 0 }
  return value
}
