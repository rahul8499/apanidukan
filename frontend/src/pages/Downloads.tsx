import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Downloads(){
  const [items, setItems] = useState<any[]>([])

  useEffect(()=>{
    api.get('/orders/accesses/').then(res=> setItems(res.data)).catch(()=> setItems([]))
  },[])

  function download(token:string){
    window.location.href = `/api/v1/downloads/${token}/`
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">My Downloads</h1>
      <ul className="mt-4 space-y-3">
        {items.map(it=> (
          <li key={it.product_id} className="p-3 bg-white rounded shadow flex justify-between">
            <div>
              <div className="font-semibold">{it.product_name}</div>
              <div className="text-sm text-gray-600">Granted: {new Date(it.granted_at).toLocaleString()}</div>
            </div>
            <div>
              <button onClick={()=>download(it.download_token)} className="px-3 py-1 bg-blue-600 text-white rounded">Download</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
