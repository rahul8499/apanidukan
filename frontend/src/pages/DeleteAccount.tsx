import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth, sendMsg91WidgetOtp, verifyMsg91WidgetOtp } from '../context/AuthContext'

type DeleteState = 'form' | 'processing' | 'success' | 'error' | 'open-orders'

const DeleteAccount: React.FC = () => {
  const [identifier, setIdentifier] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [state, setState] = useState<DeleteState>('form')
  const [errorMsg, setErrorMsg] = useState('')
  const [openOrders, setOpenOrders] = useState<{ orders: number; whatsapp_orders: number }>({ orders: 0, whatsapp_orders: 0 })
  const auth = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.user) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      if (cleanPhone.length !== 10) {
        setErrorMsg('Please enter your registered 10-digit mobile number.')
        setState('error')
        return
      }
      setState('processing')
      setErrorMsg('')
      try {
        await sendMsg91WidgetOtp(cleanPhone)
        setPhone(cleanPhone)
        setOtpSent(true)
        setState('form')
      } catch (err: any) {
        setErrorMsg(err?.message || 'Could not send OTP. Please try again.')
        setState('error')
      }
      return
    }

    if (identifier.trim().toUpperCase() !== 'DELETE') {
      setErrorMsg('Please type DELETE to confirm account deactivation.')
      setState('error')
      return
    }
    setState('processing')
    setErrorMsg('')
    try {
      await api.post('/auth/account/deactivate/', { confirmation: 'DELETE' })
      auth.logout()
      setState('success')
    } catch (err: any) {
      if (err.response?.status === 409) {
        setOpenOrders({
          orders: err.response.data.orders || 0,
          whatsapp_orders: err.response.data.whatsapp_orders || 0,
        })
        setState('open-orders')
      } else if (err.response?.status === 400) {
        setErrorMsg(err.response.data.detail || 'Please provide your registered email or phone number.')
        setState('error')
      } else {
        setErrorMsg(err.response?.data?.detail || 'An unexpected error occurred. Please try again.')
        setState('error')
      }
    }
  }

  const handleVerifiedDeletion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.trim().length < 4) {
      setErrorMsg('Please enter the OTP sent to your mobile number.')
      setState('error')
      return
    }
    setState('processing')
    setErrorMsg('')
    try {
      const accessToken = await verifyMsg91WidgetOtp(otp.trim())
      await api.post('/auth/account/delete-request/', {
        phone_number: phone,
        access_token: accessToken,
        confirmation: 'DELETE',
      })
      setState('success')
    } catch (err: any) {
      if (err.response?.status === 409) {
        setOpenOrders({
          orders: err.response.data.orders || 0,
          whatsapp_orders: err.response.data.whatsapp_orders || 0,
        })
        setState('open-orders')
      } else {
        setErrorMsg(err.response?.data?.detail || err?.message || 'Verification failed. Please request a new OTP.')
        setState('error')
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/" aria-label="Apani Dukan home">
            <img src="/apanidukan-logo-horizontal.png" alt="Apani Dukan" className="h-8 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {state === 'form' && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  🗑️
                </div>
                <h1 className="mt-4 text-2xl font-black text-slate-900">Delete Your Account</h1>
                <p className="mt-2 text-sm text-slate-600">
                  {auth.user
                    ? 'Type DELETE below to confirm account deactivation.'
                    : 'Verify your registered mobile number to securely request account deletion.'}
                </p>
              </div>

              <form onSubmit={otpSent && !auth.user ? handleVerifiedDeletion : handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
                    {auth.user ? 'Confirmation' : otpSent ? 'Verification OTP' : 'Registered mobile number'}
                  </label>
                  <input
                    type={auth.user ? 'text' : 'tel'}
                    id="identifier"
                    inputMode={auth.user ? undefined : 'numeric'}
                    value={auth.user ? identifier : otpSent ? otp : phone}
                    onChange={(e) => auth.user ? setIdentifier(e.target.value) : otpSent ? setOtp(e.target.value) : setPhone(e.target.value)}
                    placeholder={auth.user ? 'Type DELETE' : otpSent ? 'Enter OTP' : '10-digit mobile number'}
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={false}
                  className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {auth.user ? 'Deactivate My Account' : otpSent ? 'Verify OTP & Deactivate Account' : 'Send Verification OTP'}
                </button>
                {!auth.user && (
                  <p className="text-center text-xs text-slate-500">
                    Prefer email/password? <Link to="/login" state={{ from: '/delete-account' }} className="font-bold text-indigo-600 hover:underline">Log in securely</Link>.
                  </p>
                )}
              </form>

              <div className="mt-8 border-t border-slate-200 pt-8">
                <h2 className="text-lg font-bold text-slate-800">What Happens When You Deactivate Your Seller Account</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Upon submitting this request, the following actions will be performed:
                </p>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-slate-600">
                  <li>Your seller account will be deactivated. This disables seller access; it does not immediately erase every record.</li>
                  <li>All your stores will be unpublished and set to archived status.</li>
                  <li>You will no longer be able to log in to your seller account or manage any stores.</li>
                  <li>Open or paid customer orders must be resolved before deactivation can proceed.</li>
                  <li>A confirmation email will be sent to your registered email address if one exists.</li>
                </ul>

                <h2 className="mt-6 text-lg font-bold text-slate-800">Information and records after deactivation</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Deactivation unpublishes and archives your stores. Account, store, catalog, order, and transaction records may remain in our systems; the current deactivation flow does not automatically erase them. You may separately request deletion or correction by contacting privacy@apanidukan.com. We will review the request and explain any records that must be kept for orders, disputes, security, or legal obligations.
                </p>
              </div>
            </>
          )}

          {state === 'processing' && (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-sm text-slate-600">Processing your deletion request...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                ✅
              </div>
              <h1 className="mt-4 text-2xl font-black text-slate-900">Seller Account Deactivated</h1>
              <p className="mt-3 text-sm text-slate-600">
                Your account has been deactivated. All stores have been unpublished and you will
                no longer be able to access your seller account. If you had a registered email,
                a confirmation has been sent to that address.
              </p>
              <p className="mt-3 text-sm text-slate-600">Deactivation unpublishes your stores and prevents seller login. It does not automatically erase all data. To request deletion or correction of personal information, contact privacy@apanidukan.com. Some records may need to be retained for open orders, disputes, security, or legal obligations.</p>
              <Link
                to="/"
                className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
              >
                Back to Home
              </Link>
            </div>
          )}

          {state === 'open-orders' && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                ⚠️
              </div>
              <h1 className="mt-4 text-xl font-black text-slate-900">Cannot Delete Account — Open Orders</h1>
              <p className="mt-3 text-sm text-slate-600">
                Your account cannot be deleted while you have open customer orders. Please resolve
                all pending or paid orders first.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Pending orders: <strong>{openOrders.orders}</strong> | Open WhatsApp orders: <strong>{openOrders.whatsapp_orders}</strong>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Please deliver, cancel, or refund all active orders before requesting account deletion.
              </p>
              <button
                onClick={() => setState('form')}
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
              >
                Back
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                ❌
              </div>
              <h1 className="mt-4 text-xl font-black text-slate-900">Unable to Process Request</h1>
              <p className="mt-3 text-sm text-slate-600">{errorMsg}</p>
              <button
                onClick={() => setState('form')}
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="mx-auto max-w-2xl text-center text-sm text-slate-500">
          <p>&copy; 2026 Apani Dukan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default DeleteAccount
