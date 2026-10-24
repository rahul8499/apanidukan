import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { captureAccurateLocation } from '../utils/accurateLocation'
import { Eye, EyeOff } from 'lucide-react'

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

  const [regMode, setRegMode] = useState<'otp' | 'email'>(() => searchParams.get('method') === 'email' ? 'email' : 'otp')

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
  const [step, setStep] = useState(1)
  const [allowHomeDelivery, setAllowHomeDelivery] = useState(true)
  const [allowStorePickup, setAllowStorePickup] = useState(true)
  const [minDeliveryOrder, setMinDeliveryOrder] = useState('0')
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('10')
  const [serviceablePincodes, setServiceablePincodes] = useState('')
  const [deliveryChargeType, setDeliveryChargeType] = useState('FIXED')
  const [deliveryFlatFee, setDeliveryFlatFee] = useState('0')
  const [deliveryPerKmFee, setDeliveryPerKmFee] = useState('0')
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState('0')
  const [deliveryEstimatedTime, setDeliveryEstimatedTime] = useState('30-45 mins')
  const [pickupInstructions, setPickupInstructions] = useState('')
  const [exchangeEnabled, setExchangeEnabled] = useState(false)
  const [exchangeWindowDays, setExchangeWindowDays] = useState('7')
  const [exchangeEvidenceRequired, setExchangeEvidenceRequired] = useState(true)
  const [exchangeReasons, setExchangeReasons] = useState('Size does not fit\nWrong item received\nDamaged or defective item\nColour differs from listing')
  const [exchangePolicy, setExchangePolicy] = useState('Item must be unused, unwashed and have original tags attached.')

  // Email mode fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP mode fields
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [otp, setOtp] = useState(searchParams.get('otp') || '')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  async function captureStoreLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('Device par location support nahi hai. Kripya shop address manually type karein.')
      return
    }
    setLocationLoading(true)
    setGpsAccuracy(null)
    setGpsStatus('📍 Shop location detect kar rahe hain...')

    try {
      const { coords } = await captureAccurateLocation(accuracy => {
        setGpsAccuracy(accuracy)
        if (accuracy <= 200) {
          setGpsStatus(`Location detect ho rahi hai... (±${Math.round(accuracy)} m)`)
        }
      })

      const roundedLatitude = Number(coords.latitude.toFixed(6))
      const roundedLongitude = Number(coords.longitude.toFixed(6))
      setLatitude(roundedLatitude)
      setLongitude(roundedLongitude)
      setGpsAccuracy(coords.accuracy)
      setGpsStatus('✅ Location capture ho gayi. Address auto-fill ho raha hai...')

      // Multi-layer reverse geocoding
      let detectedAddress = ''
      try {
        const res = await api.get('/public/reverse-geocode/', { params: { lat: roundedLatitude, lng: roundedLongitude } })
        if (res.data?.display_name) {
          detectedAddress = res.data.display_name
        }
      } catch { }

      if (!detectedAddress) {
        try {
          const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLatitude}&lon=${roundedLongitude}`, {
            headers: { 'Accept-Language': 'en' },
          })
          if (osmRes.ok) {
            const osmData = await osmRes.json()
            if (osmData.display_name) {
              detectedAddress = osmData.display_name
            }
          }
        } catch { }
      }

      if (!detectedAddress) {
        detectedAddress = `Shop Location (${roundedLatitude}, ${roundedLongitude})`
      }

      setAddress(detectedAddress)
      setGpsStatus(`✅ Shop location & address capture ho gaya (±${Math.round(coords.accuracy)} m)`)
    } catch (locationError: any) {
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
        setGpsStatus('Location signal weak hai. Kripya apna shop address manually type karein.')
      }
    } finally {
      setLocationLoading(false)
    }
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
      const retryAfter = Number(err?.response?.data?.retry_after || 0)
      if (retryAfter > 0 && retryAfter <= 60) setCountdown(retryAfter)
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP
  async function handleVerifyOTP(candidateOtp?: string) {
    if (isVerifyingOtp) return
    setError('')
    setSuccessMsg('')

    const codeToVerify = (candidateOtp !== undefined ? candidateOtp : otp).trim()
    const cleanPhone = phone.replace(/\D/g, '')
    if (!codeToVerify || codeToVerify.length < 4) {
      setError('Please enter the OTP code sent to your mobile number.')
      return
    }

    setLoading(true)
    setIsVerifyingOtp(true)
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
      setIsVerifyingOtp(false)
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
        allow_home_delivery: allowHomeDelivery,
        allow_store_pickup: allowStorePickup,
        min_delivery_order: Number(minDeliveryOrder) || 0,
        delivery_radius_km: Number(deliveryRadiusKm) || 10,
        serviceable_pincodes: serviceablePincodes.split(/[\s,]+/).map(pin => pin.trim()).filter(pin => /^\d{6}$/.test(pin)),
        delivery_charge_type: deliveryChargeType,
        delivery_flat_fee: Number(deliveryFlatFee) || 0,
        delivery_per_km_fee: Number(deliveryPerKmFee) || 0,
        free_delivery_above: Number(freeDeliveryAbove) || 0,
        delivery_estimated_time: deliveryEstimatedTime.trim() || '30-45 mins',
        pickup_instructions: pickupInstructions.trim(),
        exchange_enabled: exchangeEnabled,
        exchange_window_days: Number(exchangeWindowDays) || 7,
        exchange_evidence_required: exchangeEvidenceRequired,
        exchange_allowed_reasons: exchangeReasons.split('\n').map(reason => reason.trim()).filter(Boolean),
        exchange_policy: exchangePolicy.trim(),
      })
      navigate(`/stores/${store.id}/catalog?add=1`, { replace: true })
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
    if (cleanPhone && cleanPhone.length !== 10) {
      setError('Mobile number dena ho to valid 10-digit number enter karein, ya blank chhodein.')
      return
    }
    if (cleanPhone && !otpVerified) {
      setError('Please verify your mobile number with OTP first.')
      return
    }

    const nameParts = fullName.trim().split(/\s+/)
    const parsedFirstName = nameParts[0] || ''
    const parsedLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || ''

    setLoading(true)
    try {
      if (!auth.user) {
        await auth.register({
          email,
          password,
          first_name: parsedFirstName,
          last_name: parsedLastName,
          ...(cleanPhone ? { phone_number: cleanPhone } : {}),
        })
      }
      const store = await api.post('/stores/', {
        name,
        description,
        business_type: businessType,
        address,
        latitude,
        longitude,
        phone_number: cleanPhone || auth.user?.phone_number || '',
        allow_home_delivery: allowHomeDelivery,
        allow_store_pickup: allowStorePickup,
        min_delivery_order: Number(minDeliveryOrder) || 0,
        delivery_radius_km: Number(deliveryRadiusKm) || 10,
        serviceable_pincodes: serviceablePincodes.split(/[\s,]+/).map(pin => pin.trim()).filter(pin => /^\d{6}$/.test(pin)),
        delivery_charge_type: deliveryChargeType,
        delivery_flat_fee: Number(deliveryFlatFee) || 0,
        delivery_per_km_fee: Number(deliveryPerKmFee) || 0,
        free_delivery_above: Number(freeDeliveryAbove) || 0,
        delivery_estimated_time: deliveryEstimatedTime.trim() || '30-45 mins',
        pickup_instructions: pickupInstructions.trim(),
        exchange_enabled: exchangeEnabled,
        exchange_window_days: Number(exchangeWindowDays) || 7,
        exchange_evidence_required: exchangeEvidenceRequired,
        exchange_allowed_reasons: exchangeReasons.split('\n').map(reason => reason.trim()).filter(Boolean),
        exchange_policy: exchangePolicy.trim(),
      })
      navigate(`/stores/${store.data.id}/catalog?add=1`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    setError('')
    if (step === 1) {
      if (regMode === 'otp' && !otpVerified) return setError('Please verify your mobile number with OTP first.')
      if (regMode === 'email') {
        if (!auth.user && (!email.trim() || password.length < 8)) return setError('Enter a valid email and password (minimum 8 characters).')
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone && (cleanPhone.length !== 10 || !otpVerified)) return setError('Mobile number dena ho to 10 digits enter karke OTP verify karein, ya field blank chhodein.')
      }
      if (!name.trim()) return setError('Store name is required.')
    }
    if (step === 2 && (!address.trim() || !fullName.trim())) return setError('Store address and owner full name are required.')
    if (step === 3) {
      if (!allowHomeDelivery && !allowStorePickup) return setError('Enable home delivery or walk-in / store pickup to continue.')
      if (allowHomeDelivery && Number(deliveryRadiusKm) <= 0) return setError('Delivery radius must be greater than 0 km.')
    }
    if (step === 4 && exchangeEnabled) {
      if (Number(exchangeWindowDays) < 1 || Number(exchangeWindowDays) > 30) return setError('Exchange window must be between 1 and 30 days.')
      if (!exchangeReasons.split('\n').map(reason => reason.trim()).filter(Boolean).length) return setError('Add at least one exchange reason.')
    }
    setStep(current => Math.min(5, current + 1))
  }

  const fieldClass = 'premium-input mt-1 w-full'
  const toggleRow = (label: string, description: string, checked: boolean, onChange: (value: boolean) => void) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <span><span className="block text-sm font-bold text-slate-900">{label} <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${checked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{checked ? 'ON' : 'OFF'}</span></span><span className="mt-1 block text-xs text-slate-500">{description}</span></span>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-orange-600" />
    </label>
  )

  return (
    <main className="min-h-screen w-full bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50/80 via-white to-slate-50 flex flex-col items-center px-4 py-7 font-sans sm:py-10">
      <div className="w-full max-w-xl">
        <div className="mb-5 text-center sm:mb-6">
          <div className="mb-3 flex justify-center"><img src="/apanidukan-brand-logo.png" alt="Apani Dukan" className="h-auto w-[220px] max-w-full object-contain sm:w-[250px]" /></div>
          <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">Seller account setup</span>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-3xl">Apna online store, <span className="text-orange-600">minutes mein.</span></h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Store details, delivery rules aur exchange policy set karein. Baad mein dashboard se edit kar sakte hain.</p>
          <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Choose account setup method">
            <button type="button" onClick={() => { setRegMode('otp'); setError(''); setSuccessMsg('') }} role="tab" aria-selected={regMode === 'otp'} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${regMode === 'otp' ? 'bg-white text-orange-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600'}`}>Mobile OTP</button>
            <button type="button" onClick={() => { setRegMode('email'); setError(''); setSuccessMsg('') }} role="tab" aria-selected={regMode === 'email'} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${regMode === 'email' ? 'bg-white text-orange-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600'}`}>Email account</button>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">⚠️ {error}</div>}
        {successMsg && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">✅ {successMsg}</div>}

        <form onSubmit={step === 5 ? (regMode === 'otp' ? handleOTPSubmit : handleEmailSubmit) : event => { event.preventDefault(); nextStep() }} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.3)] sm:p-7">
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-500"><span>Store registration</span><span>Step {step} of 5</span></div>
            <div className="grid grid-cols-5 gap-1.5">{[1,2,3,4,5].map(item => <div key={item} className={`h-1.5 rounded-full ${item <= step ? 'bg-orange-600' : 'bg-slate-200'}`} />)}</div>
          </div>

          {step === 1 && <section className="space-y-4">
            <div><span className="text-xs font-bold uppercase tracking-wider text-orange-700">Step 01</span><h2 className="mt-1 text-lg font-bold text-slate-900">Account and store basics</h2></div>
            {regMode === 'otp' ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-xs font-semibold text-slate-700">Mobile number (OTP verification) *</label>
              <div className="mt-2 flex gap-2"><div className="relative flex-1"><span className="absolute left-3.5 top-3 text-sm font-semibold text-slate-500">+91</span><input value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setOtpVerified(false) }} disabled={otpVerified} required type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" className="premium-input w-full pl-14" /></div>{!otpVerified && <button type="button" onClick={handleSendOTP} disabled={loading || countdown > 0} className="rounded-xl bg-orange-600 px-4 text-xs font-bold text-white disabled:opacity-60">{countdown > 0 ? `Resend (${countdown}s)` : otpSent ? 'Resend OTP' : 'Send OTP →'}</button>}</div>
            {otpSent && !otpVerified && <div className="mt-3 flex gap-2"><input value={otp} onChange={event => { const code = event.target.value.replace(/\D/g, '').slice(0, 6); setOtp(code); if (code.length === 6) handleVerifyOTP(code) }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter 6-digit OTP" className="premium-input min-w-0 flex-1 text-center tracking-widest" /><button type="button" onClick={() => handleVerifyOTP()} disabled={isVerifyingOtp} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-70">{isVerifyingOtp && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}{isVerifyingOtp ? 'Verifying…' : 'Verify OTP'}</button></div>}
              {otpVerified && <p className="mt-2 text-xs font-bold text-emerald-700">✓ Mobile verified</p>}
            </div> : <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Email address *<input type="email" value={email} onChange={event => setEmail(event.target.value)} required={!auth.user} className={fieldClass} /></label>{!auth.user && <label className="text-xs font-semibold text-slate-700">Password *<div className="relative mt-1"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} className={`${fieldClass} mt-0 pr-12`} /><button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-1 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>}<label className="text-xs font-semibold text-slate-700 sm:col-span-2">Mobile number (optional)<div className="mt-1 flex gap-2"><input value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setOtpVerified(false) }} disabled={otpVerified} maxLength={10} placeholder="9876543210" className="premium-input min-w-0 flex-1" />{!otpVerified && <button type="button" onClick={handleSendOTP} disabled={loading || countdown > 0 || phone.replace(/\D/g, '').length !== 10} className="rounded-xl bg-orange-600 px-3 text-xs font-bold text-white disabled:opacity-50">{countdown > 0 ? `Resend (${countdown}s)` : otpSent ? 'Resend OTP' : 'Send OTP'}</button>}</div>{otpSent && !otpVerified && <div className="mt-2 flex gap-2"><input value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter OTP" maxLength={6} className="premium-input min-w-0 flex-1" /><button type="button" onClick={() => handleVerifyOTP()} disabled={isVerifyingOtp} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-70">{isVerifyingOtp && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}{isVerifyingOtp ? 'Verifying…' : 'Verify OTP'}</button></div>}{otpVerified && <span className="mt-1 block text-emerald-700">✓ Mobile verified</span>}</label></div>}
            <label className="block text-xs font-semibold text-slate-700">Store name *<input value={name} onChange={event => setName(event.target.value)} required placeholder="Store name" className={fieldClass} /></label>
            <div><span className="block text-xs font-semibold text-slate-700">Store category</span><div className="mt-1 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/60 p-3"><span className="text-sm font-bold text-slate-900">👗 {DEFAULT_CATEGORY}</span><span className="rounded-lg bg-orange-600 px-2 py-1 text-[10px] font-bold text-white">Selected</span></div></div>
          </section>}

          {step === 2 && <section className="space-y-4">
            <div><span className="text-xs font-bold uppercase tracking-wider text-orange-700">Step 02</span><h2 className="mt-1 text-lg font-bold text-slate-900">Store location and owner</h2></div>
            <label className="block text-xs font-semibold text-slate-700">Store address *<textarea value={address} onChange={event => setAddress(event.target.value)} required placeholder="Shop, street, area, city, PIN code" className="premium-input mt-1 min-h-24 w-full" /></label>
            <button type="button" onClick={captureStoreLocation} disabled={locationLoading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-80">{locationLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}{locationLoading ? 'Finding your location…' : latitude ? 'Location captured ✓' : '📍 Use current location'}</button>{gpsStatus && <p role="status" className={`rounded-lg px-3 py-2 text-xs ${locationLoading ? 'bg-orange-50 text-orange-800' : 'bg-slate-50 text-slate-600'}`}>{locationLoading && <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-orange-600 border-t-transparent align-[-2px]" />}{locationLoading ? 'Please wait while we find your location and address…' : gpsStatus}</p>}
            <label className="block text-xs font-semibold text-slate-700">Store phone (OTP verified)<input value={phone} readOnly className="premium-input mt-1 w-full bg-emerald-50" /></label>
            <label className="block text-xs font-semibold text-slate-700">Store owner full name *<input value={fullName} onChange={event => setFullName(event.target.value)} required placeholder="Full name" className={fieldClass} /></label>
            {regMode === 'otp' && <label className="block text-xs font-semibold text-slate-700">Email address (optional)<input type="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} /></label>}
          </section>}

          {step === 3 && <section className="space-y-4">
            <div><span className="text-xs font-bold uppercase tracking-wider text-orange-700">Step 03</span><h2 className="mt-1 text-lg font-bold text-slate-900">Checkout Fulfillment</h2><p className="mt-1 text-sm text-slate-500">Configure order options and delivery pricing shown to customers.</p></div>
            {toggleRow('🚚 Home Delivery', 'Deliver order to customer home', allowHomeDelivery, setAllowHomeDelivery)}
            {allowHomeDelivery && <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Delivery rates</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3"><label className="min-w-0 text-xs font-semibold text-slate-700">Minimum order (₹)<input type="number" min="0" value={minDeliveryOrder} onChange={event => setMinDeliveryOrder(event.target.value)} placeholder="e.g. 0" className={fieldClass} /></label><label className="min-w-0 text-xs font-semibold text-slate-700">Maximum distance (km)<input type="number" min="0.1" step="0.1" value={deliveryRadiusKm} onChange={event => setDeliveryRadiusKm(event.target.value)} placeholder="e.g. 10" className={fieldClass} /></label><label className="min-w-0 text-xs font-semibold text-slate-700">Delivery fee type<select value={deliveryChargeType} onChange={event => setDeliveryChargeType(event.target.value)} className={fieldClass}><option value="FREE">Free delivery</option><option value="FIXED">Flat fee</option><option value="PER_KM">Per km</option><option value="HYBRID">Base fee + per km</option></select></label>{['FIXED','HYBRID'].includes(deliveryChargeType) && <label className="min-w-0 text-xs font-semibold text-slate-700">Flat / base fee (₹)<input type="number" min="0" value={deliveryFlatFee} onChange={event => setDeliveryFlatFee(event.target.value)} placeholder="e.g. 30" className={fieldClass} /></label>}{['PER_KM','HYBRID'].includes(deliveryChargeType) && <label className="min-w-0 text-xs font-semibold text-slate-700">Per km fee (₹)<input type="number" min="0" value={deliveryPerKmFee} onChange={event => setDeliveryPerKmFee(event.target.value)} placeholder="e.g. 5" className={fieldClass} /></label>}<label className="min-w-0 text-xs font-semibold text-slate-700">Free delivery above (₹)<input type="number" min="0" value={freeDeliveryAbove} onChange={event => setFreeDeliveryAbove(event.target.value)} placeholder="e.g. 499" className={fieldClass} /></label><label className="min-w-0 text-xs font-semibold text-slate-700">Estimated delivery time<input value={deliveryEstimatedTime} onChange={event => setDeliveryEstimatedTime(event.target.value)} placeholder="e.g. 30-45 mins" className={fieldClass} /></label><label className="col-span-2 min-w-0 text-xs font-semibold text-slate-700">Serviceable PIN codes (optional)<input value={serviceablePincodes} onChange={event => setServiceablePincodes(event.target.value)} placeholder="e.g. 411001, 411002" className={fieldClass} /></label></div>
            </div>}
            {toggleRow('🏪 Walk-in / Store Pickup', 'Customer collects at shop', allowStorePickup, setAllowStorePickup)}
            {allowStorePickup && <label className="block text-xs font-semibold text-slate-700">Pickup instructions (optional)<textarea value={pickupInstructions} onChange={event => setPickupInstructions(event.target.value)} placeholder="Collect at store counter • 10:00 AM to 09:00 PM" className="premium-input mt-1 min-h-16 w-full" /></label>}
          </section>}

          {step === 4 && <section className="space-y-4">
            <div><span className="text-xs font-bold uppercase tracking-wider text-orange-700">Step 04</span><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-orange-700">Garments After-Sales</p><h2 className="text-lg font-bold text-slate-900">🔄 Exchange Settings</h2><p className="text-sm text-slate-500">Set the exchange toggle, days, evidence, reasons and customer policy.</p></div>
            {toggleRow('Accept exchanges', 'Customers can request an exchange for eligible orders', exchangeEnabled, setExchangeEnabled)}
            {exchangeEnabled && <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><label className="block text-xs font-semibold text-slate-700">Exchange window (days, 1–30)<input type="number" min="1" max="30" value={exchangeWindowDays} onChange={event => setExchangeWindowDays(event.target.value)} className={fieldClass} /></label><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={exchangeEvidenceRequired} onChange={event => setExchangeEvidenceRequired(event.target.checked)} className="accent-orange-600" />Require item photo evidence</label><label className="block text-xs font-semibold text-slate-700">Allowed exchange reasons (one per line)<textarea value={exchangeReasons} onChange={event => setExchangeReasons(event.target.value)} className="premium-input mt-1 min-h-24 w-full" /></label><label className="block text-xs font-semibold text-slate-700">Customer exchange policy<textarea value={exchangePolicy} onChange={event => setExchangePolicy(event.target.value)} className="premium-input mt-1 min-h-20 w-full" /></label></div>}
          </section>}

          {step === 5 && <section className="space-y-3">
            <div><span className="text-xs font-bold uppercase tracking-wider text-orange-700">Step 05</span><h2 className="mt-1 text-lg font-bold text-slate-900">Review and create store</h2></div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p><b>Owner:</b> {fullName}</p><p><b>Store:</b> {name}</p><p><b>Category:</b> {DEFAULT_CATEGORY}</p><p><b>Verified phone:</b> +91 {phone}</p><p><b>Address:</b> {address}</p><p><b>Home delivery:</b> {allowHomeDelivery ? `ON · min ₹${minDeliveryOrder} · max ${deliveryRadiusKm} km · ${deliveryChargeType === 'FREE' ? 'Free' : deliveryChargeType === 'PER_KM' ? `₹${deliveryPerKmFee}/km` : deliveryChargeType === 'HYBRID' ? `₹${deliveryFlatFee} + ₹${deliveryPerKmFee}/km` : `₹${deliveryFlatFee} flat`} · ${deliveryEstimatedTime}` : 'OFF'}</p><p><b>Walk-in / pickup:</b> {allowStorePickup ? `ON${pickupInstructions ? ` · ${pickupInstructions}` : ''}` : 'OFF'}</p><p><b>Exchange:</b> {exchangeEnabled ? `ON · ${exchangeWindowDays} days · ${exchangeEvidenceRequired ? 'photo evidence required' : 'no evidence required'}` : 'OFF'}</p></div>
            <p className="text-xs text-slate-500">You can change these settings later from your store dashboard. After creating the store, you’ll add your first product.</p>
          </section>}

          <div className="flex gap-3 border-t border-slate-100 pt-4">
            {step > 1 && <button type="button" onClick={() => { setError(''); setStep(current => current - 1) }} className="min-h-12 flex-1 rounded-xl border border-orange-500 px-4 py-3 text-sm font-bold text-orange-700">Back</button>}
            {step < 5 ? <button type="button" onClick={nextStep} className="min-h-12 flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700">Next →</button> : <button type="submit" disabled={loading} className="min-h-12 flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60">{loading ? 'Creating store…' : 'Review complete · Create store →'}</button>}
          </div>
          <p className="text-center text-sm text-slate-500">Already account hai? <Link className="font-semibold text-orange-700 hover:underline" to="/login">Login karein</Link></p>
        </form>
      </div>
    </main>
  )
}
