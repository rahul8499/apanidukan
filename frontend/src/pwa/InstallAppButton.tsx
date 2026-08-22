import React, { useEffect, useState } from 'react'
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2 } from 'lucide-react'

interface InstallAppProps {
  storeSlug?: string
  variant?: 'header_pill' | 'button' | 'banner' | 'drawer_item'
}

/**
 * Universal PWA Install Component
 * Clean Crisp White Theme with high-contrast text and icons.
 */
export default function InstallAppButton({ storeSlug, variant = 'header_pill' }: InstallAppProps) {
  const [installPrompt, setInstallPrompt] = useState<any>(() => (window as any).deferredInstallPrompt || null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    // Check if already installed / running in standalone PWA mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsStandalone(Boolean(standalone))

    // Detect device OS
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))
    setIsAndroid(/android/.test(userAgent))

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
      ;(window as any).deferredInstallPrompt = event
    }

    const onInstalled = () => {
      setIsStandalone(true)
      setInstallPrompt(null)
      ;(window as any).deferredInstallPrompt = null
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (storeSlug) {
      localStorage.setItem('multistore-installed-store', storeSlug)
      localStorage.setItem('multistore-installed-type', 'customer')
    }

    if (installPrompt) {
      try {
        await installPrompt.prompt()
        const choice = await installPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsStandalone(true)
          setInstallPrompt(null)
        }
      } catch (err) {
        console.error('Install prompt error:', err)
        setShowGuideModal(true)
      }
    } else {
      // If native browser prompt is not active, show the 2-step PWA install guide
      setShowGuideModal(true)
    }
  }

  // If already running as standalone app, show small active badge if in drawer
  if (isStandalone) {
    if (variant === 'drawer_item') {
      return (
        <div className="flex items-center justify-between rounded-xl bg-white border border-emerald-300 p-2.5 text-xs text-emerald-950 font-bold shadow-xs">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>App Installed on Device</span>
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-black">
            ACTIVE PWA
          </span>
        </div>
      )
    }
    return null
  }

  return (
    <>
      {/* 1. Header Compact Pill (Clean Crisp White Theme) */}
      {variant === 'header_pill' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex h-7 w-7 sm:w-auto sm:h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white sm:px-2.5 text-[10px] sm:text-xs font-black text-slate-900 shadow-xs hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Install App on Phone"
        >
          <Smartphone className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5 text-indigo-600 animate-pulse shrink-0" />
          <span className="hidden sm:inline text-slate-900 font-black">Install App</span>
        </button>
      )}

      {/* 2. Standard Button (Clean White Card) */}
      {variant === 'button' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-900 shadow-xs hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-indigo-600" />
          <span>Install App to Home Screen</span>
        </button>
      )}

      {/* 3. Drawer Item (Clean White Theme) */}
      {variant === 'drawer_item' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between rounded-xl bg-white border border-slate-200 p-2.5 text-left text-xs font-black text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
              📱
            </span>
            <div>
              <p className="text-[11px] font-black text-slate-900">Install App on Phone</p>
              <p className="text-[9px] font-medium text-slate-500">Add to Home Screen (PWA)</p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-md shadow-2xs">
            + Install
          </span>
        </button>
      )}

      {/* 4. Full Banner (Clean Crisp White Theme) */}
      {variant === 'banner' && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs shrink-0">
              📱
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">Install Store App</p>
              <p className="text-[10px] text-slate-500 truncate">1-Tap fast access directly from Home screen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-black text-white shadow-xs hover:bg-indigo-700 cursor-pointer shrink-0"
          >
            Install ⚡
          </button>
        </div>
      )}

      {/* Step-by-Step PWA Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <h3 className="text-base font-black text-slate-900">Manual Install Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-2">
              <p className="text-xs font-bold text-amber-800">
                ⚠️ Auto-install blocked by your browser. Please follow these 3 simple steps to install the app manually:
              </p>
            </div>

            {isIOS ? (
              /* iOS Safari Guide */
              <div className="space-y-2.5 text-xs">
                <p className="font-bold text-slate-700">For iPhone / iPad (Safari):</p>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black shrink-0">1</span>
                    <span>Tap the <strong className="text-indigo-700 font-black">Share</strong> button <Share2 className="inline h-4 w-4 text-indigo-600" /> at the bottom.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black shrink-0">2</span>
                    <span>Scroll down and tap <strong className="text-indigo-700 font-black">Add to Home Screen</strong> <PlusSquare className="inline h-4 w-4 text-indigo-600" />.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white font-black shrink-0">3</span>
                    <span>Tap <strong className="text-emerald-700 font-black">Add</strong> at the top right!</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Android Chrome & Desktop Guide */
              <div className="space-y-2.5 text-xs">
                <p className="font-bold text-slate-700">For Android (Chrome):</p>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black shrink-0">1</span>
                    <span>Tap the <strong className="text-indigo-700 font-black">3 dots (⋮)</strong> menu in the browser top-right.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black shrink-0">2</span>
                    <span>Tap <strong className="text-indigo-700 font-black">Install App</strong> or <strong className="text-indigo-700 font-black">Add to Home screen</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white font-black shrink-0">3</span>
                    <span>App will be installed on your home screen!</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full rounded-xl bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition-all cursor-pointer shadow-md mt-2"
            >
              Close & Do It Manually
            </button>
          </div>
        </div>
      )}
    </>
  )
}
