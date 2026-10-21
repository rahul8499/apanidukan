import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Mail, ShieldCheck, Smartphone, Store } from 'lucide-react'

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
  const location = useLocation()
  const requestedPath = typeof location.state?.from === 'string' && location.state.from.startsWith('/') && !location.state.from.startsWith('//')
    ? location.state.from
    : '/dashboard'

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
      if (user.is_staff) {
        navigate('/admin', { replace: true })
      } else if (user.role === 'DELIVERY_AGENT') {
        navigate('/delivery/dashboard', { replace: true })
      } else {
        navigate(requestedPath, { replace: true })
      }
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
      const retryAfter = Number(err?.response?.data?.retry_after || 0)
      if (retryAfter > 0 && retryAfter <= 60) setCountdown(retryAfter)
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
      if (res.is_new_user || !res.has_store) {
        // User is new or doesn't have a store yet -> send to store setup with phone prefilled
        navigate(`/start?phone=${cleanPhone}&otp=${otp}`)
      } else {
        const user = res.user
        if (user?.is_staff) {
          navigate('/admin', { replace: true })
        } else {
          navigate(requestedPath, { replace: true })
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid or expired OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-[100svh] w-full items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-7 font-sans sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-36 h-80 w-80 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.28)] sm:p-7">
          <div className="mb-2 flex justify-center">
            <img
              src="/apanidukan-brand-logo.png"
              alt="Apani Dukan"
              className="h-auto w-[250px] max-w-full object-contain sm:w-[280px]"
            />
          </div>
          <div className="mb-5 text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
              Manage Your Store
            </h1>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-5 text-slate-500">
              Sign in to manage orders, products, and customer chats.
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Choose a sign-in method">
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setError(null); setSuccessMsg(null); }}
              role="tab"
              aria-selected={authMethod === 'otp'}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-bold transition-colors ${authMethod === 'otp'
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" /> Phone OTP
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('email'); setError(null); setSuccessMsg(null); }}
              role="tab"
              aria-selected={authMethod === 'email'}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-bold transition-colors ${authMethod === 'email'
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> Email &amp; password
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <span aria-hidden="true">⚠️</span><span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <span aria-hidden="true">✓</span><span>{successMsg}</span>
            </div>
          )}

          {authMethod === 'otp' && (
            <div className="mt-5">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label htmlFor="login-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Mobile number
                    </label>
                    <div className="flex min-h-12 items-center rounded-xl border border-slate-300 bg-white transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
                      <span className="ml-3 border-r border-slate-200 pr-3 text-sm font-semibold text-slate-600">
                        +91 <span className="sr-only">India country code</span>
                      </span>
                      <input
                        id="login-phone"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        required
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        autoComplete="tel-national"
                        placeholder="9876543210"
                        className="w-full bg-transparent px-3 py-3 text-base font-semibold tracking-wide text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">We’ll send a one-time verification code to this number.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Sending code…' : <>Send verification code <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="login-otp" className="text-sm font-semibold text-slate-700">
                        Verification code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-xs font-semibold text-orange-700 hover:underline"
                      >
                        Change number
                      </button>
                    </div>
                    <input
                      id="login-otp"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{4,6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      placeholder="123456"
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-center text-xl font-bold tracking-[0.4em] text-slate-900 outline-none transition placeholder:font-normal placeholder:tracking-[0.4em] focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Code sent to +91 {phone}</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Verifying…' : <>Verify and sign in <ArrowRight className="h-4 w-4" /></>}
                  </button>

                  <div className="flex items-center justify-between gap-3 pt-1 text-xs text-slate-500">
                    <span>Didn't receive SMS?</span>
                    {countdown > 0 ? (
                      <span className="font-medium text-slate-400">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="font-semibold text-orange-700 hover:underline disabled:opacity-50"
                      >
                        Resend code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {authMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
                <input
                  id="login-email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  type="email"
                  autoComplete="username"
                  placeholder="store@gmail.com"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  id="login-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  type="password"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in…' : <>Sign in securely <ArrowRight className="h-4 w-4" /></>}
              </button>

              <div className="text-right">
                <Link to="/forgot-password" className="text-sm font-semibold text-orange-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-center text-sm font-semibold text-slate-700">
              New to Apani Dukan?
            </p>
            <Link
              to="/start"
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100 focus:outline-none focus:ring-4 focus:ring-orange-100"
            >
              <Store className="h-4 w-4" aria-hidden="true" /> Create your store <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Your account sign-in is protected
          </p>
        </section>
      </div>
    </main>
  )
}
