import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [authMethod, setAuthMethod] = useState<'otp' | 'email'>('otp') // Default to fast OTP login

  // Email state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // OTP state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const auth = useAuth()
  const navigate = useNavigate()

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Email / Password Login Submit
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      const user = await auth.login(email, password)
      navigate(user.is_staff ? '/platform' : '/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Send OTP
  async function handleSendOTP(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    setSuccessMsg(null)

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
      setError(err?.response?.data?.detail || err?.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP & Login
  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const cleanPhone = phone.replace(/\D/g, '')
    if (!otp || otp.trim().length < 4) {
      setError('Please enter the OTP code sent to your mobile number.')
      return
    }

    setLoading(true)
    try {
      const res = await auth.verifyOTP(cleanPhone, otp)
      if (res.is_new_user) {
        // User doesn't exist, redirect to registration with phone prefilled
        navigate(`/start?phone=${cleanPhone}&otp=${otp}`)
      } else {
        const user = res.user
        navigate(user?.is_staff ? '/platform' : '/dashboard')
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid or expired OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <div className="premium-card p-6 sm:p-8 shadow-xl border border-slate-100 rounded-3xl bg-white">

        {/* Header */}
        <div className="text-center sm:text-left">
          <span className="section-label text-xs font-semibold tracking-wider text-indigo-600 uppercase">
            Welcome back
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Login to your store
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage your products and share your storefront.
          </p>
        </div>

        {/* Tab Switcher: Mobile OTP vs Email */}
        <div className="mt-6 flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setAuthMethod('otp'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all ${authMethod === 'otp'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span>📱</span> Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('email'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all ${authMethod === 'email'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span>✉️</span> Email & Password
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 flex items-start gap-2">
            <span>⚠️</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-700 flex items-start gap-2">
            <span>✅</span>
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* --- OPTION A: MOBILE OTP LOGIN --- */}
        {authMethod === 'otp' && (
          <div className="mt-6">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-semibold text-slate-500">
                      +91
                    </span>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="9876543210"
                      className="premium-input pl-14 w-full text-base font-medium tracking-wide"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-button w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-indigo-200"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Enter 6-Digit OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      Change Number (+91 {phone})
                    </button>
                  </div>
                  <input
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="Enter OTP (e.g. 123456)"
                    className="premium-input w-full text-center text-xl font-bold tracking-widest py-3 border-2 border-indigo-200 focus:border-indigo-600 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-button w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-indigo-200"
                >
                  {loading ? 'Verifying OTP...' : 'Verify & Login →'}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <span>Didn't receive SMS?</span>
                  {countdown > 0 ? (
                    <span className="font-semibold text-slate-400">Resend in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="font-bold text-indigo-600 hover:underline"
                    >
                      Resend OTP Now
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* --- OPTION B: EMAIL & PASSWORD LOGIN (ORIGINAL FLOW PRESERVED) --- */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                type="email"
                placeholder="store@gmail.com"
                className="premium-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••••"
                type="password"
                className="premium-input w-full"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-button w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md"
            >
              {loading ? 'Logging in...' : 'Login →'}
            </button>

            <div className="mt-3 text-right">
              <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </form>
        )}

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs sm:text-sm text-slate-500 border-t border-slate-100 pt-5">
          Don't have an account?{' '}
          <Link to="/start" className="font-semibold text-indigo-600 hover:underline">
            Create your store
          </Link>
        </div>

      </div>
    </div>
  )
}
