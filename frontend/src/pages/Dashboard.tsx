import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import SellerSplashLoader from '../components/SellerSplashLoader'

export default function Dashboard(){
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(()=>{
    api.get('/stores/').then(res=> {
      setStores(res.data)
      // A seller with a single store should go directly to their own management area.
      if (res.data.length === 1) {
        navigate(`/stores/${res.data[0].id}/manage`, { replace: true })
      } else {
        setLoading(false)
      }
    }).catch(()=>{
      setLoading(false)
    })
  },[navigate])

  if (loading) {
    return <SellerSplashLoader label="Loading your store workspace..." />
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans p-6 pb-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-xl font-black text-slate-900">Your Storefronts</h1>
          <button 
            onClick={() => { auth.logout(); navigate('/login') }} 
            className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs rounded-xl transition-all"
          >
            Logout
          </button>
        </div>
        
        {stores.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-md space-y-6">
            <div className="text-5xl">🏪</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">No stores found</h2>
              <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">
                You haven't created any digital storefronts yet. Let's build your first store and start selling online.
              </p>
            </div>
            <Link 
              to="/start" 
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-teal-500 text-white font-black rounded-2xl shadow-lg hover:opacity-95 transition-all hover:-translate-y-0.5"
            >
              Create New Store ➔
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider pl-2">Select a store to manage</h2>
            {stores.map(s=> (
              <div key={s.id} className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">{s.name}</h3>
                  <a href={`/store/${s.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline">
                    apanidukan.com/store/{s.slug} ↗
                  </a>
                </div>
                <div className="flex gap-2">
                  <Link 
                    to={`/stores/${s.id}/manage`} 
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                  >
                    Manage Dashboard
                  </Link>
                </div>
              </div>
            ))}
            
            <div className="pt-6 text-center">
               <Link 
                to="/start" 
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
              >
                + Create another store
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
