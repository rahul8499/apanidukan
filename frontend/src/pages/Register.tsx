import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()
  const navigate = useNavigate()

  async function submit(e: React.FormEvent){
    e.preventDefault()
    try{
      await auth.register({ email, password, first_name: firstName, last_name: lastName })
      navigate('/dashboard')
    }catch(err:any){
      setError('Registration failed')
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14"><div className="premium-card p-7 sm:p-8">
      <p className="section-label">Seller account</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Create account</h1>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input value={firstName} onChange={e=>setFirstName(e.target.value)} required placeholder="First name" className="premium-input" />
        <input value={lastName} onChange={e=>setLastName(e.target.value)} required placeholder="Last name" className="premium-input" />
        <input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="Email address" className="premium-input" />
        <input value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="Password (minimum 8 characters)" type="password" className="premium-input" />
        <button className="primary-button w-full">Create account →</button>
      </form>
    </div></div>
  )
}
