import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ChevronRight,
  Compass,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Store as StoreIcon,
  Truck
} from 'lucide-react'
import api from '../services/api'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'
import CustomerLocationPrompt from '../components/CustomerLocationPrompt'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import { useCustomerFavorites } from '../utils/customerFavorites'
import i18n from '../i18n'

type FulfilmentFilter = 'all' | 'delivery' | 'pickup'

export default function CustomerStores() {
  const [stores, setStores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [radius, setRadius] = useState(10)
  const [customRadius, setCustomRadius] = useState('')
  const [showCustomRadius, setShowCustomRadius] = useState(false)
  const [fulfilment, setFulfilment] = useState<FulfilmentFilter>('all')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [isShowingFallback, setIsShowingFallback] = useState(false)
  const { favorites, isFavorite, toggleFavorite } = useCustomerFavorites()
  const [onlyFavorites, setOnlyFavorites] = useState(false)

  async function loadStores(
    nextLocation: typeof location,
    nextCategory: string,
    nextRadius = radius,
    allowProximityFallback = true
  ) {
    setLoading(true)
    setError('')
    setIsShowingFallback(false)
    try {
      const params: Record<string, string> = {}
      if (nextCategory) params.category = nextCategory
      if (nextLocation) {
        params.lat = String(nextLocation.latitude)
        params.lng = String(nextLocation.longitude)
        params.radius_km = String(nextRadius)
      }
      const response = await api.get('/public/stores/', { params })
      const list = Array.isArray(response.data) ? response.data : response.data.results || []

      // If customer has location and 0 stores are found within radius, fallback to show platform stores
      if (list.length === 0 && nextLocation && allowProximityFallback) {
        try {
          const fallbackRes = await api.get('/public/stores/', {
            params: {
              ...(nextCategory ? { category: nextCategory } : {}),
              lat: String(nextLocation.latitude),
              lng: String(nextLocation.longitude),
              all: '1'
            }
          })
          const fallbackList = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data.results || []
          if (fallbackList.length > 0) {
            setStores(fallbackList)
            setIsShowingFallback(true)
            return
          }
        } catch {
          // If fallback query fails, retain list as empty
        }
      }

      setStores(list)
    } catch {
      setError('Stores load nahi ho paaye. Internet connection check karke dobara retry karein.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const storedRadius = Number(localStorage.getItem('customer-search-radius-km'))
    const initialRadius = Number.isFinite(storedRadius) && storedRadius >= 1 && storedRadius <= 100 ? storedRadius : 10
    if (initialRadius !== 10) setRadius(initialRadius)
    const saved = localStorage.getItem('customer-location')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLocation(parsed)
        loadStores(parsed, '', initialRadius)
        return
      } catch {
        localStorage.removeItem('customer-location')
      }
    }
    // First-time or unlocated visitor: load all platform stores immediately so page is never blank
    loadStores(null, '', initialRadius)
    setShowLocationPrompt(true)
  }, [])

  function selectNearby() {
    if (location) {
      loadStores(location, category, radius)
      return
    }
    if (!navigator.geolocation) {
      setError('Is device par location support nahi hai. Sabhi verified stores dikhaye ja rahe hain.')
      loadStores(null, category, radius)
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) }
        localStorage.setItem('customer-location', JSON.stringify(nextLocation))
        setLocation(nextLocation)
        setLocating(false)
        setShowLocationPrompt(false)
        loadStores(nextLocation, category, radius)
      },
      (geoError) => {
        console.warn('Geolocation failed or denied:', geoError)
        setLocating(false)
        setShowLocationPrompt(false)
        if (stores.length === 0) {
          loadStores(null, category, radius)
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  function chooseRadius(nextRadius: number) {
    setRadius(nextRadius)
    localStorage.setItem('customer-search-radius-km', String(nextRadius))
    if (location) {
      loadStores(location, category, nextRadius)
    } else {
      selectNearby()
    }
  }

  function applyCustomRadius() {
    const value = Number(customRadius)
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      setError('Custom distance 1 se 100 km ke beech rakhein.')
      return
    }
    chooseRadius(Math.round(value * 10) / 10)
    setShowCustomRadius(false)
  }

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory)
    loadStores(location, nextCategory, radius)
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

        {/* Nearby distance selector */}
        <div className="relative mb-3 rounded-2xl bg-white p-1.5 shadow-xs border border-slate-200/80">
          <button
            type="button"
            onClick={selectNearby}
            disabled={locating}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black text-orange-600 hover:bg-orange-50"
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? 'Locating...' : 'Change location'}
          </button>
          <div className="relative mt-1 flex items-center gap-1 rounded-xl bg-slate-100 p-0.5">
            {[2, 5, 10, 20].map((value) => <button key={value} type="button" aria-pressed={radius === value} onClick={() => chooseRadius(value)} className={`min-w-0 flex-1 rounded-lg px-1 py-1.5 text-[10px] font-black transition sm:text-[11px] ${radius === value ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-orange-600'}`}>{value} km</button>)}
            <button type="button" aria-expanded={showCustomRadius} onClick={() => setShowCustomRadius(value => !value)} className={`shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-black transition-colors ${showCustomRadius ? 'bg-orange-500 text-white' : 'text-orange-600 hover:bg-white'}`}>Custom</button>
            {showCustomRadius && <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" role="group" aria-label="Set custom search radius"><label htmlFor="stores-custom-radius" className="mb-1.5 block text-xs font-black text-slate-800">Custom search distance</label><div className="flex items-center gap-2"><input id="stores-custom-radius" autoFocus aria-label="Custom distance in kilometres" type="number" min="1" max="100" step="0.5" inputMode="decimal" value={customRadius} onChange={(event) => setCustomRadius(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyCustomRadius()} placeholder="1–100" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /><span className="text-xs font-bold text-slate-500">km</span><button type="button" onClick={() => { applyCustomRadius(); if (Number(customRadius) >= 1 && Number(customRadius) <= 100) setShowCustomRadius(false) }} className="h-10 rounded-xl bg-slate-900 px-3 text-xs font-black text-white">Apply</button></div><p className="mt-1.5 text-[10px] font-medium text-slate-500">Choose 1–100 km</p></div>}
          </div>
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
                  : 'Stores Near You'}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                {visibleStores.length} verified stores found
              </p>
            </div>
          </div>

          {isShowingFallback && (
            <div className="mb-4 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/50 p-3.5 sm:p-4 text-xs shadow-xs">
              <div className="flex items-start gap-2.5">
                <Compass className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-amber-950">
                    Aapke {radius} km ke daayre me abhi koi store nahi mila.
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-amber-800/90">
                    Platform ke verified stores dikhaye ja rahe hain (Delivery & Pickup options ke saath).
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Radius badhayein:</span>
                    {[20, 50, 100].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => chooseRadius(r)}
                        className="rounded-lg border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-black text-amber-900 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
                      >
                        +{r} km
                      </button>
                    ))}
                    {category && (
                      <button
                        type="button"
                        onClick={() => selectCategory('')}
                        className="rounded-lg bg-amber-200/70 px-2 py-0.5 text-[10px] font-black text-amber-950 hover:bg-amber-300 transition active:scale-95 cursor-pointer"
                      >
                        Clear category filter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-800">{error}</p>
                    <p className="mt-0.5 text-[11px] text-rose-600">Internet connection check karein ya Dobara try karein.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => loadStores(location, category, radius)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-700 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-4">
              <div className="mb-5 flex flex-col items-center justify-center rounded-3xl border border-orange-100 bg-white/95 p-6 text-center shadow-xs backdrop-blur-sm">
                <div className="relative flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-3 border-orange-200 border-t-orange-500 animate-spin" />
                  <StoreIcon className="absolute h-5 w-5 text-orange-500" />
                </div>
                <p className="mt-3 text-xs sm:text-sm font-black text-slate-800">
                  {locating ? 'Aapki location detect ho rahi hai...' : 'Verified dukaanein khoji jaa rahi hain...'}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  Apani Dukan · Local trusted merchants & fast delivery
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs animate-pulse"
                  >
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-200/80" />
                      <div className="min-w-0 flex-1 space-y-2 py-0.5">
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-32 rounded-md bg-slate-200/80" />
                          <div className="h-4 w-10 rounded-full bg-slate-200/60" />
                        </div>
                        <div className="h-2.5 w-20 rounded-md bg-slate-200/60" />
                        <div className="h-3 w-40 rounded-md bg-slate-200/60" />
                      </div>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <div className="h-3 w-28 rounded-md bg-slate-200/60" />
                      <div className="h-6 w-20 rounded-xl bg-slate-200/80" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : visibleStores.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 sm:p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <StoreIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-3.5 text-base font-black text-slate-800">
                {onlyFavorites
                  ? 'Koi favorite store nahi mila'
                  : search
                  ? `"${search}" ke liye koi store nahi mila`
                  : category
                  ? 'Is category me abhi koi store nahi mila'
                  : location
                  ? `Is ${radius} km area me abhi koi store nahi mila`
                  : 'Abhi koi verified store uplabdh nahi hai'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {onlyFavorites
                  ? 'Kisi store card par star icon dabakar favorite karein.'
                  : search || category || fulfilment !== 'all'
                  ? 'Filters ya search clear karke sabhi stores dekhein.'
                  : 'Radius badhayein ya sabhi platform stores explore karein.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {(search || category || fulfilment !== 'all' || onlyFavorites) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setCategory('')
                      setFulfilment('all')
                      setOnlyFavorites(false)
                      loadStores(location, '', radius)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    Filters Clear Karein
                  </button>
                )}

                {location && (
                  <button
                    type="button"
                    onClick={() => loadStores(null, category, radius)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Compass className="h-3.5 w-3.5 text-orange-500" /> Sabhi Stores Dekhein
                  </button>
                )}

                {!location && (
                  <button
                    type="button"
                    onClick={selectNearby}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <LocateFixed className="h-3.5 w-3.5" /> Location On Karein
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => loadStores(location, category, radius)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Refresh
                </button>
              </div>
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
      <CustomerLocationPrompt open={showLocationPrompt} loading={locating} onAllow={selectNearby} onClose={() => setShowLocationPrompt(false)} />
    </main>
  )
}
