import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'

export default function OrderDetail(){
  const { id } = useParams()
  const [order, setOrder] = useState<any|null>(null)
  const [storePhone, setStorePhone] = useState<string | null>(null)
  const [accesses, setAccesses] = useState<any[]>([])

  useEffect(()=>{
    if(!id) return
    api.get(`/orders/${id}/`).then(res=> setOrder(res.data)).catch(()=>{})
    api.get('/orders/accesses/').then(res=> setAccesses(res.data)).catch(()=> setAccesses([]))
  },[id])

  useEffect(() => {
    if (!order) return
    // Try to obtain merchant/store phone number from the order payload
    const maybePhone = order.store?.phone_number || order.store_phone || order.store_phone_number || order.store?.phone || order.store_phone
    if (maybePhone) {
      setStorePhone(String(maybePhone).replace(/\D/g, ''))
      return
    }
    // If order.store is an id, fetch the store to read its phone number
    if (order.store && typeof order.store === 'number') {
      api.get(`/stores/${order.store}/`).then(res => {
        const p = res.data?.phone_number || res.data?.phone || ''
        if (p) setStorePhone(String(p).replace(/\D/g, ''))
      }).catch(() => {})
    }
  }, [order])

  function isCOD(ord: any){
    if (!ord) return false
    const pm = String(ord.payment_method || ord.payment || ord.payment_method_identifier || '').toLowerCase()
    if (pm.includes('cod') || pm.includes('cash')) return true
    if (String(ord.payment_status || '').toLowerCase().includes('cod')) return true
    return false
  }

  function openWhatsApp(){
    if (!storePhone) return alert('Store WhatsApp number not available.')
    const lines: string[] = []
    lines.push(`Hello ${order.store?.name || order.store_name || ''}, I have a question about my order.`)
    lines.push(`Order ID: ${order.order_number || order.id || ''}`)
    lines.push('')
    order.items.forEach((it: any) => lines.push(`• ${it.product_name_snapshot || it.name || it.product_name} × ${it.quantity} — ${it.price_snapshot || it.line_total || ''}`))
    lines.push('')
    lines.push(`Total: ${order.total} ${order.currency || ''}`)
    if (order.customer_name) lines.push(`Customer: ${order.customer_name}`)
    // Address and map link
    const address = order.delivery_address || order.address || order.shipping_address || order.customer_address || ''
    if (address) {
      lines.push('')
      lines.push(`Address: ${address}`)
      const mapQuery = order.latitude && order.longitude ? `${order.latitude},${order.longitude}` : address
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
      lines.push(mapLink)
    }
    // Payment note
    lines.push('')
    lines.push(`Payment method: ${order.payment_method || order.payment || ''}`)
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer')
  }

  function getTokenForProduct(productId:number){
    const found = accesses.find(a=> a.product_id === productId)
    return found ? found.download_token : null
  }

  function download(token:string){
    window.location.href = `/api/v1/downloads/${token}/`
  }

  if(!order) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Order {order.order_number}</h1>
      <div className="mt-4">
        <div>Total: {order.total} {order.currency}</div>
        {isCOD(order) && (
          <div className="mt-4">
            <button onClick={openWhatsApp} className="rounded-xl bg-[#25D366] px-4 py-2 font-bold text-white">Share on WhatsApp ↗</button>
          </div>
        )}
        <div className="mt-4">
          <ul className="space-y-2">
            {order.items.map((it:any, idx:number)=> (
              <li key={idx} className="p-3 bg-white rounded flex justify-between">
                <div>
                  <div className="font-semibold">{it.product_name_snapshot}</div>
                  <div className="text-sm text-gray-600">Qty: {it.quantity} — {it.price_snapshot}</div>
                </div>
                <div>
                  {getTokenForProduct(it.product) ? (
                    <button onClick={()=>download(getTokenForProduct(it.product)!)} className="px-3 py-1 bg-blue-600 text-white rounded">Download</button>
                  ) : (
                    <a href="/downloads" className="px-3 py-1 bg-gray-200 rounded">View Downloads</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
