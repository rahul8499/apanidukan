import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const errorMessage = (error: any) => {
  const data = error?.response?.data
  if (!data) return 'Server se connection nahi hua. Backend running hai ya nahi check karein.'
  return data.detail || Object.values(data).flat().join(' ') || 'Details check karke phir try karein.'
}

/** Public platform onboarding: create seller store with MSG91 Mobile OTP or Email. */
export default function StartStore() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [regMode, setRegMode] = useState<'otp' | 'email'>('otp')

  // Common store fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Email mode fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // OTP mode fields
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [otp, setOtp] = useState(searchParams.get('otp') || '')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Handle URL query pre-fills from login redirect
  useEffect(() => {
    const queryPhone = searchParams.get('phone')
    const queryOtp = searchParams.get('otp')
    if (queryPhone) {
      setPhone(queryPhone)
      setRegMode('otp')
    }
    if (queryOtp) {
      setOtp(queryOtp)
      setOtpVerified(true)
    }
  }, [searchParams])

  // Send OTP
  async function handleSendOTP() {
    setError('')
    setSuccessMsg('')

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    setLoading(true)
    try {
      const res = await auth.sendOTP(cleanPhone)
      setOtpSent(true)
      setCountdown(30)
      setSuccessMsg(res.message || 'OTP sent successfully!')
    } catch (err: any) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP
  async function handleVerifyOTP() {
    setError('')
    setSuccessMsg('')

    const cleanPhone = phone.replace(/\D/g, '')
    if (!otp || otp.trim().length < 4) {
      setError('Please enter the OTP code sent to your mobile number.')
      return
    }

    setLoading(true)
    try {
      const res = await auth.verifyOTP(cleanPhone, otp)
      if (!res.is_new_user) {
        // User already exists, redirect to dashboard
        navigate('/dashboard')
        return
      }
      setOtpVerified(true)
      setSuccessMsg('Mobile number verified! Please enter your store & account details below.')
    } catch (err: any) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Mobile OTP Registration Complete Submit
  async function handleOTPSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const cleanPhone = phone.replace(/\D/g, '')
    if (!otpVerified && !otp) {
      setError('Please verify your mobile number with OTP first.')
      return
    }
    if (!name.trim()) {
      setError('Store name is required.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.')
      return
    }

    setLoading(true)
    try {
      await auth.registerWithOTP({
        phone_number: cleanPhone,
        otp: otp,
        first_name: firstName,
        last_name: lastName,
        store_name: name,
        category: description,
        email: email,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Email Registration Submit (Original Preserved Flow)
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.register({ email, password, first_name: firstName, last_name: lastName })
      const store = await api.post('/stores/', { name, description })
      navigate(`/stores/${store.data.id}/manage`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
      {/* Header Banner */}
      <div className="mb-8 text-center">
        <span className="section-label text-xs font-semibold tracking-wider text-indigo-600 uppercase">
          Launch your digital storefront
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
          Apna online store, <span className="text-indigo-600">minutes mein.</span>
        </h1>
        <p className="mx-auto mt-2.5 max-w-xl text-sm sm:text-base text-slate-600">
          Store details bharain, products add karein, aur apna unique customer link share karein.
        </p>

        {/* Mode Selector */}
        <div className="mt-6 flex justify-center max-w-xs mx-auto rounded-2xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => { setRegMode('otp'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${regMode === 'otp' ? 'bg-white text-indigo-600 shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            📱 Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => { setRegMode('email'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${regMode === 'email' ? 'bg-white text-indigo-600 shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            ✉️ Email Account
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-start gap-2">
          <span>✅</span>
          <div>{successMsg}</div>
        </div>
      )}

      {/* --- FORM 1: MOBILE OTP REGISTRATION --- */}
      {regMode === 'otp' && (
        <form onSubmit={handleOTPSubmit} className="premium-card space-y-7 p-6 sm:p-8 bg-white shadow-xl border border-slate-100 rounded-3xl">

          {/* STEP 01: Store Info & Mobile Verification */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <span className="section-label text-xs font-bold text-indigo-600">Step 01</span>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">Aapki store information</h2>
              </div>
              {otpVerified && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold">
                  ✓ Phone Verified
                </span>
              )}
            </div>

            {/* Mobile Number & OTP Verification Box */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Mobile Number (for SMS & OTP Verification)
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-3 text-sm font-semibold text-slate-500">+91</span>
                  <input
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setOtpVerified(false); }}
                    disabled={otpVerified}
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="9876543210"
                    className="premium-input pl-14 w-full text-base font-semibold"
                  />
                </div>
                {!otpVerified && (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading || countdown > 0}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm whitespace-nowrap shadow-sm"
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : otpSent ? 'Resend OTP' : 'Send OTP →'}
                  </button>
                )}
              </div>

              {/* OTP Entry Box */}
              {otpSent && !otpVerified && (
                <div className="pt-2 flex gap-2 items-center">
                  <input
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="Enter 6-digit OTP"
                    className="premium-input flex-1 text-center font-bold text-lg tracking-widest border-2 border-indigo-300 focus:border-indigo-600 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP ✓'}
                  </button>
                </div>
              )}
            </div>

            {/* Store Name & Description Inputs */}
            <div className="mt-4 grid gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Store name (e.g. Rahul Digital Shop)"
                  className="premium-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Aap kya sell karte hain?</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Aap kya sell karte hain? (e.g. Clothes, Grocery, Electronics, Medicine)"
                  className="premium-input min-h-20 w-full"
                />
              </div>
            </div>
          </section>

          {/* STEP 02: Account Details */}
          <section className="border-t border-slate-100 pt-6">
            <span className="section-label text-xs font-bold text-indigo-600">Step 02</span>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">Aapka account</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  placeholder="First name (e.g. Rahul)"
                  className="premium-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  placeholder="Last name (e.g. Kolhe)"
                  className="premium-input w-full"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="Optional email address"
                className="premium-input w-full"
              />
            </div>
          </section>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="primary-button w-full py-3.5 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all"
          >
            {loading ? 'Store ban raha hai...' : 'Create my store →'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already account hai?{' '}
            <Link className="font-semibold text-indigo-600 hover:underline" to="/login">
              Login karein
            </Link>
          </p>
        </form>
      )}

      {/* --- FORM 2: ORIGINAL EMAIL REGISTRATION (PRESERVED) --- */}
      {regMode === 'email' && (
        <form onSubmit={handleEmailSubmit} className="premium-card space-y-7 p-6 sm:p-8 bg-white shadow-xl border border-slate-100 rounded-3xl">
          <section>
            <p className="section-label text-xs font-bold text-indigo-600">Step 01</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Aapki store information</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Store name (e.g. Rahul Digital Shop)"
                className="premium-input"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Aap kya sell karte hain?"
                className="premium-input min-h-24"
              />
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <p className="section-label text-xs font-bold text-indigo-600">Step 02</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Aapka account</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                placeholder="First name"
                className="premium-input"
              />
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                placeholder="Last name"
                className="premium-input"
              />
            </div>
            <div className="mt-3 grid gap-3">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                type="email"
                placeholder="Email address"
                className="premium-input"
              />
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                type="password"
                placeholder="Password (minimum 8 characters)"
                className="premium-input"
              />
            </div>
          </section>

          <button
            disabled={loading}
            className="primary-button w-full py-3.5 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all"
          >
            {loading ? 'Store ban raha hai...' : 'Create my store →'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already account hai?{' '}
            <Link className="font-semibold text-indigo-600 hover:underline" to="/login">
              Login karein
            </Link>
          </p>
        </form>
      )}
    </main>
  )
}
