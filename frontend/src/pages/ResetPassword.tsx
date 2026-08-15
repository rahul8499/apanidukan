import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

export default function ResetPassword(){
  const { uid, token } = useParams(); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  async function submit(e: React.FormEvent){ e.preventDefault(); setError(''); try { await api.post(`/auth/password-reset/${uid}/${token}/`, { password }); setMessage('Password updated. You can now login.') } catch (requestError: any) { setError(requestError?.response?.data?.detail?.join?.(' ') || requestError?.response?.data?.detail || 'Reset link is invalid or expired.') } }
  return <main className="mx-auto max-w-md px-4 py-14"><section className="premium-card p-7"><p className="section-label">New password</p><h1 className="mt-2 text-3xl font-bold">Secure your account</h1>{message ? <><div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div><Link to="/login" className="primary-button mt-5 block text-center">Login now</Link></> : <form onSubmit={submit} className="mt-6 space-y-4"><input className="premium-input" required minLength={8} type="password" placeholder="New password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} />{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button className="primary-button w-full">Update password</button></form>}</section></main>
}
