import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()
  const navigate = useNavigate()

  async function submit(e: React.FormEvent){
    e.preventDefault()
    try{
      const user = await auth.login(email, password)
      navigate(user.is_staff ? '/platform' : '/dashboard')
    }catch(err:any){
      setError(err?.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="premium-card p-7 sm:p-8"><p className="section-label">Welcome back</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Login to your store</h1><p className="mt-2 text-sm text-slate-500">Manage your products and share your storefront.</p>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="Email address" className="premium-input" />
        <input value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Password" type="password" className="premium-input" />
        <button className="primary-button w-full">Login →</button>
      </form>
      <div className="mt-4 text-right"><Link to="/forgot-password" className="text-sm font-semibold text-indigo-600">Forgot password?</Link></div><div className="mt-5 text-center text-sm text-slate-500">Don't have an account? <Link to="/start" className="font-semibold text-indigo-600">Create your store</Link></div></div>
    </div>
  )
}
