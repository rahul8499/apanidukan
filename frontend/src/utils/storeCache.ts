export function getCachedStore(storeId?: string | number): any {
  if (!storeId) return null
  try {
    const cached = sessionStorage.getItem(`qs_store_${storeId}`)
    if (cached) return JSON.parse(cached)
    const activeCached = sessionStorage.getItem('qs_active_store')
    if (activeCached) {
      const parsed = JSON.parse(activeCached)
      if (String(parsed.id) === String(storeId)) return parsed
    }
  } catch {}
  return null
}

export function setCachedStore(store: any): void {
  if (!store || !store.id) return
  try {
    sessionStorage.setItem(`qs_store_${store.id}`, JSON.stringify(store))
    sessionStorage.setItem('qs_active_store', JSON.stringify(store))
  } catch {}
}
