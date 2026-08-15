import React, { useEffect, useState } from 'react'

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
  return <button onClick={install} className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-bold text-white hover:bg-white/20" aria-label="Install app">⇩ Install</button>
}
