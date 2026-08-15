import React, { useRef, useState } from 'react'
import api from '../services/api'

type ChatItem = { role: 'user' | 'assistant'; text: string; medicines?: string[]; extractedText?: string; warnings?: string[] }

export default function AiAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [items, setItems] = useState<ChatItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
    } else {
      setSelectedFileName('')
    }
  }

  const clearFile = () => {
    if (fileRef.current) fileRef.current.value = ''
    setSelectedFileName('')
  }

  async function ask(event: React.FormEvent, customQuestion?: string) {
    if (event) event.preventDefault()
    const image = fileRef.current?.files?.[0]
    const question = customQuestion || text.trim() || (image ? 'Extract prescription details and text from this image.' : '')
    if (!question && !image) return

    setItems(old => [...old, { role: 'user', text: image ? `📷 [Image: ${image.name}] ${question}` : question }])
    setText(''); setError(''); setBusy(true)
    clearFile()

    try {
      const data = new FormData()
      data.append('message', question)
      if (image) data.append('image', image)

      const response = await api.post('/ai/assistant/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setItems(old => [...old, {
        role: 'assistant',
        text: response.data.answer || 'Analysis completed.',
        medicines: response.data.medicine_names,
        extractedText: response.data.extracted_text,
        warnings: response.data.warnings,
      }])
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'AI Assistant is currently connecting to local Ollama server.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
      {open && (
        <section className="pointer-events-auto mb-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all">
          {/* Header */}
          <header className="flex items-center justify-between bg-gradient-to-r from-indigo-700 to-violet-800 px-4 py-3.5 text-white shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <p className="font-extrabold text-sm tracking-wide">MultiStore AI Assistant</p>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">Ask questions · Prescription OCR & Text Extraction</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ollama Local
            </span>
          </header>

          {/* Chat Messages Body */}
          <div className="max-h-80 min-h-40 space-y-3 overflow-y-auto bg-slate-50 p-3 text-xs">
            {items.length === 0 && (
              <div className="space-y-3 p-1">
                <div className="rounded-2xl bg-indigo-50/80 p-3 text-indigo-900 border border-indigo-100">
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <span>💡</span> How can I help you today?
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-700">
                    Upload prescription images to extract medicine names or ask any store & order related questions.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Quick Prompts:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => ask(e, 'Extract text and medicines from uploaded prescription image.')}
                      className="rounded-xl border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                    >
                      📋 Extract Prescription
                    </button>
                    <button
                      type="button"
                      onClick={(e) => ask(e, 'What are the popular products and offers in this store?')}
                      className="rounded-xl border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                    >
                      🛍️ Store Products
                    </button>
                    <button
                      type="button"
                      onClick={(e) => ask(e, 'How can I track my order status?')}
                      className="rounded-xl border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                    >
                      🚚 Track Order
                    </button>
                  </div>
                </div>
              </div>
            )}

            {items.map((item, index) => (
              <div
                key={index}
                className={`rounded-2xl p-3 shadow-sm ${
                  item.role === 'user'
                    ? 'ml-8 bg-indigo-600 text-white font-medium'
                    : 'mr-4 bg-white text-slate-800 border border-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>

                {/* Display extracted medicine pills if available */}
                {!!item.medicines?.length && (
                  <div className="mt-2 rounded-xl bg-emerald-50 p-2 border border-emerald-200">
                    <p className="font-bold text-[11px] text-emerald-800 flex items-center gap-1">
                      <span>💊</span> Detected Medicines:
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.medicines.map((med, idx) => (
                        <span key={idx} className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted text accordion */}
                {item.extractedText && (
                  <details className="mt-2 rounded-xl bg-slate-100 p-2 text-[11px]">
                    <summary className="cursor-pointer font-bold text-slate-700 flex items-center gap-1">
                      <span>📝</span> View Extracted Text
                    </summary>
                    <p className="mt-1.5 whitespace-pre-wrap text-slate-600 font-mono text-[10px] bg-white p-2 rounded-lg border border-slate-200">
                      {item.extractedText}
                    </p>
                  </details>
                )}

                {/* Warnings */}
                {!!item.warnings?.length && (
                  <div className="mt-2 rounded-xl bg-amber-50 p-2 text-[10px] text-amber-800 border border-amber-200">
                    ⚠️ {item.warnings.join(' ')}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold p-2 bg-indigo-50/60 rounded-xl">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                <span>Ollama AI is analyzing your query…</span>
              </div>
            )}
          </div>

          {/* Form Input */}
          <form onSubmit={(e) => ask(e)} className="border-t border-slate-100 bg-white p-3 space-y-2">
            {error && (
              <div className="rounded-xl bg-rose-50 p-2 text-[11px] font-semibold text-rose-600 border border-rose-200">
                {error}
              </div>
            )}

            {/* Selected File Badge */}
            {selectedFileName && (
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700 font-semibold">
                <span className="truncate">📷 {selectedFileName}</span>
                <button type="button" onClick={clearFile} className="text-rose-500 hover:text-rose-700 font-bold ml-2">
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 title='Upload prescription image'">
                📷
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Ask Ollama AI or attach image…"
                className="premium-input min-w-0 flex-1 !px-3 !py-2 text-xs"
              />
              <button
                disabled={busy}
                type="submit"
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen(value => !value)}
        className="pointer-events-auto ml-auto flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-2xl text-white shadow-2xl hover:scale-105 transition-transform"
        aria-label="Open AI Assistant"
      >
        ✨
      </button>
    </div>
  )
}
