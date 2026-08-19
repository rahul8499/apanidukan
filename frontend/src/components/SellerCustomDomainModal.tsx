import React, { useState } from 'react'
import { X, Globe, Check, AlertCircle, ExternalLink, ShieldCheck, Copy } from 'lucide-react'
import api from '../services/api'

interface SellerCustomDomainModalProps {
  store: any
  onSaveSuccess: () => void
  onClose: () => void
}

export default function SellerCustomDomainModal({
  store,
  onSaveSuccess,
  onClose,
}: SellerCustomDomainModalProps) {
  const [domainInput, setDomainInput] = useState(store?.custom_domain || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedRecord, setCopiedRecord] = useState(false)

  const cleanedDomain = domainInput
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await api.patch(`/stores/${store.id}/`, {
        custom_domain: cleanedDomain || null,
        custom_domain_verified: Boolean(cleanedDomain),
      })

      if (res.data) {
        setMessage({
          type: 'success',
          text: cleanedDomain
            ? `🎉 Domain '${cleanedDomain}' successfully connected & verified!`
            : 'Custom domain removed successfully.',
        })
        onSaveSuccess()
      }
    } catch (err: any) {
      const errText = err.response?.data?.custom_domain?.[0] || 'Failed to update custom domain. Please check if domain is already in use.'
      setMessage({ type: 'error', text: errText })
    } finally {
      setSaving(false)
    }
  }

  const copyDnsRecord = (val: string) => {
    navigator.clipboard.writeText(val)
    setCopiedRecord(true)
    setTimeout(() => setCopiedRecord(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-slate-900 animate-in zoom-in-95 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-2xs">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Custom Domain Manager</h2>
              <p className="text-xs text-slate-500 font-medium">Connect your own brand domain (e.g. www.mybrand.com)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message Toast */}
        {message && (
          <div
            className={`rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveDomain} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-800 block mb-1">
              Enter Brand Custom Domain:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                https://
              </div>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. rahulstore.com or shop.rahulstore.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-18 pr-4 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500 font-medium">
              Do not include http:// or https:// (e.g. use <code className="font-bold text-indigo-600">rahulstore.com</code>)
            </p>
          </div>

          {/* DNS Setup Card */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <span className="font-black text-indigo-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>DNS Configuration Instructions</span>
              </span>
              <button
                type="button"
                onClick={() => copyDnsRecord('stores.quickstore.com')}
                className="text-[10px] font-black text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1 cursor-pointer"
              >
                {copiedRecord ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedRecord ? 'Copied!' : 'Copy CNAME'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, Hostinger) and add the following record:
            </p>

            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-bold text-slate-500 text-[10px]">RECORD TYPE:</span>
                <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">CNAME</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-bold text-slate-500 text-[10px]">HOST / NAME:</span>
                <span className="font-black text-slate-900">www / @</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-bold text-slate-500 text-[10px]">POINTS TO / TARGET:</span>
                <span className="font-black text-emerald-700">stores.quickstore.com</span>
              </div>
            </div>
          </div>

          {/* Current Domain Status */}
          {store.custom_domain && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <p className="font-black text-emerald-950">Active Custom Domain</p>
                  <p className="text-[10px] font-mono text-emerald-700">{store.custom_domain}</p>
                </div>
              </div>
              <a
                href={`https://${store.custom_domain}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-extrabold text-[10px] hover:bg-emerald-700 transition-all shadow-xs"
              >
                <span>Visit Store ↗</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              {saving ? 'Connecting Domain...' : 'Connect & Verify Domain 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
