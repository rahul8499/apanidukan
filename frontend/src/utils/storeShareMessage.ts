/**
 * WhatsApp Store Share Message Generator for ApaniDukan
 * 
 * Features:
 * 1. 100% Safe Unicode: Uses standard single-codepoint symbols (★, ✓, •, ✨, 👉, 💬)
 *    to permanently eliminate replacement characters () across Android, iOS, and WhatsApp Web.
 * 2. Dynamic Category Adaptability: Tailored headlines for Clothing, Kirana, Studio, Food, etc.
 * 3. Smart Fulfillment Badge: Accurately reflects Home Delivery vs Store Pickup (never promises
 *    home delivery if the store doesn't support it).
 * 4. Clean Link Handling: Formats clean `/s/:slug` URLs with intelligent localhost/production fallback.
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
  /** If true, preserves localhost URL instead of falling back to apanidukan.com */
  forceLocalUrl?: boolean
  /** Optional customer name if personalizing the message */
  customerName?: string
  /** Optional discount/coupon highlight */
  couponCode?: string
}

/**
 * Returns the clean public storefront URL for sharing.
 */
export function getStoreShareUrl(store: StoreShareableData, options?: StoreShareOptions): string {
  if (store.custom_domain) {
    return `https://${store.custom_domain}`
  }

  const isBrowser = typeof window !== 'undefined'
  let origin = isBrowser ? window.location.origin : 'https://apanidukan.com'

  if (!options?.forceLocalUrl && isBrowser) {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      origin = 'https://apanidukan.com'
    }
  }

  return `${origin}/s/${store.slug}`
}

interface CategoryInfo {
  tagline: string
  intro: string
  itemHighlight: string
  categoryEmoji: string
}

function getCategoryDetails(businessType?: string): CategoryInfo {
  const type = (businessType || '').toUpperCase()

  switch (type) {
    case 'GARMENTS':
      return {
        tagline: 'Fashion & Clothing Store',
        intro: 'नमस्ते! हमारा नया फैशन कलेक्शन अब ऑनलाइन उपलब्ध है. आप घर बैठे सभी डिज़ाइन्स व रेट्स देख सकते हैं:',
        itemHighlight: '✓ लेटेस्ट ड्रेसेस, साड़ियां व ट्रेंडिंग कलेक्शन',
        categoryEmoji: ''
      }

    case 'KIRANA':
      return {
        tagline: 'किराणा व सुपरमार्केट',
        intro: 'नमस्ते! आता घरबसल्या ताजा किराणा व रोजच्या गरजेच्या वस्तू ऑनलाइन मागवा:',
        itemHighlight: '✓ ताजा किराणा, धान्य व घरगुती सामान',
        categoryEmoji: ''
      }

    case 'PHOTO_STUDIO':
      return {
        tagline: 'फोटो स्टुडिओ व सर्व्हिसेस',
        intro: 'नमस्ते! आमच्या स्टुडिओच्या सर्व्हिसेस, फोटोशूट पॅकेजेस व फ्रेम्स आता ऑनलाइन पहा:',
        itemHighlight: '✓ फोटोशूट, अल्बम प्रिंटिंग व कस्टमाईज फोटो फ्रेम्स',
        categoryEmoji: ''
      }

    case 'RESTAURANT':
    case 'HOTEL_RESTAURANT':
      return {
        tagline: 'हॉटेल व रेस्टॉरंट',
        intro: 'नमस्ते! गरमागरम व स्वादिष्ट जेवणाचा मेन्यू ऑनलाइन पहा आणि सहज ऑर्डर करा:',
        itemHighlight: '✓ रुचकर जेवण, स्पेशल थाळी व पार्सल सुविधा',
        categoryEmoji: ''
      }

    case 'BAKERY_SWEETS':
    case 'DAIRY_SWEETS':
      return {
        tagline: 'बेकरी, केक्स व मिठाई',
        intro: 'नमस्ते! ताजे केक्स, पेस्ट्रीज व स्वादिष्ट मिठाई ऑनलाइन ऑर्डर करा:',
        itemHighlight: '✓ बर्थडे केक्स, ताजे स्नॅक्स व स्पेशल मिठाई',
        categoryEmoji: ''
      }

    case 'ELECTRONICS':
      return {
        tagline: 'इलेक्ट्रॉनिक्स व मोबाईल्स',
        intro: 'नमस्ते! नवीनतम स्मार्टफोन, गॅजेट्स व ॲक्सेसरीजचे बेस्ट ऑफर्स पहा:',
        itemHighlight: '✓ ब्रँडेड मोबाईल्स व दर्जेदार इलेक्ट्रॉनिक्स',
        categoryEmoji: ''
      }

    case 'PHARMACY':
      return {
        tagline: 'मेडिकल व फार्मसी',
        intro: 'नमस्ते! औषधे व हेल्थकेअर उत्पादने थेट ऑनलाइन मागवा:',
        itemHighlight: '✓ खात्रीशीर औषधे व वेलनेस प्रॉडक्ट्स',
        categoryEmoji: ''
      }

    case 'HARDWARE_PLUMBING':
    case 'BUILDING_MATERIAL':
    case 'HARDWARE':
      return {
        tagline: 'हार्डवेअर व टूल्स',
        intro: 'नमस्ते! हार्डवेअर, टूल्स, प्लंबिंग व बांधकाम साहित्य ऑनलाइन पहा:',
        itemHighlight: '✓ दर्जेदार टूल्स, फिटिंग्स व मटेरियल',
        categoryEmoji: ''
      }

    default:
      return {
        tagline: 'Official Online Store',
        intro: 'नमस्ते! अब आप हमारी दुकान के सभी प्रॉडक्ट्स व ऑफर्स सीधे ऑनलाइन देख सकते हैं:',
        itemHighlight: '✓ संपूर्ण प्रॉडक्ट कॅटलॉग व ऑफर्स',
        categoryEmoji: ''
      }
  }
}

/**
 * Returns dynamic fulfillment highlights based on store delivery & pickup configuration.
 * Uses 100% universal plain text & checkmarks (zero emojis) to guarantee no  replacement characters.
 */
function getFulfillmentHighlight(allowHomeDelivery: boolean, allowStorePickup: boolean): string {
  if (allowHomeDelivery && allowStorePickup) {
    return '✓ थेट घरपोच डिलिव्हरी (Home Delivery) व स्टोअर पिकअप उपलब्ध'
  }
  if (allowHomeDelivery && !allowStorePickup) {
    return '✓ थेट घरपोच डिलिव्हरी (Home Delivery) उपलब्ध'
  }
  if (!allowHomeDelivery && allowStorePickup) {
    return '✓ दुकानातून पिकअप (Store Pickup) व इन-स्टोअर खरेदी उपलब्ध'
  }
  return '✓ थेट WhatsApp वरून सोपी ऑर्डर व चौकशी'
}

/**
 * Generates a high-converting, clean, bulletproof WhatsApp share message without any broken glyphs.
 */
export function generateStoreShareMessage(store: StoreShareableData, options?: StoreShareOptions): string {
  const storeName = store.name.trim().toUpperCase()
  const publicUrl = getStoreShareUrl(store, options)
  const category = getCategoryDetails(store.business_type)

  const allowHomeDelivery = store.allow_home_delivery !== false
  const allowStorePickup = store.allow_store_pickup !== false
  const fulfillmentHighlight = getFulfillmentHighlight(allowHomeDelivery, allowStorePickup)

  const lines: string[] = [
    `*${storeName}*`,
    `${category.tagline}`,
    '',
    `${category.intro}`,
    '',
    `*ऑनलाइन दुकान लिंक:*`,
    `${publicUrl}`,
    '',
    `*खास सुविधा:*`,
    `${category.itemHighlight}`,
    `${fulfillmentHighlight}`,
    `✓ वाजवी दर व दर्जेदार वस्तू`,
    `✓ थेट WhatsApp वर सोपी ऑर्डर`
  ]

  if (options?.couponCode) {
    lines.push('', `*Special Discount Code:* ${options.couponCode}`)
  }

  lines.push('', `नवीन उत्पादने पाहण्यासाठी वरील लिंकवर क्लिक करा!`)

  return lines.join('\n')
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
