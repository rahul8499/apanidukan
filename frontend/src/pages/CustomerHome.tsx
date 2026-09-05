import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LocateFixed, MapPin, Search, ShoppingBag, Store as StoreIcon } from 'lucide-react'
import api from '../services/api'
import NotificationBellHeader from '../components/NotificationBellHeader'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import i18n from '../i18n'

type BrowseMode = 'nearby' | 'all'

export default function CustomerHome() {
  const [stores, setStores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState<BrowseMode>('all')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState('Location select karein')
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
      setError('Stores load nahi ho paaye. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function selectLocation() {
    if (!navigator.geolocation) {
      setError('Location is not supported. All Stores use karein.')
      setMode('all')
      loadStores('all', null, category)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) }
        setLocation(nextLocation)
        localStorage.setItem('customer-location', JSON.stringify(nextLocation))
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
    const saved = localStorage.getItem('customer-location')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLocation(parsed)
        setLocationLabel('Near me: 10 km')
        setMode('nearby')
        loadStores('nearby', parsed, '')
        return
      } catch { localStorage.removeItem('customer-location') }
    }
    loadStores('all', null, '')
  }, [])

  function chooseMode(nextMode: BrowseMode) {
    if (nextMode === 'nearby' && !location) {
      selectLocation()
      return
    }
    setMode(nextMode)
    loadStores(nextMode, nextMode === 'nearby' ? location : null, category)
  }

  function chooseCategory(nextCategory: string) {
    setCategory(nextCategory)
    loadStores(mode, mode === 'nearby' ? location : null, nextCategory)
  }

  const visibleStores = stores.filter((store) => {
    const query = search.trim().toLowerCase()
    return !query || store.name.toLowerCase().includes(query) || store.slug.toLowerCase().includes(query) || (store.address || '').toLowerCase().includes(query)
  })
  const recommendations = visibleStores.slice(0, 4)

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f7f8fc] pb-24 text-slate-950">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/apanidukan1.png" alt="Apani Dukan" className="h-16 w-32 shrink-0 object-contain sm:h-20 sm:w-40" />
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Customer marketplace</p><p className="mt-1 text-xs font-bold text-slate-500">Shop near you</p></div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBellHeader className="text-slate-700" />
            <Link to="/customer-orders" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm" aria-label="My orders"><ShoppingBag className="h-4 w-4" /></Link>
          </div>
        </header>

        <section className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-[#281306] p-2.5 text-white shadow-lg sm:rounded-3xl sm:p-5">
          <div className="mb-2 flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-orange-50">● Fast local</span><h1 className="mt-1.5 text-xl font-black tracking-tight sm:text-4xl">Shop near you</h1><p className="mt-0.5 text-[10px] font-medium text-orange-50 sm:text-sm">Nearby stores, products aur quick delivery.</p></div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><StoreIcon className="h-4 w-4 text-white" /></span></div>
          <div className="rounded-xl bg-white/10 p-1.5"><div className="mb-1.5 flex items-center justify-between px-1"><button onClick={selectLocation} disabled={locating} className="flex items-center gap-1.5 text-left"><LocateFixed className="h-3 w-3 text-teal-300" /><span><span className="block text-[7px] font-black uppercase tracking-wider text-slate-300">Delivery location</span><span className="block text-[10px] font-black">{locating ? 'Detecting...' : locationLabel}</span></span></button><button onClick={selectLocation} className="text-[9px] font-black text-teal-300">Change</button></div><div className="flex rounded-lg bg-slate-950/30 p-0.5 text-[9px] font-black"><button onClick={() => chooseMode('nearby')} className={`flex-1 rounded-md px-2 py-1.5 ${mode === 'nearby' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>⌖ Near me 10 km</button><button onClick={() => chooseMode('all')} className={`flex-1 rounded-md px-2 py-1.5 ${mode === 'all' ? 'bg-white text-slate-900' : 'text-slate-300'}`}>⊙ All Stores</button></div></div>
        </section>

        <section className="mt-4"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black">Categories</h2><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Swipe for more</span></div><div className="flex gap-2 overflow-x-auto pb-1">{[{ id: '', label: 'All categories', icon: '▦' }, ...BUSINESS_TYPES.map((type) => ({ id: type.id, label: getBusinessTypeTitle(type, i18n.language), icon: type.icon }))].map((item) => <button key={item.id} onClick={() => chooseCategory(item.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black ${category === item.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 shadow-sm'}`}>{item.icon} {item.label}</button>)}</div></section>

        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"><label className="mb-2 block text-xs font-black text-slate-700">Search stores</label><div className="relative"><Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stores, products or category" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white" /></div></section>

        <section className="mt-6 min-w-0 overflow-hidden"><div className="mb-3 flex items-end justify-between gap-2"><div className="min-w-0"><h2 className="text-lg font-black">Stores near you</h2><p className="text-[10px] font-semibold text-slate-500">Verified neighbourhood merchants</p></div><button onClick={() => chooseMode('all')} className="flex shrink-0 items-center gap-1 text-[10px] font-black text-blue-600">View all ({visibleStores.length}) <ChevronRight className="h-3 w-3" /></button></div>{error && <p className="mb-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}{loading && <p className="py-8 text-center text-xs font-bold text-slate-500">Stores load ho rahe hain...</p>}{!loading && !error && visibleStores.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-bold text-slate-500">Is selection me store nahi mila.</div>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleStores.map((store) => <Link key={store.id} to={`/s/${store.slug}`} className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex min-w-0 gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{store.logo ? <img src={store.logo} alt="" className="h-full w-full object-cover" /> : <StoreIcon className="h-6 w-6 text-slate-400" />}</div><div className="min-w-0 flex-1"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-black">{store.name}</h3><p className="truncate text-[10px] font-bold uppercase text-slate-500">{store.business_type || 'Local store'}</p></div>{store.distance_km !== undefined && <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-[9px] font-black text-blue-700">{store.distance_km} km</span>}</div><p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-slate-500"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{store.address || 'Local store'}</span></p><p className="mt-2 truncate text-[10px] font-black text-emerald-600">● Open now · Fast local delivery</p></div></div><div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-2"><span className="min-w-0 truncate text-[10px] font-bold text-slate-500">{store.allow_home_delivery ? 'Free delivery options' : 'Store pickup available'}</span><span className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white">Visit Store →</span></div></Link>)}</div></section>

        <section className="mt-6 min-w-0 overflow-hidden"><div className="mb-3 flex items-end justify-between gap-2"><div className="min-w-0"><h2 className="text-lg font-black">Recommended for you</h2><p className="truncate text-[10px] font-semibold text-slate-500">Daily essentials from nearby stores</p></div><span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700">Top picks</span></div><div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">{recommendations.map((store) => <Link key={`recommend-${store.id}`} to={`/s/${store.slug}`} className="min-w-0 overflow-hidden rounded-2xl bg-white p-3 shadow-sm"><div className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{store.logo ? <img src={store.logo} alt="" className="h-full w-full object-cover" /> : <StoreIcon className="h-8 w-8 text-slate-400" />}</div><p className="mt-2 truncate text-[9px] font-black uppercase text-slate-500">{store.business_type || 'Local store'}</p><h3 className="mt-1 truncate text-xs font-black">{store.name}</h3><p className="mt-2 truncate text-[10px] font-black text-blue-600">Open store +</p></Link>)}</div></section>

      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur"><div className="mx-auto flex max-w-2xl items-center justify-around gap-1"><span className="flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[12px] font-black text-blue-600">⌂<span>Home</span></span><button onClick={() => chooseMode('all')} className="flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[12px] font-bold text-slate-500">▦<span>Stores</span></button><Link to="/customer-orders" className="flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[12px] font-bold text-slate-500">▤<span>Orders</span></Link><Link to="/customer-orders" className="flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[12px] font-bold text-slate-500">◎<span>Account</span></Link></div></nav>
    </main>
  )
}
