/**
 * Dynamic Multi-Store PWA Manifest Controller
 * Automatically configures store-specific installation for:
 * 1. Customer Storefront (/store/:slug) -> Installs as specific Customer Shopping App
 * 2. Seller Hub (/stores/:storeId/...) -> Installs as Seller Management Hub
 */

interface ManifestConfig {
  name: string
  shortName: string
  description: string
  startUrl: string
  themeColor: string
  backgroundColor: string
  iconUrl?: string
}

export function updateDynamicManifest({
  name,
  shortName,
  description,
  startUrl,
  themeColor,
  backgroundColor,
  iconUrl = '/icons/multistore-icon.svg',
}: ManifestConfig) {
  try {
    const manifestObj = {
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
          src: iconUrl,
          sizes: '192x192 512x512 any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
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
export function setupCustomerStorePwa(store: { name: string; slug: string; logo?: string }) {
  if (!store?.slug) return

  localStorage.setItem('multistore-installed-store', store.slug)
  localStorage.setItem('multistore-installed-type', 'customer')

  updateDynamicManifest({
    name: `${store.name || 'Store'} - Shopping`,
    shortName: store.name || 'Store',
    description: `Shop online directly from ${store.name} with express delivery and COD.`,
    startUrl: `/store/${store.slug}`,
    themeColor: '#020617',
    backgroundColor: '#ffffff',
    iconUrl: store.logo || '/icons/multistore-icon.svg',
  })
}

/**
 * Configure Seller-Specific Management Hub PWA Manifest
 */
export function setupSellerStorePwa(store: { id: string | number; name: string }) {
  if (!store?.id) return

  localStorage.setItem('multistore-installed-type', 'seller')
  localStorage.setItem('multistore-installed-seller-id', String(store.id))

  updateDynamicManifest({
    name: `${store.name || 'Store'} - Seller Hub`,
    shortName: 'Seller Hub',
    description: 'Manage store orders, catalog, coupons & customer chats in real-time.',
    startUrl: `/stores/${store.id}/orders`,
    themeColor: '#0f172a',
    backgroundColor: '#0f172a',
    iconUrl: '/icons/multistore-icon.svg',
  })
}
