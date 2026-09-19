import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LocateFixed, MapPin, Search, Store as StoreIcon } from 'lucide-react'
import api from '../services/api'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import i18n from '../i18n'

type BrowseMode = 'nearby' | 'all'
type FulfilmentFilter = 'all' | 'delivery' | 'pickup'

export default function CustomerStores() {
  const [stores, setStores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState<BrowseMode>('all')
  const [fulfilment, setFulfilment] = useState<FulfilmentFilter>('all')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  async function loadStores(nextMode: BrowseMode, nextLocation: typeof location, nextCategory: string) {
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
      setError('Stores load nahi ho paaye. Please retry karein.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('customer-location')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLocation(parsed)
      } catch {
        localStorage.removeItem('customer-location')
      }
    }
    loadStores('all', null, '')
  }, [])

  function selectNearby() {
    if (location) {
      setMode('nearby')
      loadStores('nearby', location, category)
      return
    }
    if (!navigator.geolocation) {
      setError('Location is not supported. All Stores use karein.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) }
        localStorage.setItem('customer-location', JSON.stringify(nextLocation))
        setLocation(nextLocation)
        setMode('nearby')
        setLocating(false)
        loadStores('nearby', nextLocation, category)
      },
      () => {
        setLocating(false)
        setError('Location permission nahi mili. All Stores dikha rahe hain.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function selectAll() {
    setMode('all')
    loadStores('all', null, category)
  }

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory)
    loadStores(mode, mode === 'nearby' ? location : null, nextCategory)
  }

  const visibleStores = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return stores
    return stores.filter((store) => {
      const matchesQuery = !query ||
        store.name?.toLowerCase().includes(query) ||
        store.slug?.toLowerCase().includes(query) ||
        store.address?.toLowerCase().includes(query) ||
        store.business_type?.toLowerCase().includes(query)
      const matchesFulfilment = fulfilment === 'all' ||
        (fulfilment === 'delivery' && store.allow_home_delivery) ||
        (fulfilment === 'pickup' && !store.allow_home_delivery)
      return matchesQuery && matchesFulfilment
    })
  }, [fulfilment, search, stores])

  return (
    <main className="min-h-screen bg-[#f7f8fc] pb-24 text-slate-950">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-6">
        <CustomerAppHeader subtitle="Explore all stores" />

        <section className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-4 text-white shadow-lg sm:p-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-100">Store directory</p>
          <h1 className="mt-1 text-2xl font-black">Find your favourite store</h1>
          <p className="mt-1 text-xs text-blue-100">Search verified local sellers, categories aur nearby shops.</p>
          <div className="relative mt-4"><Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search store, location or category" className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-3 text-xs font-semibold text-slate-900 outline-none ring-2 ring-transparent focus:ring-blue-300" /></div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
          <button type="button" onClick={selectNearby} disabled={locating} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black ${mode === 'nearby' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}><LocateFixed className="h-4 w-4" />{locating ? 'Locating...' : 'Near me'}</button>
          <button type="button" onClick={selectAll} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black ${mode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}><StoreIcon className="h-4 w-4" />All Stores</button>
        </div>

        <section className="mt-5"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black">Categories</h2><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Swipe</span></div><div className="flex gap-2 overflow-x-auto pb-2">{[{ id: '', label: 'All', icon: '▦' }, ...BUSINESS_TYPES.map((type) => ({ id: type.id, label: getBusinessTypeTitle(type, i18n.language), icon: type.icon }))].map((item) => <button key={item.id} type="button" onClick={() => selectCategory(item.id)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black ${category === item.id ? 'bg-orange-500 text-white shadow-sm' : 'border border-slate-100 bg-white text-slate-700'}`}>{item.icon} {item.label}</button>)}</div></section>

        <section className="mt-3 flex gap-2 overflow-x-auto pb-1">{([{ id: 'all', label: 'All options' }, { id: 'delivery', label: 'Home delivery' }, { id: 'pickup', label: 'Store pickup' }] as { id: FulfilmentFilter; label: string }[]).map((item) => <button key={item.id} type="button" onClick={() => setFulfilment(item.id)} className={`shrink-0 rounded-xl border px-3 py-2 text-[10px] font-black ${fulfilment === item.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{item.label}</button>)}</section>

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-black">{mode === 'nearby' ? 'Stores near you' : 'All Stores'}</h2><p className="text-[10px] font-semibold text-slate-500">{visibleStores.length} verified stores found</p></div></div>
          {error && <div className="mb-3 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
          {loading ? <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />)}</div> : visibleStores.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><StoreIcon className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-600">No stores found</p><p className="mt-1 text-xs text-slate-400">Search ya category change karke dekhein.</p></div> : <div className="grid gap-3 sm:grid-cols-2">{visibleStores.map((store) => <Link key={store.id} to={`/s/${store.slug}`} state={{ returnTo: '/customer-stores' }} className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition active:scale-[0.99]"><div className="flex gap-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">{store.logo ? <img src={store.logo} alt="" className="h-full w-full object-cover" /> : <StoreIcon className="h-7 w-7 text-slate-400" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-black">{store.name}</h3><p className="truncate text-[9px] font-black uppercase text-orange-500">{store.business_type || 'Local store'}</p></div>{store.distance_km !== undefined && <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700">{store.distance_km} km</span>}</div><p className="mt-2 flex items-center gap-1 truncate text-[10px] font-semibold text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{store.address || 'Local store'}</p><p className="mt-1 text-[10px] font-black text-emerald-600">● Open now</p></div></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"><span className="text-[10px] font-bold text-slate-500">{store.allow_home_delivery ? 'Delivery available' : 'Pickup available'}</span><span className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white">Open Store</span></div></Link>)}</div>}
        </section>
      </div>
      <CustomerAppBottomNav active="stores" />
    </main>
  )
}
