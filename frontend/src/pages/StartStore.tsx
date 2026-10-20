import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import { captureAccurateLocation } from '../utils/accurateLocation'
import i18n from '../i18n'

const DEFAULT_CATEGORY = 'Clothing, Garments & Fashion'

const errorMessage = (error: any) => {
  const data = error?.response?.data
  if (!data) return error?.message || 'Server se connection nahi hua. Backend running hai ya nahi check karein.'
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.phone_number) && data.phone_number[0]) return data.phone_number[0]
  if (Array.isArray(data.email) && data.email[0]) return data.email[0]
  if (typeof data.phone_number === 'string') return data.phone_number
  if (typeof data.email === 'string') return data.email
  return Object.values(data).flat().join(' ') || error?.message || 'Details check karke phir try karein.'
}

/** Public platform onboarding: create seller store with MSG91 Mobile OTP or Email. */
export default function StartStore() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [regMode, setRegMode] = useState<'otp' | 'email'>('otp')

  // Common store fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState(DEFAULT_CATEGORY)
  const [businessType] = useState('GARMENTS')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('')
  const [fullName, setFullName] = useState('')

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

  function captureStoreLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('Device par GPS support nahi hai. Kripya shop address manually type karein.')
      return
    }
    setLocationLoading(true)
    setGpsAccuracy(null)
    setGpsStatus('📍 Shop location detect kar rahe hain...')

    captureAccurateLocation(
      accuracy => {
        setGpsAccuracy(accuracy)
        if (accuracy <= 100) {
          setGpsStatus(`Accurate location detect ho rahi hai... (±${Math.round(accuracy)} m)`)
        }
      },
      100,
      8000
    )
      .then(({ coords }) => {
        const roundedLatitude = Number(coords.latitude.toFixed(6))
        const roundedLongitude = Number(coords.longitude.toFixed(6))
        setLatitude(roundedLatitude)
        setLongitude(roundedLongitude)
        setGpsAccuracy(coords.accuracy)
        if (coords.accuracy <= 100) {
          setGpsStatus(`✅ Shop location capture ho gayi (±${Math.round(coords.accuracy)} m)`)
        } else {
          setGpsStatus(`✅ Shop location capture ho gayi. Kripya apna address verify karein.`)
        }
        if (!address) {
          api.get('/public/reverse-geocode/', { params: { lat: roundedLatitude, lng: roundedLongitude } })
            .then(res => {
              if (res.data?.display_name) {
                setAddress(res.data.display_name)
              } else {
                setAddress(`Shop Location (${roundedLatitude}, ${roundedLongitude})`)
              }
            })
            .catch(() => {
              setAddress(`Shop Location (${roundedLatitude}, ${roundedLongitude})`)
            })
        }
      })
      .catch((locationError: any) => {
        // Soft fallback: Never show scary ±362830 m numbers or trigger global error banner
        if (locationError?.position) {
          const coords = locationError.position.coords
          const roundedLatitude = Number(coords.latitude.toFixed(6))
          const roundedLongitude = Number(coords.longitude.toFixed(6))
          setLatitude(roundedLatitude)
          setLongitude(roundedLongitude)
          setGpsStatus('Approximate location mili hai. Kripya apna poora address manually type karein.')
        } else if (locationError?.locationErrorCode === 1) {
          setGpsStatus('Location permission denied hai. Kripya apna shop address manually type karein.')
        } else {
          setGpsStatus('GPS signal weak hai (Desktop/Wi-Fi). Kripya apna shop address manually type karein.')
        }
      })
      .finally(() => setLocationLoading(false))
  }

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Handle URL query pre-fills from login redirect & logged-in user state
  useEffect(() => {
    const queryPhone = searchParams.get('phone')
    const queryOtp = searchParams.get('otp')
    if (queryPhone) {
      setPhone(queryPhone)
      setRegMode('otp')
    } else if (auth.user && auth.user.phone_number) {
      setPhone(auth.user.phone_number)
    }

    if (auth.user) {
      const combined = [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ')
      if (combined && !fullName) setFullName(combined)
      if (auth.user.email && !email && !auth.user.email.includes('@store.local')) setEmail(auth.user.email)
    }

    if (queryOtp) {
      setOtp(queryOtp)
      setOtpVerified(true)
    }
  }, [searchParams, auth.user])

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
      const res = await auth.sendOTP(cleanPhone, auth.user ? undefined : 'register')
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
  async function handleVerifyOTP(candidateOtp?: string) {
    setError('')
    setSuccessMsg('')

    const codeToVerify = (candidateOtp !== undefined ? candidateOtp : otp).trim()
    const cleanPhone = phone.replace(/\D/g, '')
    if (!codeToVerify || codeToVerify.length < 4) {
      setError('Please enter the OTP code sent to your mobile number.')
      return
    }

    setLoading(true)
    try {
      const res = await auth.verifyOTP(cleanPhone, codeToVerify)
      setOtpVerified(true)

      if (res.user) {
        const combined = [res.user.first_name, res.user.last_name].filter(Boolean).join(' ')
        if (combined && !fullName) setFullName(combined)
        if (res.user.email && !email && !res.user.email.includes('@store.local')) setEmail(res.user.email)
      }

      if (res.has_store && res.store) {
        setSuccessMsg(`✅ Mobile verified! Found existing store "${res.store.name}". Enter new store details below to create another store, or click Dashboard to manage your store.`)
      } else {
        setSuccessMsg('✅ Mobile number verified! Please enter your store & account details below to launch your store.')
      }
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
    if (!address.trim()) {
      setError('Store address is required.')
      return
    }
    if (!fullName.trim()) {
      setError('Aapka poora naam (Full Name) required hai.')
      return
    }

    const nameParts = fullName.trim().split(/\s+/)
    const parsedFirstName = nameParts[0] || ''
    const parsedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || ''

    setLoading(true)
    try {
      const { store } = await auth.registerWithOTP({
        phone_number: cleanPhone,
        otp: otp,
        first_name: parsedFirstName,
        last_name: parsedLastName,
        store_name: name,
        category: description,
        business_type: businessType,
        address,
        latitude,
        longitude,
        email: email,
      })
      navigate(`/stores/${store.id}/manage`, { replace: true })
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
    if (!name.trim()) {
      setError('Store name is required.')
      return
    }
    if (!address.trim()) {
      setError('Store address is required.')
      return
    }
    if (!fullName.trim()) {
      setError('Aapka poora naam (Full Name) required hai.')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('10-digit mobile number enter karna mandatory hai.')
      return
    }
    if (!otpVerified) {
      setError('Please verify your mobile number with OTP first.')
      return
    }

    const nameParts = fullName.trim().split(/\s+/)
    const parsedFirstName = nameParts[0] || ''
    const parsedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || ''

    setLoading(true)
    try {
      await auth.register({
        email,
        password,
        first_name: parsedFirstName,
        last_name: parsedLastName,
        phone_number: cleanPhone
      })
      const store = await api.post('/stores/', {
        name,
        description,
        business_type: businessType,
        address,
        latitude,
        longitude,
        phone_number: cleanPhone
      })
      navigate(`/stores/${store.data.id}/manage`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/80 via-white to-teal-50/80 flex flex-col items-center pt-10 pb-20 px-4 font-sans">
      <div className="w-full max-w-2xl">
        {/* Header Banner */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-0 sm:mb-0 mt-0 sm:mt-0">
            <img
              src="/apanidukan1.png"
              alt="Apani Dukan"
              className="h-28 sm:h-32 md:h-40 lg:h-48 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-100/50 text-[10px] font-black tracking-widest text-indigo-600 uppercase mb-3 shadow-xs">
            Launch your digital storefront
          </span>
          <h1 className="text-3xl sm:text-[40px] leading-tight font-black tracking-tight text-slate-900">
            Apna online store, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">minutes mein.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[14px] sm:text-base font-bold text-slate-500 leading-relaxed">
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
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-bold">{error}</p>
                {(error.includes('already exists') || error.includes('do account nahi ban sakte')) && (
                  <p className="text-xs text-red-600 mt-1">
                    Is number ya email se pehle hi account bana hua hai. Kripya login karein.
                  </p>
                )}
              </div>
            </div>
            {(error.includes('already exists') || error.includes('do account nahi ban sakte')) && (
              <Link
                to="/login"
                className="shrink-0 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
              >
                Login Karein →
              </Link>
            )}
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
          <form onSubmit={handleOTPSubmit} className="space-y-8 p-8 sm:p-10 shadow-2xl shadow-indigo-500/10 border border-white/80 rounded-[2.5rem] bg-white/60 backdrop-blur-2xl">
            {/* Required Indicator Hint */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] text-slate-400">
              <span className="font-semibold text-indigo-600 uppercase tracking-wider">Fast Seller Onboarding</span>
              <span><span className="text-rose-500 font-bold">*</span> Zaroori (Required) fields</span>
            </div>

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
                  Mobile Number (for SMS & OTP Verification) <span className="text-rose-500 font-bold">*</span>
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
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm whitespace-nowrap shadow-sm disabled:opacity-60"
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
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setOtp(val)
                        if (val.length === 6 && !otpVerified) {
                          handleVerifyOTP(val)
                        }
                      }}
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
                      onClick={() => handleVerifyOTP()}
                      disabled={loading}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm whitespace-nowrap disabled:opacity-60"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP ✓'}
                    </button>
                  </div>
                )}
              </div>

              {/* Store Name & Description Inputs */}
              <div className="mt-4 grid gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Store name (e.g. Rahul Digital Shop)"
                    className="premium-input w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Aap kya sell karte hain?
                    </label>
                    <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      ✓ Auto-selected
                    </span>
                  </div>

                  {/* Single Default Auto-Selected Category */}
                  <div className="p-3.5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/70 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👗</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Clothing, Garments & Fashion</p>
                        <p className="text-xs text-slate-500">Kapde, Readymade, Garments & Fashion</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs">
                      ✓ Selected
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Store Address <span className="text-rose-500 font-bold">*</span>
                    </label>
                  </div>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    required
                    placeholder="Full shop address (e.g. Shop #4, Market Road, Near City Bank)"
                    className="premium-input min-h-20 w-full"
                  />
                  <button
                    type="button"
                    onClick={captureStoreLocation}
                    disabled={locationLoading}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition-colors"
                  >
                    <span>📍</span>
                    {locationLoading ? 'Locating...' : latitude ? 'Location captured ✓' : 'Use current shop location'}
                  </button>
                  {gpsStatus && (
                    <p
                      role="status"
                      className={`mt-2 text-xs font-medium p-2.5 rounded-xl border transition-all ${
                        locationLoading
                          ? 'text-amber-800 bg-amber-50 border-amber-200/80'
                          : latitude
                          ? 'text-emerald-800 bg-emerald-50 border-emerald-200/80 font-semibold'
                          : 'text-slate-600 bg-slate-100 border-slate-200'
                      }`}
                    >
                      {gpsStatus}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* STEP 02: Account Details */}
            <section className="border-t border-slate-100 pt-6">
              <span className="section-label text-xs font-bold text-indigo-600">Step 02</span>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">Aapka account</h2>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="Aapka poora naam (e.g. Rahul Kolhe)"
                  className="premium-input w-full"
                />
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <span className="text-slate-400 font-normal text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                    Optional
                  </span>
                </div>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="Optional email address (e.g. rahul@example.com)"
                  className="premium-input w-full"
                />
              </div>
            </section>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-base font-black bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Store ban raha hai...</span>
                </>
              ) : (
                <span>Create my store →</span>
              )}
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
          <form onSubmit={handleEmailSubmit} className="space-y-8 p-8 sm:p-10 shadow-2xl shadow-indigo-500/10 border border-white/80 rounded-[2.5rem] bg-white/60 backdrop-blur-2xl">
            {/* Required Indicator Hint */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] text-slate-400">
              <span className="font-semibold text-indigo-600 uppercase tracking-wider">Email Account Setup</span>
              <span><span className="text-rose-500 font-bold">*</span> Zaroori (Required) fields</span>
            </div>

            <section>
              <p className="section-label text-xs font-bold text-indigo-600">Step 01</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Aapki store information</h2>
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Store name (e.g. Rahul Digital Shop)"
                    className="premium-input w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Aap kya sell karte hain?
                    </label>
                    <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      ✓ Auto-selected
                    </span>
                  </div>

                  {/* Single Default Auto-Selected Category */}
                  <div className="p-3.5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/70 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👗</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Clothing, Garments & Fashion</p>
                        <p className="text-xs text-slate-500">Kapde, Readymade, Garments & Fashion</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs">
                      ✓ Selected
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <p className="section-label text-xs font-bold text-indigo-600">Step 02</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Aapka account</h2>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="Aapka poora naam (e.g. Rahul Kolhe)"
                  className="premium-input w-full"
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Address <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required
                  placeholder="Full shop address"
                  className="premium-input min-h-20 w-full"
                />
                <button
                  type="button"
                  onClick={captureStoreLocation}
                  disabled={locationLoading}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-white transition-colors"
                >
                  <span>📍</span>
                  {locationLoading ? 'Locating...' : latitude ? 'Location captured ✓' : 'Use current shop location'}
                </button>
                {gpsStatus && (
                  <p
                    role="status"
                    className={`mt-2 text-xs font-medium p-2.5 rounded-xl border transition-all ${
                      locationLoading
                        ? 'text-amber-800 bg-amber-50 border-amber-200/80'
                        : latitude
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200/80 font-semibold'
                        : 'text-slate-600 bg-slate-100 border-slate-200'
                    }`}
                  >
                    {gpsStatus}
                  </p>
                )}
              </div>

              {/* Mobile Number & OTP Verification Box */}
              <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mobile Number (SMS & OTP Verification) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {otpVerified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      ✓ Phone Verified
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-3 text-sm font-semibold text-slate-500">+91</span>
                    <input
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setOtpVerified(false); }}
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
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm whitespace-nowrap shadow-sm disabled:opacity-60"
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
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setOtp(val)
                        if (val.length === 6 && !otpVerified) {
                          handleVerifyOTP(val)
                        }
                      }}
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
                      onClick={() => handleVerifyOTP()}
                      disabled={loading}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm whitespace-nowrap disabled:opacity-60"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP ✓'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    type="email"
                    placeholder="Email address (e.g. rahul@example.com)"
                    className="premium-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    type="password"
                    placeholder="Password (minimum 8 characters)"
                    className="premium-input w-full"
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-base font-black bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Store ban raha hai...</span>
                </>
              ) : (
                <span>Create my store →</span>
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already account hai?{' '}
              <Link className="font-semibold text-indigo-600 hover:underline" to="/login">
                Login karein
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
