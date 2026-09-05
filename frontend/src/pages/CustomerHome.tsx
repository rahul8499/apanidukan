import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Store as StoreIcon } from 'lucide-react'
import api from '../services/api'

export default function CustomerHome() {
  const [stores, setStores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/public/stores/')
      .then((response) => setStores(Array.isArray(response.data) ? response.data : response.data.results || []))
      .catch(() => setError('Stores load nahi ho paaye. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const filteredStores = stores.filter((store) => {
    const query = search.trim().toLowerCase()
    return !query || store.name.toLowerCase().includes(query) || store.slug.toLowerCase().includes(query)
  })

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Apani Dukan</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Shop from local stores</h1>
          </div>
          <img src="/apanidukan1.png" alt="Apani Dukan" className="h-12 w-12 rounded-xl" />
        </header>

        <div className="relative mb-7">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stores"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold shadow-sm outline-none focus:border-indigo-400"
          />
        </div>

        {loading && <p className="py-12 text-center text-sm font-semibold text-slate-500">Loading stores...</p>}
        {error && <p className="rounded-2xl bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700">{error}</p>}
        {!loading && !error && filteredStores.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <StoreIcon className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-600">No published stores found.</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map((store) => (
            <Link key={store.id} to={`/s/${store.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                {store.logo ? <img src={store.logo} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><StoreIcon className="h-5 w-5" /></div>}
                <div className="min-w-0">
                  <h2 className="truncate font-black text-slate-900">{store.name}</h2>
                  <p className="truncate text-xs font-semibold text-slate-500">{store.business_type || 'Local store'}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold text-indigo-700">Visit store</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}