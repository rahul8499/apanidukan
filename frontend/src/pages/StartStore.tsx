import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const errorMessage = (error: any) => {
  const data = error?.response?.data
  if (!data) return 'Server se connection nahi hua. Backend running hai ya nahi check karein.'
  return data.detail || Object.values(data).flat().join(' ') || 'Details check karke phir try karein.'
}

/** Public platform onboarding: anyone can create their own seller store. */
export default function StartStore(){
  const auth = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent){
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.register({ email, password, first_name: firstName, last_name: lastName })
      const store = await api.post('/stores/', { name, description })
      navigate(`/stores/${store.data.id}/manage`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally { setLoading(false) }
  }

  return <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
    <div className="mb-8 text-center"><span className="section-label">Launch your digital storefront</span><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Apna online store, <span className="text-indigo-600">minutes mein.</span></h1><p className="mx-auto mt-3 max-w-xl text-slate-600">Store details bharain, products add karein, aur apna unique customer link share karein.</p></div>
    <form onSubmit={submit} className="premium-card space-y-7 p-6 sm:p-8">
      <section><p className="section-label">Step 01</p><h2 className="mt-1 text-lg font-bold">Aapki store information</h2><div className="mt-4 grid gap-3"><input value={name} onChange={e => setName(e.target.value)} required placeholder="Store name (e.g. Rahul Digital Shop)" className="premium-input" /><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Aap kya sell karte hain?" className="premium-input min-h-24" /></div></section>
      <section className="border-t border-slate-100 pt-6"><p className="section-label">Step 02</p><h2 className="mt-1 text-lg font-bold">Aapka account</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="First name" className="premium-input" /><input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Last name" className="premium-input" /></div><div className="mt-3 grid gap-3"><input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="Email address" className="premium-input" /><input value={password} onChange={e => setPassword(e.target.value)} required minLength={8} type="password" placeholder="Password (minimum 8 characters)" className="premium-input" /></div></section>
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="primary-button w-full">{loading ? 'Store ban raha hai...' : 'Create my store →'}</button>
      <p className="text-center text-sm text-gray-500">Already account hai? <a className="text-blue-600" href="/login">Login karein</a></p>
    </form>
  </main>
}
