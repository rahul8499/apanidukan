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
    <div className="relative min-h-screen w-full bg-slate-50 flex flex-col justify-start items-center px-4 pt-0 sm:pt-2 pb-0 font-sans overflow-hidden">
      {/* Premium Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">

        {/* Logo outside card for premium feel */}
        <div className="flex justify-center mb-0 mt-4 sm:mt-0">
          <img
            src="/apanidukan1.png"
            alt="Apani Dukan"
            className="h-28 sm:h-32 md:h-40 lg:h-48 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="p-4 sm:p-5 shadow-2xl shadow-slate-500/10 border border-white/80 rounded-3xl bg-white/60 backdrop-blur-2xl">

          {/* Header */}
          <div className="text-center mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-black tracking-widest text-slate-600 uppercase mb-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Seller Dashboard
            </span>
            <h1 className="text-lg sm:text-xl leading-tight font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 pb-0.5">
              Manage Your Store
            </h1>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-500 font-bold max-w-xs mx-auto leading-tight hidden sm:block">
              View live orders, update products, and interact with customers.
            </p>
          </div>

          {/* Tab Switcher: Mobile OTP vs Email */}
          <div className="mt-2 flex rounded-lg bg-slate-100/80 p-0.5 shadow-inner border border-slate-200/50">
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-black rounded transition-all duration-300 ${authMethod === 'otp'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50 scale-[1.02]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
            >
              <span>📱</span> OTP Login
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('email'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-black rounded transition-all duration-300 ${authMethod === 'email'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50 scale-[1.02]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
            >
              <span>✉️</span> Email Login
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
            <div className="mt-3">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Mobile Number
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-semibold text-slate-500">
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
                        className="w-full pl-12 pr-3 py-2 bg-white/80 border border-slate-200 shadow-sm rounded-lg text-sm font-bold tracking-wide text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-1.5 py-2 rounded-lg font-black text-sm bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5 mt-1"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP ➔'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Enter 6-Digit OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[10px] text-indigo-600 hover:underline font-bold"
                      >
                        Change (+91 {phone})
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
                      placeholder="123456"
                      className="w-full text-center text-lg font-bold tracking-widest py-2 bg-white/80 border-2 border-indigo-200 shadow-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-1.5 py-2 rounded-lg font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-0.5 mt-1"
                  >
                    {loading ? 'Verifying...' : 'Verify & Login ➔'}
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
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
            <form onSubmit={handleEmailSubmit} className="mt-3 space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Email Address</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="store@gmail.com"
                  className="w-full px-3 py-2 bg-white/80 border border-slate-200 shadow-sm rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Password</label>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  type="password"
                  className="w-full px-3 py-2 bg-white/80 border border-slate-200 shadow-sm rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-1.5 py-2 rounded-lg font-black text-sm bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5 mt-2"
              >
                {loading ? 'Logging in...' : 'Secure Login ➔'}
              </button>

              <div className="mt-1.5 text-right">
                <Link to="/forgot-password" className="text-[10px] font-bold text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {/* Footer Link */}
          <div className="mt-3 text-center text-[11px] font-bold text-slate-500 border-t border-slate-200/60 pt-3 flex justify-center items-center gap-1">
            <span>Don't have an account?</span>
            <Link to="/start" className="text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-0.5 group bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded border border-slate-200 hover:border-indigo-200">
              Create your store <span className="group-hover:translate-x-0.5 transition-transform">➔</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
