import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await api.post('/auth/password-reset/', { email })
      setMessage(response.data.message || 'If an account exists, a reset link was sent.')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-teal-50 flex flex-col justify-start items-center px-4 pt-12 sm:pt-20 pb-10 font-sans">
      <div className="w-full max-w-md">
        
        <div className="flex justify-center mb-0 mt-4 sm:mt-0">
          <img
            src="/apanidukan1.png"
            alt="Apani Dukan"
            className="h-28 sm:h-32 md:h-40 lg:h-48 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="p-5 sm:p-8 shadow-2xl shadow-slate-500/10 border border-white/80 rounded-3xl bg-white/60 backdrop-blur-2xl">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 text-center">
            Reset password
          </h1>
          <p className="mt-2 text-[13px] sm:text-sm font-bold text-slate-500 text-center leading-relaxed">
            Enter your email and we’ll send a secure reset link.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-700 flex items-start gap-2">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {message ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800 text-center shadow-sm">
              <span className="block text-3xl mb-2">✅</span>
              {message}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                  Email Address
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold tracking-wide text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <button
                className="w-full py-3 text-sm font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md shadow-slate-900/20 hover:-translate-y-0.5 transition-all"
                disabled={busy}
              >
                {busy ? 'Sending link...' : 'Send reset link ➔'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200/50 flex justify-center">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 group bg-white/50 hover:bg-white px-4 py-1.5 rounded-full border border-slate-200 hover:border-indigo-200 shadow-sm"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
