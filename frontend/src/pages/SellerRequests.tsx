import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'

export default function SellerRequests() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [productRequests, setProductRequests] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const navigate = useNavigate()

  const loadStore = async () => {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((x: any) => String(x.id) === storeId)
      if (!found) return navigate('/dashboard')
      setCachedStore(found)
      setStore(found)

      const reqs = await api.get(`/stores/${found.id}/requests/`)
      setProductRequests(reqs.data || [])
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => {
    loadStore()
  }, [storeId, navigate])

  // Real-time WebSocket connection for live Customer Requests
  useEffect(() => {
    if (!storeId) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/store/${storeId}/`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_product_request') {
            loadStore()
          }
        } catch {}
      }
    } catch {}

    return () => {
      socket?.close()
    }
  }, [storeId])

  const handleReply = async (request: any) => {
    try {
      const msgText = `Hi ${request.customerName}, thanks for requesting ${request.productName}. We will contact you soon with options.`
      
      const res = await api.post(`/seller/stores/${storeId}/conversations/`, {
        customer_name: request.customerName,
        customer_phone: request.customerPhone,
        message: msgText
      })
      
      const phoneClean = formatPhoneForWhatsApp(request.customerPhone)
      if (phoneClean) {
        window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(msgText)}`, '_blank')
      }
      
      navigate(`/stores/${storeId}/chat?convId=${res.data.id}`)
    } catch (err) {
      setErrorMsg('Failed to start chat. Check connection.')
    }
  }

  if (!store) return <div className="p-6">Loading product requests...</div>

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-28 lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle="Product Requests" onStoreUpdate={loadStore} />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="rounded-2xl bg-gradient-to-br from-amber-800 via-amber-700 to-slate-900 p-5 text-white shadow-lg border border-amber-600/30 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-200">Customer Product Requests</p>
            <p className="mt-1 text-xl font-bold">Fulfillment Queue</p>
            <p className="mt-2 text-xs text-amber-100 leading-relaxed">
              Customers searched your store and could not find these products. Reply via WhatsApp or Chat to close the loop.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsRefreshingData(true)
              await loadStore()
              setTimeout(() => setIsRefreshingData(false), 500)
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-950/60 px-3 py-2 text-xs font-extrabold text-amber-200 hover:bg-amber-900 hover:text-white transition-all cursor-pointer shadow-xs ml-3"
            title="Click to fetch live fresh product requests"
          >
            <span className={`text-sm ${isRefreshingData ? 'animate-spin' : ''}`}>🔄</span>
            <span className="hidden sm:inline">Refresh Queue</span>
          </button>
        </div>

        {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900">{errorMsg}</div>}

        <div className="space-y-3">
          {productRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-base font-bold text-slate-700">No product requests yet</p>
              <p className="mt-1 text-xs text-slate-500">When customers search and don't find a product, they can request it. You'll see it here.</p>
            </div>
          ) : (
            productRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">{request.productName}</h3>
                    <p className="mt-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Customer:</span> {request.customerName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Phone:</span> {request.customerPhone}
                    </p>
                    {request.message && (
                      <p className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-100">
                        <span className="font-semibold">Note:</span> {request.message}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-slate-400">
                      Requested {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReply(request)}
                    className="flex-shrink-0 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1FAE56] cursor-pointer"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="requests" />
    </div>
  )
}
