import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LocateFixed, MapPin, Search, Store as StoreIcon } from 'lucide-react'
import api from '../services/api'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import i18n from '../i18n'

type BrowseMode = 'nearby' | 'all'

export default function CustomerHome() {
  const [stores, setStores] = useState<any[]>([])
  const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [category, setCategory] = useState('')
    const [mode, setMode] = useState<BrowseMode>('nearby')
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
    const [locationLabel, setLocationLabel] = useState('Location select karein')
    const [locating, setLocating] = useState(false)
    const [error, setError] = useState('')

    async function loadStores(nextMode = mode, nextLocation = location, nextCategory = category) {
      setLoading(true)
      setError('')
      try {
        const params: Record<string, string> = {}
        if (nextCategory) params.category = nextCategory
        if (nextMode === 'nearby' && nextLocation) {
          params.lat = String(nextLocation.latitude)
          params.lng = String(nextLocation.longitude)
          params.radius_km = '10'
        }
        const response = await api.get('/public/stores/', { params })
        setStores(Array.isArray(response.data) ? response.data : response.data.results || [])
      } catch {
        setError('Stores load nahi ho paaye. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    function selectLocation() {
      if (!navigator.geolocation) {
        setError('Location is not supported on this device. All Stores use karein.')
        setMode('all')
        return
      }
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const nextLocation = { latitude: coords.latitude, longitude: coords.longitude }
          setLocation(nextLocation)
          setLocationLabel('Near me: 10 km')
          setMode('nearby')
          setLocating(false)
          loadStores('nearby', nextLocation, category)
        },
        () => {
          setLocating(false)
          setError('Location permission nahi mili. All Stores mode use karein.')
          setMode('all')
          loadStores('all', null, category)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }

    useEffect(() => {
      const savedLocation = localStorage.getItem('customer-location')
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation)
          setLocation(parsed)
          setLocationLabel('Near me: 10 km')
          loadStores('nearby', parsed, '')
          return
        } catch { localStorage.removeItem('customer-location') }
      }
      setMode('all')
      loadStores('all', null, '')
    }, [])

    useEffect(() => {
      if (location) localStorage.setItem('customer-location', JSON.stringify(location))
    }, [location])

    function chooseMode(nextMode: BrowseMode) {
      setMode(nextMode)
      if (nextMode === 'nearby' && !location) {
        selectLocation()
        return
      }
      loadStores(nextMode, nextMode === 'nearby' ? location : null, category)
    }

    function chooseCategory(nextCategory: string) {
      setCategory(nextCategory)
      loadStores(mode, mode === 'nearby' ? location : null, nextCategory)
    }

    const filteredStores = stores.filter((store) => {
      const query = search.trim().toLowerCase()
      return !query || store.name.toLowerCase().includes(query) || store.slug.toLowerCase().includes(query) || (store.address || '').toLowerCase().includes(query)
    })

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Apani Dukan</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">Shop near you</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Nearby stores, products aur quick delivery.</p>
            </div>
            <Link to="/customer-orders" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-700 shadow-sm">My Orders</Link>
          </header>

          <section className="mb-5 rounded-3xl bg-slate-900 p-4 text-white shadow-lg sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={selectLocation} disabled={locating} className="flex items-center gap-3 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><LocateFixed className="h-5 w-5 text-teal-300" /></span>
                <span><span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Delivery location</span><span className="block text-sm font-black">{locating ? 'Location detect ho rahi hai...' : locationLabel}</span></span>
              </button>
              <div className="flex rounded-xl bg-white/10 p-1 text-xs font-black">
                <button onClick={() => chooseMode('nearby')} className={`rounded-lg px-3 py-2 ${mode === 'nearby' ? 'bg-white text-slate-900' : 'text-slate-300'}`}>Near me 10 km</button>
                <button onClick={() => chooseMode('all')} className={`rounded-lg px-3 py-2 ${mode === 'all' ? 'bg-white text-slate-900' : 'text-slate-300'}`}>All Stores</button>
              </div>
            </div>
          </section>

          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => chooseCategory('')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${!category ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>All categories</button>
            {BUSINESS_TYPES.map((type) => (
              <button key={type.id} onClick={() => chooseCategory(type.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${category === type.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>
                {type.icon} {getBusinessTypeTitle(type, i18n.language)}
              </button>
            ))}
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search store, area or category" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold shadow-sm outline-none focus:border-indigo-400" />
          </div>

          {error && <p className="mb-4 rounded-2xl bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700">{error}</p>}
          {loading && <p className="py-12 text-center text-sm font-semibold text-slate-500">Stores load ho rahe hain...</p>}
          {!loading && !error && filteredStores.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><StoreIcon className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-600">Is selection me store nahi mila.</p><button onClick={() => chooseMode('all')} className="mt-4 text-sm font-black text-indigo-700">All Stores dekhein</button></div>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStores.map((store) => (
              <Link key={store.id} to={`/s/${store.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
                <div className="flex items-center gap-3">
                  {store.logo ? <img src={store.logo} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><StoreIcon className="h-5 w-5" /></div>}
                  <div className="min-w-0"><h2 className="truncate font-black text-slate-900">{store.name}</h2><p className="truncate text-xs font-semibold text-slate-500">{store.business_type || 'Local store'}</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 text-xs font-bold text-slate-500"><span className="flex min-w-0 items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" />{store.address || 'Local store'}</span>{store.distance_km !== undefined && <span className="shrink-0 text-teal-700">{store.distance_km} km</span>}</div>
                <p className="mt-4 text-sm font-black text-indigo-700">Visit store</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    )
}