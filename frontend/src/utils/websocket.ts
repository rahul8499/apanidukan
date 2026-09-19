/**
 * Utility to construct WebSocket URLs that work correctly both in:
 * 1. Local development (localhost / 127.0.0.1:8000)
 * 2. Production deployments (Render, Vercel, or custom domains) using VITE_API_BASE
 */
export function getWebSocketUrl(path: string): string {
  const envBase = (import.meta as any).env?.VITE_API_BASE
  let wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  let wsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:8000'

  if (envBase) {
    try {
      const url = new URL(envBase)
      wsHost = url.host
      wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    } catch {
      // Ignore URL parsing error and use fallback
    }
  } else if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (isLocal) {
      wsHost = `${window.location.hostname}:8000`
    }
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${wsProtocol}//${wsHost}${cleanPath}`
}
