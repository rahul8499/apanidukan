import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Orders(){
  const [orders, setOrders] = useState<any[]>([])

  useEffect(()=>{
    api.get('/orders/list/').then(res=> setOrders(res.data)).catch(()=>{})
  },[])

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">My Orders</h1>
      <ul className="mt-4 space-y-3">
        {orders.map(o=> (
          <li key={o.id} className="p-3 bg-white rounded shadow flex justify-between items-center">
            <div>
              <div className="font-semibold">Order {o.order_number}</div>
              <div className="text-sm text-gray-600">Total: {o.total} {o.currency}</div>
              <div className="text-sm text-gray-600">Status: {o.status}</div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/orders/${o.id}`} className="px-3 py-1 bg-gray-200 rounded">Details</a>
              <a href="/downloads" className="px-3 py-1 bg-blue-600 text-white rounded">Downloads</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
