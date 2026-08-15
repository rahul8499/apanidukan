import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPassword(){
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent){ e.preventDefault(); setBusy(true); try { const response = await api.post('/auth/password-reset/', { email }); setMessage(response.data.message) } finally { setBusy(false) } }
  return <main className="mx-auto max-w-md px-4 py-14"><section className="premium-card p-7"><p className="section-label">Account recovery</p><h1 className="mt-2 text-3xl font-bold">Reset password</h1><p className="mt-2 text-sm text-slate-500">Enter your email and we’ll send a secure reset link.</p>{message ? <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : <form onSubmit={submit} className="mt-6 space-y-4"><input className="premium-input" required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} /><button className="primary-button w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button></form>}<Link to="/login" className="mt-6 block text-center text-sm font-semibold text-indigo-600">← Back to login</Link></section></main>
}
