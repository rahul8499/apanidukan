export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false

  const matchMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)')
    : null

  const hasStandaloneMatch = Boolean(matchMedia?.matches)
  const isSafariStandalone = Boolean((window.navigator as any)?.standalone)
  const hasAndroidReferrer = typeof document !== 'undefined' && !!document.referrer && document.referrer.startsWith('android-app://')

  return hasStandaloneMatch || isSafariStandalone || hasAndroidReferrer
}
