import React, { useState } from 'react'
import api from '../services/api'
import { Sparkles, X, Send, Bot, AlertTriangle, CheckCircle2, TrendingUp, Package, Tag, Lightbulb } from 'lucide-react'

interface SellerAiAssistantModalProps {
  store: any
  onClose: () => void
}

type ChatItem = { role: 'user' | 'assistant'; text: string; insights?: string[]; warnings?: string[] }

export default function SellerAiAssistantModal({ store, onClose }: SellerAiAssistantModalProps) {
  const [text, setText] = useState('')
  const [items, setItems] = useState<ChatItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function ask(event?: React.FormEvent, customQuestion?: string) {
    if (event) event.preventDefault()
    const question = customQuestion || text.trim()
    if (!question) return

    setItems(old => [...old, { role: 'user', text: question }])
    setText('')
    setError('')
    setBusy(true)

    try {
      const data = new FormData()
      data.append('message', question)
      data.append('history', JSON.stringify(items.slice(-6).map(({ role, text }) => ({ role, text }))))

      const response = await api.post('/ai/assistant/', data)
      const answer = response.data.answer || 'Analysis completed.'

      setItems(old => [...old, {
        role: 'assistant',
        text: answer,
        warnings: response.data.warnings,
      }])

    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Seller AI Assistant is currently connecting.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/50 p-3 sm:p-4 pt-16 sm:pt-4 pb-20 sm:pb-4 backdrop-blur-xs font-sans animate-fade-in">
      
      {/* ULTRA-PREMIUM CLEAN LIGHT CONTAINER FOR SELLER */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[78vh] sm:max-h-[85vh] font-sans">
        
        {/* MODAL HEADER WITH TEAL & INDIGO GRADIENT */}
        <header className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-teal-950 to-indigo-950 px-4 sm:px-5 py-3.5 text-white border-b border-teal-500/30 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-lg shadow-md border border-white/20 shrink-0">
              ✨
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
                  Seller AI Copilot & Business Assistant
                </h2>
                <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[9px] font-black text-teal-300 border border-teal-500/30">
                  SMART AGENT
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-teal-200 font-medium">
                Sales Strategy • Pricing • Demand Analytics • Product Creation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 border border-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 text-xs">
          
          {items.length === 0 && (
            <div className="space-y-3.5 my-1">
              
              {/* HERO GREETING BANNER */}
              <div className="rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-teal-500/10 p-4 text-slate-900 border border-teal-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-600 text-white text-xs font-black">
                    🤖
                  </div>
                  <p className="font-extrabold text-xs text-slate-900">
                    Welcome to {store?.name || 'Store'} AI Copilot
                  </p>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                  Ask me about demand trends, pricing recommendations, discount strategies, or product catalog optimization.
                </p>
              </div>

              {/* SELLER QUICK PROMPTS CAPSULES */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recommended Seller Actions:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ask(undefined, 'How can I increase sales and demand for my store?')}
                    className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-bold text-teal-800 shadow-2xs hover:bg-teal-50 transition-all cursor-pointer"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                    <span>📈 Increase Sales Strategy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => ask(undefined, 'Which products should I restock or add discount coupons to?')}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-800 shadow-2xs hover:bg-indigo-50 transition-all cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5 text-indigo-600" />
                    <span>📦 Restock & Offer Advice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => ask(undefined, 'Write an attractive product description and marketing tagline for my catalog')}
                    className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-[11px] font-bold text-purple-800 shadow-2xs hover:bg-purple-50 transition-all cursor-pointer"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-purple-600" />
                    <span>💡 Marketing & Taglines</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {items.map((item, index) => (
            <div
              key={index}
              className={`rounded-2xl p-3.5 shadow-2xs ${
                item.role === 'user'
                  ? 'ml-8 bg-gradient-to-r from-teal-700 to-indigo-700 text-white font-medium shadow-xs'
                  : 'mr-4 bg-white text-slate-900 border border-slate-200 shadow-2xs font-medium'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed text-xs">{item.text}</p>

              {/* Warnings */}
              {!!item.warnings?.length && (
                <div className="mt-2 rounded-xl bg-amber-50 p-2 text-[10px] text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>{item.warnings.join(' ')}</span>
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-teal-700 font-bold p-3 bg-teal-50/90 rounded-xl border border-teal-200">
              <span className="h-2 w-2 rounded-full bg-teal-600 animate-ping" />
              <span>AI Copilot is analyzing sales data & insights…</span>
            </div>
          )}
        </div>

        {/* INPUT FORM */}
        <form onSubmit={(e) => ask(e)} className="border-t border-slate-200 bg-white p-3 space-y-2 shrink-0">
          {error && (
            <div className="rounded-xl bg-rose-50 p-2 text-[11px] font-semibold text-rose-600 border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Ask AI Copilot for sales advice, descriptions, or pricing strategy..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
            />

            <button
              disabled={busy}
              type="submit"
              className="flex h-10 px-4 items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-xs font-black text-white shadow-md hover:opacity-95 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
