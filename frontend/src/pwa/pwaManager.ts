/**
 * PWA metadata controller for the shared customer app and seller app.
 */

interface ManifestConfig {
  name: string
  shortName: string
  description: string
  startUrl: string
  themeColor: string
  backgroundColor: string
  iconUrl?: string
  id?: string
}

export function updateDynamicManifest({
  name,
  shortName,
  description,
  startUrl,
  themeColor,
  backgroundColor,
  iconUrl = '/apanidukan1.png',
  id,
}: ManifestConfig) {
  try {
    const isAbsoluteUrl = iconUrl.startsWith('http://') || iconUrl.startsWith('https://')
    const finalIconSrc = isAbsoluteUrl ? iconUrl : window.location.origin + iconUrl

    const manifestObj = {
      id: id || startUrl,
      name: name,
      short_name: shortName,
      description: description,
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: backgroundColor,
      theme_color: themeColor,
      icons: [
        {
          src: finalIconSrc,
          sizes: '192x192',
          type: iconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
          purpose: 'any',
        },
        {
          src: finalIconSrc,
          sizes: '192x192',
          type: iconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
          purpose: 'maskable',
        },
        {
          src: finalIconSrc,
          sizes: '512x512',
          type: iconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
          purpose: 'any',
        },
        {
          src: finalIconSrc,
          sizes: '512x512',
          type: iconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
          purpose: 'maskable',
        },
      ],
    }

    const stringManifest = JSON.stringify(manifestObj)
    const blob = new Blob([stringManifest], { type: 'application/manifest+json' })
    const manifestURL = URL.createObjectURL(blob)

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      document.head.appendChild(manifestLink)
    }

    manifestLink.href = manifestURL

    // Also update mobile theme color
    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (themeMeta) {
      themeMeta.content = themeColor
    }

    // Update document title
    document.title = name
  } catch (err) {
    console.error('Failed to update dynamic PWA manifest:', err)
  }
}

/**
 * Configure Customer-Specific Store PWA Manifest
 */
export function setupCustomerStorePwa(store: { id?: string | number; name: string; slug: string; logo?: string }) {
  if (!store?.slug) return

  localStorage.setItem('multistore-installed-store', store.slug)
  if (store.id) {
    localStorage.setItem('multistore-installed-store-id', String(store.id))
  }
  localStorage.setItem('multistore-installed-type', 'customer')

  // The customer Play Store app is shared by every store. Store identity is
  // carried by the URL, never by the installed app manifest.
  resetGenericPlatformPwa()
}

/**
 * Configure Seller-Specific Management Hub PWA Manifest
 */
export function setupSellerStorePwa(store: { id: string | number; name: string }) {
  if (!store?.id) return

  localStorage.setItem('multistore-installed-type', 'seller')
  localStorage.setItem('multistore-installed-seller-id', String(store.id))

  updateDynamicManifest({
    name: 'Apani Dukan - Seller',
    shortName: 'Apani Dukan',
    description: 'Manage store orders, catalog, coupons & customer chats in real-time.',
    startUrl: `/stores/${store.id}/orders`,
    themeColor: '#f8fafc',
    backgroundColor: '#f8fafc',
    iconUrl: '/apanidukan1.png',
    id: `seller-hub-${store.id}`,
  })
}

/**
 * Reset PWA Manifest to Generic Platform Start
 */
export function resetGenericPlatformPwa() {
  updateDynamicManifest({
    name: 'Apani Dukan',
    shortName: 'Apani Dukan',
    description: 'Create and launch your online store in seconds.',
    startUrl: '/start',
    themeColor: '#f8fafc',
    backgroundColor: '#f8fafc',
    iconUrl: '/apanidukan1.png',
    id: 'platform-generic',
  })
}
