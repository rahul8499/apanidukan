import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Store as StoreIcon,
  Truck
} from 'lucide-react'
import api from '../services/api'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import { useCustomerFavorites } from '../utils/customerFavorites'
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
  const { favorites, isFavorite, toggleFavorite } = useCustomerFavorites()
  const [onlyFavorites, setOnlyFavorites] = useState(false)

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
      setError('Location support nahi mila. All Stores mode use karein.')
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
    return stores.filter((store) => {
      const matchesQuery =
        !query ||
        store.name?.toLowerCase().includes(query) ||
        store.slug?.toLowerCase().includes(query) ||
        store.address?.toLowerCase().includes(query) ||
        store.business_type?.toLowerCase().includes(query)
      const matchesFulfilment =
        fulfilment === 'all' ||
        (fulfilment === 'delivery' && store.allow_home_delivery !== false) ||
        (fulfilment === 'pickup' && store.allow_store_pickup !== false)
      const matchesFavorites = !onlyFavorites || isFavorite(store.id)
      return matchesQuery && matchesFulfilment && matchesFavorites
    })
  }, [fulfilment, search, stores, onlyFavorites, isFavorite])

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-16 sm:pt-18 pb-24 text-slate-950">
      <CustomerAppHeader subtitle="Explore all stores" />

      <div className="mx-auto max-w-6xl px-3.5 py-3 sm:px-6 sm:py-4">
        {/* Instant Search Bar */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search store name, area, category..."
            className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-xs font-bold text-slate-900 shadow-xs outline-none ring-2 ring-transparent transition focus:border-orange-400 focus:ring-orange-300"
          />
        </div>

        {/* Location mode switcher */}
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-xs border border-slate-200/80">
          <button
            type="button"
            onClick={selectNearby}
            disabled={locating}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
              mode === 'nearby'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? 'Locating...' : 'Near me (10 km)'}
          </button>
          <button
            type="button"
            onClick={selectAll}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
              mode === 'all'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <StoreIcon className="h-4 w-4" />
            All Stores
          </button>
        </div>

        {/* Categories Bar */}
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Categories</h2>
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { id: '', label: 'All Categories', icon: '▦' },
              ...BUSINESS_TYPES.map((type) => ({
                id: type.id,
                label: getBusinessTypeTitle(type, i18n.language),
                icon: type.icon
              }))
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCategory(item.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer active:scale-95 ${
                  category === item.id
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
                    : 'border border-slate-200/80 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/40'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Options & Favorites Filter */}
        <section className="mt-3 flex gap-2 overflow-x-auto pb-1 items-center">
          <button
            type="button"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-all cursor-pointer ${
              onlyFavorites
                ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                : 'border-slate-200/80 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-600'
            }`}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                onlyFavorites
                  ? 'fill-white text-white'
                  : favorites.length > 0
                  ? 'fill-amber-400 text-amber-500'
                  : 'text-slate-400'
              }`}
            />
            <span>Favorites</span>
            {favorites.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                  onlyFavorites ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {favorites.length}
              </span>
            )}
          </button>

          {(
            [
              { id: 'all', label: 'All Options' },
              { id: 'delivery', label: 'Home Delivery' },
              { id: 'pickup', label: 'Store Pickup' }
            ] as { id: FulfilmentFilter; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFulfilment(item.id)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black transition-all cursor-pointer ${
                fulfilment === item.id
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        {/* Store Grid */}
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                {onlyFavorites
                  ? 'Favorite Stores'
                  : mode === 'nearby'
                  ? 'Stores Near You'
                  : 'All Stores'}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                {visibleStores.length} verified stores found
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-32 animate-pulse rounded-2xl bg-white shadow-xs" />
              ))}
            </div>
          ) : visibleStores.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-xs">
              <StoreIcon className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-700">
                {onlyFavorites ? 'Koi favorite store nahi mila' : 'No stores found'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {onlyFavorites
                  ? 'Kisi store card par star icon dabakar favorite karein.'
                  : 'Search ya category change karke dekhein.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/s/${store.slug}`}
                  state={{ returnTo: '/customer-stores' }}
                  className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-orange-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <div className="flex gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 border border-slate-100">
                      {store.logo ? (
                        <img src={store.logo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-orange-50 to-amber-100 text-orange-600 font-black text-lg">
                          {store.name?.[0]?.toUpperCase() || <StoreIcon className="h-7 w-7" />}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="truncate text-sm sm:text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                              {store.name}
                            </h3>
                            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                          </div>
                          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-orange-600">
                            {store.business_type || 'Local store'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {store.distance_km !== undefined && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-700">
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
                            className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all cursor-pointer ${
                              isFavorite(store.id)
                                ? 'bg-amber-50 text-amber-500 ring-1 ring-amber-200'
                                : 'bg-slate-100/80 text-slate-400 hover:bg-amber-50 hover:text-amber-500'
                            }`}
                            title={isFavorite(store.id) ? 'Favorites se hatayein' : 'Favorites me jodein'}
                            aria-label="Toggle favorite"
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                isFavorite(store.id) ? 'fill-amber-400 text-amber-500' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{store.address || 'Local verified merchant'}</span>
                      </p>
                      <p className="mt-1 text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Open now
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Truck className="h-3 w-3 text-slate-400" />
                      {store.allow_home_delivery && store.allow_store_pickup !== false
                        ? 'Delivery & Pickup available'
                        : store.allow_home_delivery
                        ? 'Delivery available'
                        : 'Store pickup available'}
                    </span>
                    <span className="rounded-xl bg-orange-500 px-3.5 py-1.5 text-xs font-black text-white shadow-xs shadow-orange-500/20 group-hover:bg-orange-600 transition-colors flex items-center gap-1">
                      Visit Store <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <CustomerAppBottomNav active="stores" />
    </main>
  )
}
