import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')

  const auth = useAuth()
  const navigate = useNavigate()

  async function checkPhoneAvailability(phoneNumber: string) {
    const clean = phoneNumber.replace(/\D/g, '')
    if (clean.length === 10) {
      try {
        const res = await api.post('/auth/check-availability/', { phone_number: clean })
        if (res.data?.phone_exists) {
          setPhoneError('Is mobile number se pehle hi account bana hua hai. Ek number se do account nahi ban sakte.')
        } else {
          setPhoneError('')
        }
      } catch {
        // silent fallback
      }
    } else {
      setPhoneError('')
    }
  }

  async function checkEmailAvailability(emailVal: string) {
    const clean = emailVal.trim().toLowerCase()
    if (clean.includes('@') && clean.includes('.')) {
      try {
        const res = await api.post('/auth/check-availability/', { email: clean })
        if (res.data?.email_exists) {
          setEmailError('Is email address se pehle hi account bana hua hai. Ek email se do account nahi ban sakte.')
        } else {
          setEmailError('')
        }
      } catch {
        // silent fallback
      }
    } else {
      setEmailError('')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone && cleanPhone.length !== 10) {
      setError('Mobile number dena ho to 10-digit valid number enter karein, ya field blank chhodein.')
      return
    }

    if (phoneError || emailError) {
      setError(phoneError || emailError)
      return
    }

    setLoading(true)
    try {
      // Pre-check duplicates before registration
      const check = await api.post('/auth/check-availability/', {
        ...(cleanPhone ? { phone_number: cleanPhone } : {}),
        email: email.trim().toLowerCase()
      })

      if (cleanPhone && check.data?.phone_exists) {
        setError('An account with this mobile number already exists. Ek number se do account nahi ban sakte. Kripya login karein.')
        setPhoneError('Is number se account pehle hi bana hua hai.')
        setLoading(false)
        return
      }

      if (check.data?.email_exists) {
        setError('An account with this email address already exists. Ek email se do account nahi ban sakte. Kripya login karein.')
        setEmailError('Is email se account pehle hi bana hua hai.')
        setLoading(false)
        return
      }

      if (!cleanPhone) {
        await auth.register({ email: email.trim().toLowerCase(), password, first_name: firstName.trim(), last_name: lastName.trim() })
        navigate('/start?method=email')
      } else {
        navigate(`/start?phone=${cleanPhone}`)
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (typeof data?.detail === 'string') {
        setError(data.detail)
      } else if (Array.isArray(data?.phone_number)) {
        setError(data.phone_number[0])
      } else if (Array.isArray(data?.email)) {
        setError(data.email[0])
      } else {
        setError(err?.message || 'Registration failed. Kripya details check karein.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/apanidukan1.png"
            alt="Apani Dukan"
            className="h-28 sm:h-32 w-auto object-contain drop-shadow-xl"
          />
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-black uppercase tracking-wider text-indigo-600 mb-2">
              Seller Account
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Apna store shuru karne ke liye register karein
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <span className="font-bold">{error}</span>
              </div>
              {(error.includes('already exists') || error.includes('do account nahi ban sakte')) && (
                <Link
                  to="/login"
                  className="mt-1 text-center py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all"
                >
                  Direct Login Page par jayein →
                </Link>
              )}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  placeholder="Rahul"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  placeholder="Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-slate-400 font-normal">(optional, 10 digits)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">+91</span>
                <input
                  value={phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setPhone(val)
                    if (val.length === 10) checkPhoneAvailability(val)
                  }}
                  onBlur={() => checkPhoneAvailability(phone)}
                  maxLength={10}
                  placeholder="9876543210"
                  className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 ${
                    phoneError ? 'border-red-400 focus:ring-red-400 bg-red-50/50' : 'border-slate-200 focus:ring-indigo-500'
                  }`}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">Phone optional hai. Number bharne par agle step mein OTP bhejkar verify karein; is form par OTP nahi bheja jayega. Blank chhodne par email/password se continue karein.</p>
              {phoneError && (
                <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                  <span>❌</span> {phoneError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setEmailError('')
                }}
                onBlur={() => checkEmailAvailability(email)}
                required
                type="email"
                placeholder="seller@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  emailError ? 'border-red-400 focus:ring-red-400 bg-red-50/50' : 'border-slate-200 focus:ring-indigo-500'
                }`}
              />
              {emailError && (
                <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                  <span>❌</span> {emailError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password * (min 8 characters)</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3.5 pr-12 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(phoneError) || Boolean(emailError)}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md shadow-slate-900/10 disabled:opacity-50"
            >
              {loading ? 'Checking availability...' : 'Continue to Create Store →'}
            </button>
          </form>

          {/* Shortcut to Start Store with OTP */}
          <div className="mt-5 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-2">
            <div className="text-[11px] text-indigo-900">
              <span className="font-bold">📱 Fast Mobile OTP Signup</span>
              <p className="text-indigo-600">Password ke bina 30 second mein store banayein</p>
            </div>
            <Link
              to="/start"
              className="shrink-0 text-xs font-black text-indigo-700 hover:text-indigo-900 underline"
            >
              Start with OTP →
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
