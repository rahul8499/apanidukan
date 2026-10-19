import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store as StoreIcon,
  Truck,
  ShoppingBag,
  ArrowRight
} from 'lucide-react'
import api from '../services/api'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'
import CustomerLocationPrompt from '../components/CustomerLocationPrompt'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import { useCustomerFavorites, FavoriteStoreItem } from '../utils/customerFavorites'
import i18n from '../i18n'

export default function CustomerHome() {
  const [stores, setStores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [radius, setRadius] = useState(10)
  const [customRadius, setCustomRadius] = useState('')
  const [showCustomRadius, setShowCustomRadius] = useState(false)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState('Location select karein')
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const { favorites, isFavorite, toggleFavorite } = useCustomerFavorites()

  async function loadStores(nextLocation: typeof location, nextCategory: string, nextRadius = radius) {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (nextCategory) params.category = nextCategory
      if (nextLocation) {
        params.lat = String(nextLocation.latitude)
        params.lng = String(nextLocation.longitude)
        params.radius_km = String(nextRadius)
      }
      const response = await api.get('/public/stores/', { params })
      setStores(Array.isArray(response.data) ? response.data : response.data.results || [])
    } catch {
      setError('Stores load nahi ho paaye. Please refresh karein.')
    } finally {
      setLoading(false)
    }
  }

  function selectLocation() {
    if (!navigator.geolocation) {
      setError('Is device par location support nahi hai. Nearby stores dikhane ke liye location on karein.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) }
        setLocation(nextLocation)
        localStorage.setItem('customer-location', JSON.stringify(nextLocation))
        setLocationLabel(`Near me: ${radius} km`)
        setLocating(false)
        setShowLocationPrompt(false)
        loadStores(nextLocation, category)
      },
      () => {
        setLocating(false)
        setError('Location permission nahi mili. Browser settings se location allow karke phir try karein.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
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
        setLocationLabel(`Near me: ${initialRadius} km`)
        loadStores(parsed, '', initialRadius)
        return
      } catch {
        localStorage.removeItem('customer-location')
      }
    }
    setLoading(false)
    setShowLocationPrompt(true)
  }, [])

  function chooseRadius(nextRadius: number) {
    setRadius(nextRadius)
    localStorage.setItem('customer-search-radius-km', String(nextRadius))
    setLocationLabel(`Near me: ${nextRadius} km`)
    if (location) loadStores(location, category, nextRadius)
  }

  function applyCustomRadius() {
    const value = Number(customRadius)
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      setError('Custom distance 1 se 100 km ke beech rakhein.')
      return
    }
    chooseRadius(Math.round(value * 10) / 10)
  }

  function chooseCategory(nextCategory: string) {
    setCategory(nextCategory)
    if (location) loadStores(location, nextCategory)
  }

  const visibleStores = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return stores
    return stores.filter((store) => {
      return (
        store.name?.toLowerCase().includes(query) ||
        store.slug?.toLowerCase().includes(query) ||
        store.address?.toLowerCase().includes(query) ||
        store.business_type?.toLowerCase().includes(query)
      )
    })
  }, [search, stores])

  const storePreview = visibleStores.slice(0, 6)

  return (
    <main className="min-h-screen w-full bg-[#f8fafc] pt-16 sm:pt-18 pb-24 text-slate-950">
      <CustomerAppHeader subtitle="Shop near you" showInstall />

      <div className="mx-auto max-w-6xl px-3.5 py-3 sm:px-6 sm:py-4">
        {/* Instant Search Bar */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search local stores, kirana, bakery, clothing, tools..."
            className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 shadow-xs placeholder-slate-400 outline-none ring-2 ring-transparent transition focus:border-orange-400 focus:ring-orange-300"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 hover:bg-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Compact Delivery Location & Mode Bar */}
        <div className="relative mb-3 flex items-center justify-between gap-2 rounded-2xl bg-white p-2 sm:p-2.5 shadow-xs border border-slate-200/80">
          <button
            type="button"
            onClick={selectLocation}
            disabled={locating}
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer hover:opacity-90 transition"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <LocateFixed className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
            </span>
            <div className="min-w-0">
              <span className="block text-[8px] font-black uppercase text-slate-400 leading-none">Deliver to</span>
              <span className="block truncate text-xs font-black text-slate-900 leading-tight">
                {locating ? 'Detecting GPS...' : locationLabel}
              </span>
            </div>
            <span className="text-[10px] font-bold text-orange-600 shrink-0">Change</span>
          </button>

          <div className="flex shrink-0 items-center rounded-xl bg-slate-100 p-0.5 text-[10px] font-black sm:text-[11px]">
            {[2, 5, 10, 20].map((value) => <button key={value} type="button" aria-pressed={radius === value} onClick={() => chooseRadius(value)} className={`rounded-lg px-1.5 py-1.5 transition-all sm:px-2 ${radius === value ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-orange-600'}`}>{value} km</button>)}
            <button type="button" aria-expanded={showCustomRadius} onClick={() => setShowCustomRadius(value => !value)} className={`ml-0.5 rounded-lg px-2 py-1.5 text-[10px] font-black transition-colors ${showCustomRadius ? 'bg-orange-500 text-white' : 'text-orange-600 hover:bg-white'}`}>Custom</button>
          </div>
          {showCustomRadius && <div className="absolute right-2 top-full z-40 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" role="group" aria-label="Set custom search radius"><label htmlFor="home-custom-radius" className="mb-1.5 block text-xs font-black text-slate-800">Custom search distance</label><div className="flex items-center gap-2"><input id="home-custom-radius" autoFocus aria-label="Custom distance in kilometres" type="number" min="1" max="100" step="0.5" inputMode="decimal" value={customRadius} onChange={(event) => setCustomRadius(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyCustomRadius()} placeholder="1–100" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /><span className="text-xs font-bold text-slate-500">km</span><button type="button" onClick={() => { applyCustomRadius(); if (Number(customRadius) >= 1 && Number(customRadius) <= 100) setShowCustomRadius(false) }} className="h-10 rounded-xl bg-slate-900 px-3 text-xs font-black text-white">Apply</button></div><p className="mt-1.5 text-[10px] font-medium text-slate-500">Choose 1–100 km</p></div>}
        </div>

        {/* Compact Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-3.5 sm:p-4 text-white shadow-md shadow-orange-500/15">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15 blur-lg" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Fast Local Delivery & Pickup
              </span>
              <h1 className="mt-1 text-base sm:text-xl font-black tracking-tight text-white">
                Shop Verified Local Stores
              </h1>
              <p className="text-[10px] sm:text-xs font-medium text-orange-100">
                Ghar baithe apne area ki verified dukaanon se direct order karein.
              </p>
            </div>
            <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </span>
          </div>
        </section>

        {/* CATEGORIES SECTION (With Hidden Scrollbar) */}
        <section className="mt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-black text-slate-900 sm:text-base">Shop by Category</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {BUSINESS_TYPES.length + 1} Categories
            </span>
          </div>

          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { id: '', label: 'All categories', icon: '▦' },
              ...BUSINESS_TYPES.map((type) => ({
                id: type.id,
                label: getBusinessTypeTitle(type, i18n.language),
                icon: type.icon
              }))
            ].map((item) => {
              const active = category === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => chooseCategory(item.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer active:scale-95 ${
                    active
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-400/40'
                      : 'border border-slate-200/80 bg-white text-slate-700 shadow-xs hover:border-orange-200 hover:bg-orange-50/40'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* FAVORITE STORES SECTION (QUICK ACCESS CAROUSEL) */}
        {favorites.length > 0 && (
          <section className="mt-6 min-w-0">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                <h2 className="text-sm font-black text-slate-900 sm:text-base">Your Favorite Stores</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">
                  {favorites.length}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Quick Access</span>
            </div>

            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {favorites.map((fav: FavoriteStoreItem) => (
                <Link
                  key={fav.id}
                  to={`/s/${fav.slug}`}
                  state={{ returnTo: '/' }}
                  className="group flex w-60 shrink-0 items-center gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-3 shadow-xs hover:border-amber-400 hover:shadow-md transition-all active:scale-98"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 border border-amber-100 shadow-xs">
                    {fav.logo ? (
                      <img src={fav.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <StoreIcon className="h-6 w-6 text-amber-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="truncate text-xs font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                        {fav.name}
                      </h4>
                      <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />
                    </div>
                    <p className="truncate text-[9px] font-bold uppercase text-amber-700">
                      {fav.business_type || 'Local store'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-black text-orange-600">
                      Visit Store <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* STORES NEAR YOU GRID */}
        <section className="mt-6 min-w-0">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Stores near you
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                {visibleStores.length} stores ready to deliver in your area
              </p>
            </div>
            <Link
              to="/customer-stores"
              className="flex shrink-0 items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-700 transition"
            >
              View nearby ({stores.length}) <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-white shadow-xs" />
              ))}
            </div>
          )}

          {!loading && !error && storePreview.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-xs">
              <StoreIcon className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-700">
                {location ? `Is ${radius} km area me abhi koi store nahi mila.` : 'Location allow karke nearby stores dekhein.'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Radius badhayein ya category filter clear karein.
              </p>
              {!location && (
                <button type="button" onClick={selectLocation}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition cursor-pointer"
                >
                  <LocateFixed className="h-3.5 w-3.5" /> Location on karein
                </button>
              )}
            </div>
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            {storePreview.map((store) => (
              <Link
                key={store.id}
                to={`/s/${store.slug}`}
                state={{ returnTo: '/' }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-orange-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <div>
                  <div className="flex gap-3">
                    {/* Store Logo */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 border border-slate-100 shadow-inner">
                      {store.logo ? (
                        <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-orange-50 to-amber-100 text-orange-600 font-black text-lg">
                          {store.name?.[0]?.toUpperCase() || <StoreIcon className="h-6 w-6" />}
                        </span>
                      )}
                    </div>

                    {/* Store Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-sm sm:text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                              {store.name}
                            </h3>
                            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" title="Verified Store" />
                          </div>
                          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-orange-600">
                            {store.business_type || 'Local Store'}
                          </p>
                        </div>

                        {/* Top Right: Distance & Favorite */}
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
                            <Star className={`h-3.5 w-3.5 ${isFavorite(store.id) ? 'fill-amber-400 text-amber-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Store Address */}
                      <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{store.address || 'Local Verified Merchant'}</span>
                      </p>

                      {/* Open Badge */}
                      <p className="mt-1 text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Open Now · Fast Local Service
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <Truck className="h-3 w-3 text-slate-400" />
                    {store.allow_home_delivery && store.allow_store_pickup !== false
                      ? 'Delivery & Pickup available'
                      : store.allow_home_delivery
                      ? 'Home Delivery available'
                      : 'Store Pickup only'}
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-orange-500 px-3.5 py-1.5 text-xs font-black text-white shadow-xs shadow-orange-500/20 group-hover:bg-orange-600 transition-colors">
                    Visit Store <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <CustomerAppBottomNav active="home" />
      <CustomerLocationPrompt open={showLocationPrompt} loading={locating} onAllow={selectLocation} onClose={() => setShowLocationPrompt(false)} />
    </main>
  )
}
