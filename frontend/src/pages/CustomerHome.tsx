import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LocateFixed, MapPin, Star, Store as StoreIcon } from 'lucide-react'
import api from '../services/api'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import { useCustomerFavorites, FavoriteStoreItem } from '../utils/customerFavorites'
import i18n from '../i18n'

type BrowseMode = 'nearby' | 'all'

export default function CustomerHome() {
  const [stores, setStores] = useState<any[]>([])
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState<BrowseMode>('all')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState('Location select karein')
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const { favorites, isFavorite, toggleFavorite } = useCustomerFavorites()

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

  const storePreview = stores.slice(0, 4)

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f7f8fc] pb-24 text-slate-950">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-6">
        <CustomerAppHeader subtitle="Shop near you" />

        <section className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-[#281306] p-2.5 text-white shadow-lg sm:rounded-3xl sm:p-5">
          <div className="mb-2 flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-orange-50">● Fast local</span><h1 className="mt-1.5 text-xl font-black tracking-tight sm:text-4xl">Shop near you</h1><p className="mt-0.5 text-[10px] font-medium text-orange-50 sm:text-sm">Nearby stores, products aur quick delivery.</p></div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><StoreIcon className="h-4 w-4 text-white" /></span></div>
          <div className="rounded-xl bg-white/10 p-1.5"><div className="mb-1.5 flex items-center justify-between px-1"><button onClick={selectLocation} disabled={locating} className="flex items-center gap-1.5 text-left"><LocateFixed className="h-3 w-3 text-teal-300" /><span><span className="block text-[7px] font-black uppercase tracking-wider text-slate-300">Delivery location</span><span className="block text-[10px] font-black">{locating ? 'Detecting...' : locationLabel}</span></span></button><button onClick={selectLocation} className="text-[9px] font-black text-teal-300">Change</button></div><div className="flex rounded-lg bg-slate-950/30 p-0.5 text-[9px] font-black"><button onClick={() => chooseMode('nearby')} className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 ${mode === 'nearby' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}><LocateFixed className="h-3 w-3" /> Near me 10 km</button><button onClick={() => chooseMode('all')} className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 ${mode === 'all' ? 'bg-white text-slate-900' : 'text-slate-300'}`}><StoreIcon className="h-3 w-3" /> All Stores</button></div></div>
        </section>

        <section className="mt-4"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black">Categories</h2><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Swipe for more</span></div><div className="flex gap-2 overflow-x-auto pb-1">{[{ id: '', label: 'All categories', icon: '▦' }, ...BUSINESS_TYPES.map((type) => ({ id: type.id, label: getBusinessTypeTitle(type, i18n.language), icon: type.icon }))].map((item) => <button key={item.id} onClick={() => chooseCategory(item.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black ${category === item.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 shadow-sm'}`}>{item.icon} {item.label}</button>)}</div></section>

        {/* Favorite Stores Section if any */}
        {favorites.length > 0 && (
          <section className="mt-5 min-w-0">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                <h2 className="text-sm font-black text-slate-900 sm:text-base">Favorite Stores</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">
                  {favorites.length}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Quick Access</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {favorites.map((fav: FavoriteStoreItem) => (
                <Link
                  key={fav.id}
                  to={`/s/${fav.slug}`}
                  state={{ returnTo: '/customer-home' }}
                  className="flex w-52 shrink-0 items-center gap-2.5 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white to-amber-50/40 p-2.5 shadow-xs hover:border-amber-400 hover:shadow-md transition"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 border border-amber-100">
                    {fav.logo ? (
                      <img src={fav.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <StoreIcon className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-black text-slate-900">{fav.name}</h4>
                    <p className="truncate text-[9px] font-bold text-amber-700">
                      {fav.business_type || 'Local store'}
                    </p>
                    <p className="mt-0.5 text-[9px] font-black text-blue-600">Visit Store →</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 min-w-0 overflow-hidden">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-black">Stores near you</h2>
              <p className="text-[10px] font-semibold text-slate-500">A quick preview of nearby merchants</p>
            </div>
            <Link to="/customer-stores" className="flex shrink-0 items-center gap-1 text-[10px] font-black text-blue-600">
              Explore all ({stores.length}) <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {error && <p className="mb-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
          {loading && <p className="py-8 text-center text-xs font-bold text-slate-500">Stores load ho rahe hain...</p>}
          {!loading && !error && storePreview.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-bold text-slate-500">
              Is selection me store nahi mila.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {storePreview.map((store) => (
              <Link
                key={store.id}
                to={`/s/${store.slug}`}
                state={{ returnTo: '/customer-home' }}
                className="group min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                    {store.logo ? (
                      <img src={store.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <StoreIcon className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black">{store.name}</h3>
                        <p className="truncate text-[10px] font-bold uppercase text-slate-500">{store.business_type || 'Local store'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {store.distance_km !== undefined && (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black text-blue-700">
                            {store.distance_km} km
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(store)
                          }}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${
                            isFavorite(store.id)
                              ? 'bg-amber-50 text-amber-500 ring-1 ring-amber-200'
                              : 'bg-slate-100/70 text-slate-400 hover:bg-amber-50 hover:text-amber-500'
                          }`}
                          title={isFavorite(store.id) ? 'Favorites se hatayein' : 'Favorites me jodein'}
                          aria-label="Toggle favorite"
                        >
                          <Star className={`h-3.5 w-3.5 ${isFavorite(store.id) ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{store.address || 'Local store'}</span>
                    </p>
                    <p className="mt-2 truncate text-[10px] font-black text-emerald-600">● Open now · Fast local delivery</p>
                  </div>
                </div>
                <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-2">
                  <span className="min-w-0 truncate text-[10px] font-bold text-slate-500">
                    {store.allow_home_delivery ? 'Delivery available' : 'Store pickup available'}
                  </span>
                  <span className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white group-hover:bg-blue-700 transition-colors">
                    Visit Store →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>

      <CustomerAppBottomNav active="home" />
    </main>
  )
}
