import { LocateFixed, MapPin, X } from 'lucide-react'

type Props = {
  open: boolean
  loading?: boolean
  onAllow: () => void
  onClose: () => void
  title?: string
  description?: string
}

/** First-run, explicit location consent. No coordinates leave the browser
 * except in the nearby-store request after the customer chooses Allow. */
export default function CustomerLocationPrompt({ open, loading, onAllow, onClose, title = 'Apne aas-paas ki dukaan dekhein', description = 'Aapki location sirf nearby stores aur unki distance dikhane ke liye use hogi. Aap ise kabhi bhi Change kar sakte hain.' }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="location-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><MapPin className="h-6 w-6" /></span>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="location-title" className="mt-4 text-xl font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <button type="button" onClick={onAllow} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-60">
          <LocateFixed className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> {loading ? 'Location le rahe hain...' : 'Location allow karein'}
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700">Abhi nahi</button>
      </div>
    </div>
  )
}
