import React, { useEffect, useState } from 'react'
import { Smartphone, Download } from 'lucide-react'

/** Shows only when the browser says this PWA can be installed. */
export default function InstallAppButton({ storeSlug }: { storeSlug?: string }){
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setInstalled(Boolean(standalone))
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install(){
    if (!installPrompt) return
    if (storeSlug) localStorage.setItem('multistore-installed-store', storeSlug)
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (installed || !installPrompt) return null

  return (
    <button
      onClick={install}
      className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-xs font-black text-white shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      title="Install App to Android Home Screen"
    >
      <Smartphone className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
      <span>Install App</span>
    </button>
  )
}
