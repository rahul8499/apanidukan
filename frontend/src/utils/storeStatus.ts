export const isStoreOffline = (error: any): boolean => {
  const data = error?.response?.data
  if (!data || error?.response?.status !== 400) return false
  const detail = data?.detail
  if (typeof detail === 'string') return detail.toLowerCase().includes('offline')
  if (detail && typeof detail === 'object') return detail?.code === 'store_offline'
  return false
}
