import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles.css'
import './i18n'
import App from './App'

const appRole = (import.meta as any).env?.VITE_APP_ROLE || 'customer'
const manifestPath = appRole === 'seller'
  ? '/manifest-seller.webmanifest?v=4'
  : '/manifest-customer.webmanifest?v=3'
const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
if (manifestLink) manifestLink.href = manifestPath

const customerBrandIcon = '/customer-icon-512.png?v=2'
const browserIcon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null
if (appRole === 'seller') {
  if (browserIcon) browserIcon.href = '/seller-icon-512.png?v=3'
  if (appleTouchIcon) appleTouchIcon.href = '/seller-icon-512.png?v=3'
} else {
  if (browserIcon) browserIcon.href = customerBrandIcon
  if (appleTouchIcon) appleTouchIcon.href = customerBrandIcon
}

// Handle dynamic import/chunk loading failures automatically after deployment updates
window.addEventListener('error', (e) => {
  if (
    e.message &&
    (e.message.includes('Failed to fetch dynamically imported module') ||
     e.message.includes('Loading chunk') ||
     e.message.includes('Importing a module script failed'))
  ) {
    console.warn('New PWA build detected, auto-refreshing assets...')
    window.location.reload()
  }
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((reg) => {
      reg.update()
    }).catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<App/>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
