import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Link, useNavigate } from 'react-router-dom'

export default function Cart(){
  const [cart, setCart] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(()=>{
    api.get('/cart/').then(res=> setCart(res.data)).catch(()=> setCart({items: []}))
  },[])

  function removeItem(id:number){
    api.delete(`/cart/items/${id}/`).then(()=> setCart((prev: any)=> ({...prev, items: prev.items.filter((it:any)=> it.id !== id)}))).catch(()=>{})
  }

  function toCheckout(){
    navigate('/checkout')
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Cart</h1>
      <div className="mt-4">
        {cart && cart.items && cart.items.length ? (
          <div className="space-y-3">
            {cart.items.map((it:any)=> (
              <div key={it.id} className="p-3 bg-white rounded shadow flex justify-between items-center">
                <div>
                  <div className="font-semibold">{it.product_detail.name}</div>
                  <div className="text-sm text-gray-600">{it.price_snapshot} x {it.quantity}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>removeItem(it.id)} className="text-red-600">Remove</button>
                </div>
              </div>
            ))}
            <div>
              <button onClick={toCheckout} className="px-4 py-2 bg-blue-600 text-white rounded">Proceed to Checkout</button>
            </div>
          </div>
        ) : <div className="text-gray-600">Your cart is empty. Browse stores to add products.</div>}
      </div>
    </div>
  )
}
