import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard(){
  const [stores, setStores] = useState<any[]>([])
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(()=>{
    api.get('/stores/').then(res=> {
      setStores(res.data)
      // A seller with a store should go directly to their own management area.
      if (res.data.length === 1) navigate(`/stores/${res.data[0].id}/manage`, { replace: true })
    }).catch(()=>{})
  },[navigate])

  return (
    <div className="p-4">
      <div className="flex justify-between items-center"><h1 className="text-xl font-semibold">Create your first store</h1><button onClick={() => { auth.logout(); navigate('/login') }} className="px-3 py-1 border rounded">Logout</button></div>
      <div className="mt-6">
        <Link to="/stores/create" className="px-4 py-2 bg-green-600 text-white rounded">Create Store</Link>
      </div>
      {stores.length > 1 && <section className="mt-6">
        <h2 className="text-lg font-medium">My Stores</h2>
        <ul className="mt-3 space-y-2">
          {stores.map(s=> (
            <li key={s.id} className="p-3 bg-white rounded shadow flex justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-gray-600">/{`store/${s.slug}`}</div>
              </div>
              <div className="flex gap-2">
                <Link to={`/store/${s.slug}`} className="text-blue-600">Open</Link>
                <Link to={`/stores/${s.id}/manage`} className="text-gray-600">Manage</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>}
    </div>
  )
}
