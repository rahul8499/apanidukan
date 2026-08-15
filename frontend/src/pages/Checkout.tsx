import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Checkout(){
  const [cart, setCart] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [accesses, setAccesses] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(()=>{
    api.get('/cart/').then(res=> setCart(res.data)).catch(()=> setCart({items: []}))
  },[])

  async function placeOrder(){
    if(!cart || !cart.items.length) return
    setLoading(true)
    try{
      // For MVP assume single store context: take store from first product via backend knowledge.
      const items = cart.items.map((it:any)=> ({ product: it.product, quantity: it.quantity }))
      const storeId = cart.items[0]?.product_detail?.store || undefined
      // Create order
      const orderRes = await api.post('/orders/', { store: cart.items[0].product_detail?.store || 1, items })
      const orderId = orderRes.data.order_id
      // Create payment
      const payRes = await api.post('/payments/create/', { order_id: orderId })
      const tx = payRes.data.transaction_id
      // For dummy provider, verify immediately
      const verify = await api.post('/payments/verify/', { transaction_id: tx })
      if(verify.data.success){
        // navigate to downloads page where tokens are shown
        navigate('/downloads')
      }else{
        setMessage('Payment failed')
      }
    }catch(err:any){
      setMessage('Checkout failed')
    }
    setLoading(false)
  }

  function download(token:string){
    window.location.href = `/api/v1/downloads/${token}/`
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Checkout</h1>
      <div className="mt-4">
        {cart && cart.items && cart.items.length ? (
          <div>
            <ul className="space-y-2">
              {cart.items.map((it:any)=> (
                <li key={it.id} className="p-3 bg-white rounded shadow flex justify-between">
                  <div>{it.product_detail.name}</div>
                  <div>{it.price_snapshot} x {it.quantity}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <button onClick={placeOrder} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">{loading ? 'Processing...' : 'Pay Now'}</button>
            </div>
          </div>
        ) : <div>Your cart is empty.</div>}

        {message && <div className="mt-4 text-green-600">{message}</div>}

        {accesses.length > 0 && (
          <div className="mt-4">
            <h2 className="font-semibold">Downloads</h2>
            <ul className="mt-2 space-y-2">
              {accesses.map(a=> (
                <li key={a.download_token} className="flex justify-between p-2 bg-white rounded">
                  <div>Product ID: {a.product_id}</div>
                  <button onClick={()=>download(a.download_token)} className="text-blue-600">Download</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
