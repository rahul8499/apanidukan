import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'

export default function SellerPayments(){
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const res = await api.get('/stores/')
      const found = res.data.find((item: any) => String(item.id) === storeId)
      if (!found) return navigate('/dashboard')
      setCachedStore(found)
      setStore(found)
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => { loadData() }, [storeId, navigate])

  if (!store) return <div className="p-6">Loading payment setup...</div>

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-28 lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle="Payments Setup" onStoreUpdate={loadData} />

      <div className="space-y-5 p-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-xl border border-indigo-700/30">
          <span className="rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-bold text-indigo-200">PAYMENTS</span>
          <h2 className="mt-4 text-2xl font-bold">Get paid for every order.</h2>
          <p className="mt-2 text-sm text-indigo-100">Connect a payment gateway to receive money directly in your account.</p>
        </section>

        <section className="premium-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-slate-900">Payment gateway</p>
              <p className="mt-1 text-sm text-slate-500">Razorpay / Stripe integration</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">Setup pending</span>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs font-medium text-slate-600 border border-slate-100">
            Payment collection is not enabled yet. Orders can be created only after a real payment gateway is connected by the platform owner.
          </div>
        </section>

        <section className="premium-card p-5">
          <h3 className="font-bold text-slate-900">Payout details</h3>
          <p className="mt-1 text-sm text-slate-500">Your bank and settlement details will appear here after gateway setup.</p>
        </section>
      </div>

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="payments" />
    </main>
  )
}
