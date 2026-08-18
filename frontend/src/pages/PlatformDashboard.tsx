import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function PlatformDashboard(){
  const [data, setData] = useState<any>(null)
  const auth = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!auth.user) return
    if (!auth.user.is_staff) { navigate('/dashboard', { replace: true }); return }
    api.get('/auth/platform/dashboard/').then(result => setData(result.data)).catch(() => navigate('/dashboard', { replace: true }))
  }, [auth.user, navigate])
  if (!data) return <div className="p-6">Loading platform dashboard...</div>
  return <main className="mx-auto max-w-6xl p-6"><header className="flex items-center justify-between"><div><p className="text-sm text-blue-700">Platform owner</p><h1 className="text-3xl font-bold">QuickStore Control Panel</h1></div><button onClick={() => { auth.logout(); navigate('/login') }} className="rounded border px-3 py-2">Logout</button></header><section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(data.stats).map(([label, value]) => <div key={label} className="rounded-xl bg-white p-5 shadow"><p className="capitalize text-gray-500">{label.replace('_', ' ')}</p><p className="mt-2 text-3xl font-bold">{String(value)}</p></div>)}</section><section className="mt-7 overflow-hidden rounded-xl bg-white shadow"><h2 className="border-b p-5 text-xl font-bold">All seller stores</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-4">Store</th><th className="p-4">Seller</th><th className="p-4">Status</th><th className="p-4">Customer link</th></tr></thead><tbody>{data.stores.map((store: any) => <tr key={store.id} className="border-t"><td className="p-4 font-medium">{store.name}</td><td className="p-4">{store.owner_email}</td><td className="p-4">{store.is_published ? 'Live' : 'Draft'}</td><td className="p-4"><a className="text-blue-600" target="_blank" rel="noreferrer" href={`/store/${store.slug}`}>Open store</a></td></tr>)}</tbody></table></div></section></main>
}
