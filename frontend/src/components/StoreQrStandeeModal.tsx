import React, { useRef } from 'react'
import { QrCode, Printer, Download, X, Sparkles, ShieldCheck, ShoppingBag } from 'lucide-react'

interface StoreQrStandeeModalProps {
  store: {
    id: number
    name: string
    slug: string
    logo?: string
    tagline?: string
    phone_number?: string
  }
  publicUrl: string
  onClose: () => void
}

export default function StoreQrStandeeModal({ store, publicUrl: initialPublicUrl, onClose }: StoreQrStandeeModalProps) {
  // Seamless resolution: If testing locally on localhost, map to local network IP for mobile cameras.
  // When deployed to production, it uses the exact live domain URL automatically!
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  
  const targetUrl = isLocalhost
    ? initialPublicUrl.replace(/localhost|127\.0\.0\.1/g, '10.185.115.72')
    : initialPublicUrl

  const displayUrl = isLocalhost
    ? initialPublicUrl
    : initialPublicUrl.replace(/^https?:\/\//, '')

  const standeeRef = useRef<HTMLDivElement>(null)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(targetUrl)}`

  const handlePrint = () => {
    const printContent = standeeRef.current
    if (!printContent) return

    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0')
    if (!windowPrint) return

    windowPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Shop QR Standee - ${store.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="bg-white flex items-center justify-center p-8">
          ${printContent.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `)
    windowPrint.document.close()
  }

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${store.slug}-official-qr.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(qrImageUrl, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-white my-auto max-h-[95vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Official Store QR Standee & Poster</h3>
              <p className="text-[11px] text-slate-400">Print or display this scanner banner at your shop counter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">

          {/* PRINTABLE STANDEE POSTER CANVAS PREVIEW */}
          <div ref={standeeRef} className="w-full max-w-sm overflow-hidden rounded-3xl border-4 border-slate-900 bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 p-6 text-center text-white shadow-2xl space-y-5">
            
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-[10px] font-black uppercase text-indigo-300 border border-indigo-400/30 tracking-wider">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>OFFICIAL DIGITAL STOREFRONT</span>
            </div>

            {/* Store Name & Tagline */}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{store.name}</h1>
              <p className="text-xs font-bold text-amber-300 mt-1">
                {store.tagline || 'Scan Karo, Ghare Baithe Online Order Karo'}
              </p>
            </div>

            {/* High-Res QR Code Frame */}
            <div className="relative mx-auto w-56 h-56 rounded-2xl bg-white p-3 shadow-xl ring-4 ring-indigo-500/30 flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt={`QR Code for ${store.name}`}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Scan Call To Action Banner */}
            <div className="space-y-1 bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-xs font-black text-white flex items-center justify-center gap-1.5">
                <span>📲 SCAN QR CODE TO SHOP ONLINE</span>
              </p>
              <p className="text-[10px] text-slate-300 font-medium">
                Scan with any Phone Camera or WhatsApp to browse products & order instantly!
              </p>
            </div>

            {/* Platform Trust Badges */}
            <div className="flex items-center justify-center gap-3 pt-2 text-[9px] text-indigo-200 font-extrabold uppercase tracking-wide border-t border-indigo-800/50">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> Instant Order
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShoppingBag className="h-3 w-3 text-amber-400" /> Live Catalog
              </span>
              <span>•</span>
              <span>COD / UPI</span>
            </div>

            {/* Clean Display URL Footer */}
            <p className="text-[10px] text-slate-400 font-mono truncate pt-1">
              {displayUrl}
            </p>
          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="border-t border-slate-800 p-4 sm:p-5 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-700 transition-all border border-slate-700 shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4 text-indigo-400" />
            <span>Download High-Res QR Image</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-black text-white hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>🖨️ Print Counter Standee (A4/A5)</span>
          </button>
        </div>

      </div>
    </div>
  )
}
