import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ShieldCheck, Zap, CheckCircle2, RefreshCw, AlertCircle, ArrowLeft, CreditCard, Sparkles, XCircle, Lock, Crown, Shield } from 'lucide-react'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PaymentHistoryItem {
  id: number
  payment_id: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export default function SellerSubscription() {
  const { storeId } = useParams<{ storeId: string }>()
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [showLockOverlay, setShowLockOverlay] = useState<boolean>(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active')
  const [planName, setPlanName] = useState<string>('PREMIUM')
  const [currentStart, setCurrentStart] = useState<string | null>(null)
  const [currentEnd, setCurrentEnd] = useState<string | null>(null)
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [razorpaySubId, setRazorpaySubId] = useState<string | null>(null)
  const [paidCount, setPaidCount] = useState<number>(0)
  const [keyId, setKeyId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadRazorpayScript()
    fetchStoreAndSubscription()
  }, [storeId])

  const loadRazorpayScript = () => {
    if (!window.Razorpay) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }
  }

  const fetchStoreAndSubscription = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const [storesRes, subRes] = await Promise.all([
        api.get('/stores/'),
        api.get(`/payments/subscriptions/status/?store_id=${storeId}`)
      ])

      const foundStore = Array.isArray(storesRes.data)
        ? storesRes.data.find((item: any) => String(item.id) === String(storeId))
        : storesRes.data
      setStore(foundStore || null)

      if (subRes.data.success) {
        setPlanName(subRes.data.plan_name || 'PREMIUM')
        setSubscriptionStatus(subRes.data.status || 'active')
        setCurrentStart(subRes.data.current_start)
        setCurrentEnd(subRes.data.current_end)
        setPayments(subRes.data.payments || [])
        setRazorpaySubId(subRes.data.razorpay_subscription_id || null)
        setPaidCount(subRes.data.paid_count || 0)
        setKeyId(subRes.data.key_id || '')
      }
    } catch (err: any) {
      console.error('Failed to fetch subscription status', err)
      setErrorMessage('Could not load subscription details. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (selectedPlan: 'BASIC' | 'PREMIUM') => {
    if (selectedPlan === 'BASIC') {
      if (planName === 'PREMIUM') {
        if (!window.confirm('Are you sure you want to switch to the Basic Plan?')) return
        handleCancelSubscription()
      }
      return
    }

    setSubscribing(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await api.post('/payments/subscriptions/create/', {
        store_id: storeId,
        plan_name: 'PREMIUM',
      })

      if (!res.data.success) {
        setErrorMessage(res.data.message || 'Failed to initiate Razorpay subscription.')
        setSubscribing(false)
        return
      }

      const { subscription_id, key_id } = res.data

      if (!window.Razorpay) {
        alert('Razorpay Payment SDK loading... Please click again in 2 seconds.')
        setSubscribing(false)
        return
      }

      const options = {
        key: key_id || keyId,
        subscription_id: subscription_id,
        name: store?.name || 'Store Premium',
        description: 'Monthly Recurring Store Subscription (₹2,000.00 / month)',
        image: store?.logo ? store.logo : undefined,
        handler: async function (response: any) {
          setSubscribing(true)
          try {
            const verifyRes = await api.post('/payments/subscriptions/verify/', {
              store_id: storeId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            })

            if (verifyRes.data.success) {
              setSuccessMessage('🎉 Subscription payment successful! Store upgraded to Premium Plan.')
              await fetchStoreAndSubscription()
            } else {
              setErrorMessage(verifyRes.data.message || 'Signature verification failed.')
            }
          } catch (vErr: any) {
            setErrorMessage('Payment signature verification error.')
          } finally {
            setSubscribing(false)
          }
        },
        prefill: {
          name: store?.name || 'Store Owner',
          contact: store?.phone_number || '',
        },
        theme: {
          color: '#0d9488',
        },
        modal: {
          ondismiss: function () {
            setSubscribing(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: any) {
      console.error('Subscription error', err)
      setErrorMessage(err?.response?.data?.message || 'Error creating Razorpay subscription.')
      setSubscribing(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your Premium Store Subscription?')) return
    setCancelling(true)
    setErrorMessage(null)
    try {
      const res = await api.post('/payments/subscriptions/cancel/', {
        store_id: storeId,
      })

      if (res.data.success) {
        setSuccessMessage('Subscription cancelled successfully.')
        await fetchStoreAndSubscription()
      } else {
        setErrorMessage(res.data.message || 'Could not cancel subscription.')
      }
    } catch (err: any) {
      setErrorMessage('Error cancelling subscription.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-teal-400" />
          <span className="text-sm font-extrabold">Loading Subscription Vault...</span>
        </div>
      </div>
    )
  }

  const isPremiumActive = planName === 'PREMIUM' && subscriptionStatus === 'active'

  return (
    <main className="min-h-screen bg-slate-950 pb-24 text-slate-100 font-sans relative">
      {/* FULL-PAGE PROFESSIONAL LOCK OVERLAY */}
      {showLockOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-900 via-indigo-950/95 to-slate-900 p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)] space-y-5">
            {/* Pulsing Lock Ring Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/10 border-2 border-amber-400/50 text-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.4)]">
              <Lock className="h-10 w-10 animate-bounce text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300 border border-amber-400/40">
                <Crown className="h-3.5 w-3.5 text-amber-400" /> ENTERPRISE VIP MEMBERSHIP
              </span>
              <h2 className="text-2xl font-black text-white">Full Premium Plan Active</h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto font-medium">
                Your store is powered by full enterprise capabilities with 0% platform commission!
              </p>
            </div>

            {/* Premium Feature Highlights List */}
            <div className="rounded-2xl bg-slate-950/80 border border-amber-400/20 p-4 text-left space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center gap-2.5 font-extrabold text-amber-300">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <span>⚡ 0% Platform Commission & Instant Direct Payouts</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>👑 100% Whitelabel Branding & Custom Store Themes</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>🚀 AI Product Search & Smart Customer Scratch Rewards</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>📱 1-Click Native Mobile App (PWA) Install for Buyers</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>💬 Direct 1-Click WhatsApp Ordering & Live Audio Alerts</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>📊 VIP Sales Analytics & Instant PDF Audit Reports</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>🛡️ Priority 24/7 Dedicated Support & Multi-Admin Rights</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled
                className="w-full rounded-2xl bg-amber-500/10 border-2 border-amber-400/50 py-3.5 text-xs font-black text-amber-300 shadow-xl opacity-90 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4 text-amber-400 animate-pulse" /> 🔒 WHITELABEL SECURITY LOCKED (DEFAULT PREMIUM)
              </button>
              <Link
                to={`/stores/${storeId}/manage`}
                className="w-full rounded-xl bg-slate-800/90 hover:bg-slate-700 py-2.5 text-[11px] font-bold text-slate-200 transition-all border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Seller Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={`/stores/${storeId}/manage`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-400 animate-pulse" /> Store Subscription & Security Vault
              </h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Razorpay Automated Recurring Payments & Whitelabel Security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLockOverlay(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-black text-amber-300 hover:bg-amber-400/20 transition-all cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" /> Vault Lock
            </button>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${isPremiumActive
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                }`}
            >
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              {isPremiumActive ? '⭐ Premium Active' : 'Basic Tier'}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Banner Messages */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-4 text-rose-200 text-xs font-bold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-4 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Current Active Plan Status Card */}
        <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 p-5 shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/90 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="h-3 w-3" /> WHITELABEL ENTERPRISE VAULT SECURED
                </span>
              </div>
              <h2 className="text-xl font-black text-white flex items-center gap-2 mt-2">
                {planName} PLAN {isPremiumActive && <Sparkles className="h-5 w-5 text-amber-400 fill-amber-400" />}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Razorpay Automated Subscription Billing ID: <code className="text-teal-300 font-mono">{razorpaySubId || store?.subscription?.razorpay_subscription_id || 'DEFAULT-ENTERPRISE-PLAN'}</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${isPremiumActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-xs font-extrabold uppercase text-slate-300">
                Status: <span className={isPremiumActive ? 'text-emerald-400 font-black' : 'text-slate-400'}>{subscriptionStatus}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Billing Cycle</p>
              <p className="font-black text-white mt-1">Monthly Recurring</p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Current Term Start</p>
              <p className="font-black text-teal-300 mt-1">
                {currentStart ? new Date(currentStart).toLocaleDateString('en-IN') : 'Active'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Next Renewal Date</p>
              <p className="font-black text-teal-300 mt-1">
                {currentEnd ? new Date(currentEnd).toLocaleDateString('en-IN') : 'Auto-Renew'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Auto-Debits</p>
              <p className="font-black text-emerald-400 mt-1">{paidCount || store?.subscription?.paid_count || payments.length} Paid Cycles</p>
            </div>
          </div>

          {isPremiumActive && (
            <div className="pt-2 flex justify-end border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-xs font-extrabold text-rose-300 hover:bg-rose-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {cancelling ? 'Cancelling Subscription...' : 'Cancel Auto-Renewal'}
              </button>
            </div>
          )}
        </section>

        {/* Plan Cards Grid */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Choose Your Subscription Tier</h2>
            <p className="text-xs text-slate-400">Select a recurring Razorpay payment plan to power your storefront.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Plan with Lock Overlay */}
            <div
              className={`rounded-2xl border p-5 transition-all space-y-4 relative overflow-hidden ${planName === 'BASIC'
                ? 'border-teal-500/60 bg-slate-900/90 shadow-lg'
                : 'border-slate-800 bg-slate-900/50'
                }`}
            >
              {/* Professional Lock Overlay for Basic Tier */}
              {planName === 'PREMIUM' && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center text-center p-5 space-y-3 border border-slate-800">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🔒 BASIC TIER LOCKED
                    </span>
                    <h4 className="text-sm font-black text-white mt-1.5">Default Premium Active</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      Your store has been unlocked with full Premium Whitelabel features by default!
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-slate-300">Basic Tier</span>
                  <h3 className="text-lg font-black text-white mt-1">Basic Plan</h3>
                </div>
                <p className="text-xl font-black text-white">Free</p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" /> Standard Product Catalog Setup
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" /> Basic WhatsApp Order Notifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" /> General Sales Dashboard
                </li>
              </ul>

              <button
                type="button"
                disabled={planName === 'BASIC'}
                onClick={() => handleSubscribe('BASIC')}
                className={`w-full rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${planName === 'BASIC'
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
              >
                {planName === 'BASIC' ? 'Current Plan' : 'Downgrade to Basic'}
              </button>
            </div>

            {/* Premium Plan (Official Razorpay plan_TBsfoswSWV4H7Q) */}
            <div
              className={`rounded-2xl border-2 p-5 transition-all space-y-4 relative overflow-hidden ${
                planName === 'PREMIUM'
                  ? 'border-amber-400/80 bg-gradient-to-b from-slate-900 via-teal-950/50 to-slate-900 shadow-2xl shadow-teal-900/30'
                  : 'border-teal-500/40 bg-slate-900/80 hover:border-teal-400 shadow-xl'
              }`}
            >
              <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-md">
                <Crown className="h-3 w-3 fill-slate-950" /> DEFAULT ACTIVE ENTERPRISE
              </div>

              <div className="flex justify-between items-start pt-1">
                <div>
                  <span className="rounded-md bg-amber-400/20 text-amber-300 px-2 py-0.5 text-[10px] font-black uppercase border border-amber-400/30 flex items-center gap-1 w-fit">
                    <Lock className="h-3 w-3 text-amber-400" /> Whitelabel Unlocked
                  </span>
                  <h3 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
                    <span className="text-2xl leading-none">👑</span>
                    <span>Premium Plan</span>
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-teal-300">₹ 2,000.00</p>
                  <p className="text-[10px] text-slate-400 font-bold">Every Month • Indian Rupee (INR)</p>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-200">
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Executive Analytics & Instant PDF Audit Generator
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Razorpay Automated Recurring Debits & Webhook Sync
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Customer Demand Queue & Live Realtime Buyer Notifications
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Priority 24/7 Store Support & Multi-Admin Rights
                </li>
              </ul>

              <button
                type="button"
                disabled={subscribing || isPremiumActive}
                onClick={() => handleSubscribe('PREMIUM')}
                className={`w-full rounded-xl py-3 text-xs font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isPremiumActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-teal-500/20 text-amber-300 border border-amber-400/40 cursor-default'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:from-teal-400 hover:to-emerald-500 shadow-teal-500/25 active:scale-95'
                }`}
              >
                {subscribing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Opening Razorpay Checkout...
                  </>
                ) : isPremiumActive ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> Active Premium Membership (Default)
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> Subscribe via Razorpay (₹2,000 / month)
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Razorpay Subscription Payment History Table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-400" /> Razorpay Payment Transaction History
              </h3>
              <p className="text-[11px] text-slate-400">Cryptographically verified recurring auto-debit receipts</p>
            </div>
            <span className="rounded-full bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 text-[10px] font-extrabold">
              {payments.length} Receipts
            </span>
          </div>

          <div className="overflow-x-auto">
            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-400">
                No past subscription payment receipts recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono text-teal-300 text-[11px]">{p.payment_id}</td>
                      <td className="py-3 px-3 text-slate-300">{new Date(p.created_at).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 font-black text-white">₹{p.amount.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${p.status === 'captured' || p.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <SellerBottomNav storeId={storeId || ''} activeTab="manage" />
    </main>
  )
}
