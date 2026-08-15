import React, { useState } from 'react'
import api from '../services/api'
import { useParams } from 'react-router-dom'

interface AiSearchModalProps {
  onClose: () => void
  onResults: (products: any[], query: string) => void
}

export default function AiSearchModal({ onClose, onResults }: AiSearchModalProps) {
  const { storeSlug } = useParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await api.post(`/public/stores/${storeSlug}/ai-search/`, { query })
      onResults(res.data, query)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to search. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>✨</span> AI Search
            </h2>
            <button onClick={onClose} className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-indigo-100">Tell us what you need in plain English.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSearch}>
            <label className="mb-2 block text-sm font-semibold text-slate-700">What are you looking for?</label>
            <textarea
              autoFocus
              className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={3}
              placeholder="e.g., Face wash under 500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-bold text-white shadow hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  Search <span className="text-lg">→</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
