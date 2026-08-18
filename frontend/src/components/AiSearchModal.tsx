import React, { useState } from 'react'
import api from '../services/api'
import { useParams } from 'react-router-dom'
import { Sparkles, X, Send, Bot, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface AiSearchModalProps {
  onClose: () => void
  onResults: (products: any[], query: string) => void
}

type ChatItem = { role: 'user' | 'assistant'; text: string; medicines?: string[]; warnings?: string[] }

export default function AiSearchModal({ onClose, onResults }: AiSearchModalProps) {
  const { storeSlug } = useParams()
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
      const answer = response.data.answer || 'Search completed.'
      const medicines = response.data.medicine_names || []

      setItems(old => [...old, {
        role: 'assistant',
        text: answer,
        medicines: medicines,
        warnings: response.data.warnings,
      }])

      if (medicines.length > 0 || question.length > 2) {
        const searchQuery = medicines.length > 0 ? medicines.join(' ') : question
        try {
          const searchRes = await api.post(`/public/stores/${storeSlug}/ai-search/`, { query: searchQuery })
          if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
            onResults(searchRes.data, searchQuery)
          }
        } catch {}
      }

    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'AI Assistant is currently connecting.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/40 p-3 sm:p-4 pt-16 sm:pt-4 pb-20 sm:pb-4 backdrop-blur-xs font-sans animate-fade-in">
      
      {/* ULTRA-PREMIUM CLEAN LIGHT CONTAINER */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 flex flex-col max-h-[75vh] sm:max-h-[82vh] font-sans">
        
        {/* MODAL HEADER */}
        <header className="flex items-center justify-between bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-4 sm:px-5 py-3.5 text-white shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white font-bold text-lg shadow-inner border border-white/20 shrink-0">
              ✨
            </div>
            <div>
              <h2 className="font-black text-xs sm:text-sm text-white leading-tight">
                AI Store Search & Assistant
              </h2>
              <p className="text-[10px] sm:text-[11px] text-indigo-100 font-medium">
                Search products, compare prices & ask questions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/90 text-xs">
          
          {items.length === 0 && (
            <div className="space-y-3 my-1">
              
              {/* HERO GREETING BANNER */}
              <div className="rounded-2xl bg-indigo-50/90 p-4 text-indigo-950 border border-indigo-100 shadow-2xs space-y-1.5">
                <p className="font-extrabold text-xs flex items-center gap-1.5 text-indigo-900">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  <span>Welcome to AI Smart Store Assistant</span>
                </p>
                <p className="text-[11px] leading-relaxed text-indigo-800 font-medium">
                  Ask any question to instantly search products, check prices, or get recommendations in this store.
                </p>
              </div>

              {/* QUICK PROMPTS CAPSULES */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quick Actions:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ask(undefined, 'What are the popular products and offers in this store?')}
                    className="rounded-xl border border-indigo-200/80 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    🛍️ Popular Products & Deals
                  </button>
                  <button
                    type="button"
                    onClick={() => ask(undefined, 'How can I track my live order?')}
                    className="rounded-xl border border-indigo-200/80 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    🚚 Track Live Order
                  </button>
                  <button
                    type="button"
                    onClick={() => ask(undefined, 'Suggest healthcare and wellness items')}
                    className="rounded-xl border border-indigo-200/80 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    🔍 Smart Search
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
                  ? 'ml-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-xs'
                  : 'mr-4 bg-white text-slate-900 border border-slate-200/90 shadow-2xs font-medium'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed text-xs">{item.text}</p>

              {/* Relevant Products Pills */}
              {!!item.medicines?.length && (
                <div className="mt-2.5 rounded-xl bg-emerald-50/90 p-2.5 border border-emerald-200/80">
                  <p className="font-black text-[11px] text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Relevant Products Found:</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.medicines.map((med, idx) => (
                      <span key={idx} className="rounded-lg bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
            <div className="flex items-center gap-2 text-xs text-indigo-700 font-bold p-2.5 bg-indigo-50/90 rounded-xl border border-indigo-100">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
              <span>AI is searching products & details…</span>
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
              placeholder="Ask AI to search products, prices, or recommendations..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
            />

            <button
              disabled={busy}
              type="submit"
              className="flex h-10 px-4 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-black text-white shadow-md hover:opacity-95 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
