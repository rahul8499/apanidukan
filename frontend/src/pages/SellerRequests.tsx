import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function SellerRequests() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(null)
  const [productRequests, setProductRequests] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const loadStore = async () => {
      try {
        const stores = await api.get('/stores/')
        const found = stores.data.find((x: any) => String(x.id) === storeId)
        if (!found) return navigate('/dashboard')
        setStore(found)

        // Load requests from backend API
        const reqs = await api.get(`/stores/${found.id}/requests/`)
        setProductRequests(reqs.data || [])
      } catch {
        navigate('/login')
      }
    }
    loadStore()
  }, [storeId, navigate])

  const handleReply = async (request: any) => {
    try {
      const msgText = `Hi ${request.customerName}, thanks for requesting ${request.productName}. We will contact you soon with options.`
      
      // 1. Create internal conversation with initial message
      const res = await api.post(`/seller/stores/${storeId}/conversations/`, {
        customer_name: request.customerName,
        customer_phone: request.customerPhone,
        message: msgText
      })
      
      // 2. Open WhatsApp in new tab
      const phoneClean = String(request.customerPhone || '').replace(/\D/g, '')
      window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(msgText)}`, '_blank')
      
      // 3. Navigate to internal chat
      navigate(`/stores/${storeId}/chat?convId=${res.data.id}`)
    } catch (err) {
      setErrorMsg('Failed to start chat. Check connection.')
    }
  }

  if (!store) return <div className="p-6">Loading...</div>

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-24 lg:max-w-none lg:w-full">
      <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Seller workspace</p>
          <h1 className="mt-1 text-xl font-bold">Product Requests</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBellHeader />
          <button onClick={() => { auth.logout(); navigate('/login') }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Logout</button>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl bg-gradient-to-br from-amber-700 to-amber-600 p-5 text-white shadow-lg shadow-amber-200">
          <p className="text-sm font-semibold text-amber-100">Customer Product Requests</p>
          <p className="mt-1 text-xl font-bold">Fulfillment Queue</p>
          <p className="mt-2 text-sm text-amber-50">Customers searched your store and could not find these products. Reply via WhatsApp to close the loop.</p>
        </div>

        {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">{errorMsg}</div>}

        <div className="space-y-3">
          {productRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-lg font-semibold text-slate-600">No product requests yet</p>
              <p className="mt-1 text-sm text-slate-500">When customers search and don't find a product, they can request it. You'll see it here.</p>
            </div>
          ) : (
            productRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{request.productName}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-semibold">Customer:</span> {request.customerName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold">Phone:</span> {request.customerPhone}
                    </p>
                    {request.message && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                        <span className="font-semibold">Note:</span> {request.message}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      Requested {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReply(request)}
                    className="flex-shrink-0 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white shadow hover:bg-[#1FAE56]"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-1 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] lg:left-0 lg:right-0 lg:max-w-none lg:-translate-x-0 lg:mx-auto lg:w-full">
        <Link to={`/stores/${storeId}/manage`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Setup</Link>
        <Link to={`/stores/${storeId}/orders`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Orders</Link>
        <Link to={`/stores/${storeId}/payments`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Payments</Link>
        <Link to={`/stores/${storeId}/chat`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Chat</Link>
        <span className="flex-1 rounded-xl bg-amber-50 px-2 py-2 text-center text-xs font-bold text-amber-700">Requests</span>
        <Link to={`/stores/${storeId}/analytics`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Analytics</Link>
      </nav>
    </div>
  )
}
