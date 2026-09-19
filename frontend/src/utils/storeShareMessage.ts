/**
 * WhatsApp Store Share Message Generator for ApaniDukan
 * 
 * Clean 3-line format requested by user:
 * 1. Store Name (bold, zero emojis so no  question marks)
 * 2. Order karne ke liye link par click karein:
 * 3. Storefront Link (/s/:slug)
 */

export interface StoreShareableData {
  name: string
  slug: string
  business_type?: string
  allow_home_delivery?: boolean
  allow_store_pickup?: boolean
  description?: string
  custom_domain?: string
}

export interface StoreShareOptions {
  /** If true, uses current window origin (e.g. localhost) */
  forceLocalUrl?: boolean
}

/**
 * Returns the clean public storefront URL (/s/:slug).
 */
export function getStoreShareUrl(store: StoreShareableData, options?: StoreShareOptions): string {
  if (store.custom_domain) {
    return `https://${store.custom_domain}`
  }

  const isBrowser = typeof window !== 'undefined'
  const origin = isBrowser ? window.location.origin : 'https://apanidukan.com'

  return `${origin}/s/${store.slug}`
}

/**
 * Generates the clean, simple, bulletproof 3-line share message without any emojis.
 * Guaranteed 0 question marks () and no cluttered preview card.
 */
export function generateStoreShareMessage(store: StoreShareableData, options?: StoreShareOptions): string {
  const storeName = (store.name || 'Store').trim()
  const publicUrl = getStoreShareUrl(store, options)

  return `*${storeName}*\nआपकी पसंदीदा दुकान अब ऑनलाइन!\nघर बैठे प्रोडक्ट्स देखें, पसंद करें और आसानी से ऑर्डर करें।:\n${publicUrl}`
}

/**
 * Generates the direct WhatsApp `https://wa.me/?text=...` URI.
 */
export function getStoreWhatsAppShareLink(
  store: StoreShareableData,
  options?: StoreShareOptions,
  targetPhone?: string
): string {
  const text = generateStoreShareMessage(store, options)
  const encoded = encodeURIComponent(text)

  if (targetPhone) {
    const cleanPhone = targetPhone.replace(/\D/g, '')
    return `https://wa.me/${cleanPhone}?text=${encoded}`
  }

  return `https://wa.me/?text=${encoded}`
}
