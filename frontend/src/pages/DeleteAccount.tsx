import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const getApiBase = () => {
  const envBase = (import.meta as any).env?.VITE_API_BASE
  if (envBase) return envBase
  return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
}

type DeleteState = 'form' | 'processing' | 'success' | 'error' | 'open-orders'

const DeleteAccount: React.FC = () => {
  const [identifier, setIdentifier] = useState('')
  const [state, setState] = useState<DeleteState>('form')
  const [errorMsg, setErrorMsg] = useState('')
  const [openOrders, setOpenOrders] = useState<{ orders: number; whatsapp_orders: number }>({ orders: 0, whatsapp_orders: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setErrorMsg('Please enter your registered email or phone number.')
      setState('error')
      return
    }
    setState('processing')
    setErrorMsg('')
    try {
      await axios.post(`${getApiBase()}/auth/account/delete-request/`, { identifier })
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-sm text-white">Q</span>
            QuickStore
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
                  Enter your registered email or phone number below to request permanent account deactivation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
                    Email or Phone Number
                  </label>
                  <input
                    type="text"
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your registered email or phone number"
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={false}
                  className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Delete My Account
                </button>
              </form>

              <div className="mt-8 border-t border-slate-200 pt-8">
                <h2 className="text-lg font-bold text-slate-800">What Happens When You Delete Your Account</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Upon submitting this request, the following actions will be performed:
                </p>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-slate-600">
                  <li>Your seller account will be deactivated and marked as deleted in our system.</li>
                  <li>All your stores will be unpublished and set to archived status.</li>
                  <li>You will no longer be able to log in to your seller account or manage any stores.</li>
                  <li>All active customer orders must be resolved before account deletion can proceed.</li>
                  <li>A confirmation email will be sent to your registered email address if one exists.</li>
                </ul>

                <h2 className="mt-6 text-lg font-bold text-slate-800">Data Deleted Upon Account Deletion</h2>
                <p className="mt-2 text-sm text-slate-600">
                  The following personal data associated with your account will be removed:
                </p>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-slate-600">
                  <li>Your login credentials (email, phone number, password hash, name)</li>
                  <li>Store information you provided (name, description, address, location coordinates, phone number, logo, theme)</li>
                  <li>Product catalog data (product names, descriptions, images, prices, stock, digital files)</li>
                  <li>Customer loyalty wallet data you can access through your dashboard</li>
                  <li>Store delivery and payment configuration (UPI ID, Razorpay keys)</li>
                  <li>Published storefront settings (custom domain, banner, favicon)</li>
                </ul>

                <h2 className="mt-6 text-lg font-bold text-slate-800">Data Retained for Legal &amp; Security Reasons</h2>
                <p className="mt-2 text-sm text-slate-600">
                  To comply with legal obligations and protect our platform, the following data is retained:
                </p>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-slate-600">
                  <li><strong>Transaction records and order history</strong> — retained for <strong>24 months</strong> for tax, accounting, and audit purposes.</li>
                  <li><strong>Audit logs (IP address, timestamps, device info)</strong> — retained for <strong>12 months</strong> for fraud prevention and security investigations.</li>
                  <li><strong>Communications between you and customers</strong> — retained for <strong>12 months</strong> for dispute resolution.</li>
                  <li><strong>Soft-deleted account record</strong> — retained for <strong>90 days</strong> after deletion request, after which the account may be permanently purged from our systems.</li>
                </ul>
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
              <h1 className="mt-4 text-2xl font-black text-slate-900">Account Deletion Requested</h1>
              <p className="mt-3 text-sm text-slate-600">
                Your account has been deactivated. All stores have been unpublished and you will
                no longer be able to access your seller account. If you had a registered email,
                a confirmation has been sent to that address.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Note: Some transaction records and audit logs are retained for legal compliance
                for up to 24 months. After 90 days, your soft-deleted account record may be
                permanently purged.
              </p>
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
