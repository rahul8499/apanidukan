import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { getWebSocketUrl } from '../utils/websocket'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'
import { useTranslation } from 'react-i18next'

export default function SellerRequests() {
  const { storeId } = useParams()
  const { t } = useTranslation()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [productRequests, setProductRequests] = useState<any[]>([])
  const [orderIssues, setOrderIssues] = useState<any[]>([])
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

      const [reqs, issues] = await Promise.all([
        api.get(`/stores/${found.id}/requests/`),
        api.get(`/seller/stores/${found.id}/order-issues/`),
      ])
      setProductRequests(reqs.data || [])
      setOrderIssues(issues.data || [])
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
    const token = localStorage.getItem('access_token')
    if (!token) return
    const wsUrl = getWebSocketUrl(`/ws/store/${storeId}/?token=${encodeURIComponent(token)}`)

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

  const updateIssue = async (issue: any, status: string) => {
    const provider_refund_id = status === 'COMPLETED' && issue.request_type === 'REFUND'
      ? window.prompt('Enter real bank/UPI refund transaction reference:') || '' : ''
    if (status === 'COMPLETED' && issue.request_type === 'REFUND' && !provider_refund_id) return
    try {
      const res = await api.patch(`/seller/stores/${storeId}/order-issues/${issue.id}/`, { status, provider_refund_id })
      setOrderIssues(current => current.map(item => item.id === issue.id ? res.data : item))
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Request status could not be updated.')
    }
  }

  const completeExchange = async (issue: any) => {
    const picker = document.createElement('input')
    picker.type = 'file'; picker.accept = 'image/jpeg,image/png,image/webp'
    picker.onchange = async () => {
      const proof = picker.files?.[0]
      if (!proof) return
      try {
        const sent = await api.post(`/seller/stores/${storeId}/order-issues/${issue.id}/completion-otp/`)
        const otp = window.prompt(`${sent.data.message}\nEnter the 6-digit OTP told by customer:`)?.trim()
        if (!otp) return
        const form = new FormData(); form.append('otp', otp); form.append('completion_proof', proof)
        await api.patch(`/seller/stores/${storeId}/order-issues/${issue.id}/completion-otp/`, form)
        await updateIssue(issue, 'COMPLETED')
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.detail || 'Exchange completion verification failed.')
      }
    }
    picker.click()
  }

  if (!store) return <div className="p-6">Loading product requests...</div>

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-28 lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle={t('productRequestsTitle')} onStoreUpdate={loadStore} />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="rounded-2xl bg-gradient-to-br from-amber-800 via-amber-700 to-slate-900 p-5 text-white shadow-lg border border-amber-600/30 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-200">{t('productRequestsTitle')}</p>
            <p className="mt-1 text-xl font-bold">{t('fulfillmentQueue')}</p>
            <p className="mt-2 text-xs text-amber-100 leading-relaxed">
              {t('productRequestsSubtitle')}
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
            <span className="hidden sm:inline">{t('refreshQueue')}</span>
          </button>
        </div>

        {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900">{errorMsg}</div>}

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900">Returns, Exchanges & Refunds ({orderIssues.length})</h2>
          {orderIssues.length === 0 ? <div className="rounded-2xl border border-dashed p-5 text-center text-xs text-slate-500">No order issue requests.</div> : orderIssues.map(issue => (
            <div key={issue.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex justify-between"><b className="text-sm">{issue.request_type} · Order #{issue.order}</b><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800">{issue.status}</span></div>
              <p className="text-xs text-slate-700">Size {issue.selected_size || 'N/A'}{issue.requested_size ? ` → ${issue.requested_size}` : ''} · Qty {issue.quantity}</p>
              <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{issue.reason}</p>
              {issue.evidence?.length > 0 && <div className="flex gap-2 overflow-x-auto">{issue.evidence.map((src: string, index: number) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Exchange evidence ${index + 1}`} className="h-20 w-20 rounded-lg border object-cover"/></a>)}</div>}
              <div className="flex flex-wrap gap-2">
                {issue.status === 'REQUESTED' && <><button onClick={() => updateIssue(issue, 'APPROVED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black text-white">Approve</button><button onClick={() => updateIssue(issue, 'REJECTED')} className="rounded-lg bg-rose-100 px-3 py-2 text-[11px] font-black text-rose-800">Reject</button></>}
                {issue.status === 'APPROVED' && <button onClick={() => updateIssue(issue, 'PROCESSING')} className="rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-black text-white">Start Processing</button>}
                {issue.status === 'PROCESSING' && <><button onClick={() => issue.request_type === 'EXCHANGE' ? completeExchange(issue) : updateIssue(issue, 'COMPLETED')} className="rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-black text-white">{issue.request_type === 'EXCHANGE' ? 'OTP + Proof & Complete' : 'Complete'}</button><button onClick={() => updateIssue(issue, 'FAILED')} className="rounded-lg bg-slate-200 px-3 py-2 text-[11px] font-black">Mark Failed</button></>}
                {issue.provider_refund_id && <span className="text-[10px] font-mono text-slate-600">Refund ref: {issue.provider_refund_id}</span>}
              </div>
            </div>
          ))}
        </section>

        <div className="space-y-3">
          {productRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-base font-bold text-slate-700">{t('noProductRequests')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('noProductRequestsSubtext')}</p>
            </div>
          ) : (
            productRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">{request.productName}</h3>
                    <p className="mt-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{t('customerLabel')}:</span> {request.customerName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{t('phoneLabel')}:</span> {request.customerPhone}
                    </p>
                    {request.message && (
                      <p className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-100">
                        <span className="font-semibold">{t('noteLabel')}:</span> {request.message}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-slate-400">
                      {t('requestedOn')} {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReply(request)}
                    className="flex-shrink-0 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1FAE56] cursor-pointer"
                  >
                    {t('replyBtn')}
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
