import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ChevronRight,
  Compass,
  ChevronDown,
  ExternalLink,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Store as StoreIcon,
  Truck,
  X
} from 'lucide-react'
import api from '../services/api'
import CustomerAppBottomNav from '../components/CustomerAppBottomNav'
import CustomerAppHeader from '../components/CustomerAppHeader'
import CustomerLocationPrompt from '../components/CustomerLocationPrompt'
import SellerSplashLoader from '../components/SellerSplashLoader'
import { BUSINESS_TYPES, getBusinessTypeTitle } from '../utils/businessTypes'
import { useCustomerFavorites } from '../utils/customerFavorites'
import { captureAccurateLocation } from '../utils/accurateLocation'
import i18n from '../i18n'

type FulfilmentFilter = 'all' | 'delivery' | 'pickup'

export default function CustomerStores() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [radius, setRadius] = useState(10)
  const [customRadius, setCustomRadius] = useState('')
  const [showCustomRadius, setShowCustomRadius] = useState(false)
  const [fulfilment, setFulfilment] = useState<FulfilmentFilter>('all')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const isInitialLoad = useRef(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [isShowingFallback, setIsShowingFallback] = useState(false)
  const { favorites, isFavorite, toggleFavorite } = useCustomerFavorites()
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  async function resolveLocationLabel(coords: { latitude: number; longitude: number }) {
    try {
      const response = await api.get('/public/reverse-geocode/', {
        params: { lat: coords.latitude, lng: coords.longitude }
      })
      const fullAddress = String(response.data?.display_name || '').trim()
      const area = fullAddress.split(',').map((part: string) => part.trim()).filter(Boolean).slice(0, 2).join(', ')
      if (area) {
        setLocationLabel(area)
        localStorage.setItem('customer-location-label', area)
      }
    } catch {
      // Keep the saved label, if any; coordinates still power nearby store search.
    }
  }

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
      isInitialLoad.current = false
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
        const savedLabel = localStorage.getItem('customer-location-label') || ''
        setLocationLabel(savedLabel)
        if (!savedLabel) resolveLocationLabel(parsed)
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
    if (!navigator.geolocation) {
      setError('Is device par location support nahi hai. Sabhi verified stores dikhaye ja rahe hain.')
      loadStores(null, category, radius)
      return
    }
    setLocating(true)
    setError('')
    captureAccurateLocation().then(({ coords }) => {
        const nextLocation = { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) }
        localStorage.setItem('customer-location', JSON.stringify(nextLocation))
        setLocation(nextLocation)
        setLocationLabel('Current location')
        resolveLocationLabel(nextLocation)
        setLocating(false)
        setShowLocationPrompt(false)
        loadStores(nextLocation, category, radius)
      }).catch((geoError) => {
        console.warn('Geolocation failed or denied:', geoError)
        setLocating(false)
        setShowLocationPrompt(false)
        setError(geoError?.message || 'Location nahi mili. Browser settings mein Location allow karke phir try karein.')
        if (stores.length === 0) {
          loadStores(null, category, radius)
        }
      })
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

  function getStoreMapUrl(targetStore: any) {
    if (targetStore.latitude != null && targetStore.longitude != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${targetStore.latitude},${targetStore.longitude}`
    } else if (targetStore.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targetStore.address)}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetStore.name || 'Store')}`
  }

  function openStoreInGoogleMaps(targetStore: any, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const url = getStoreMapUrl(targetStore)
    window.open(url, '_blank', 'noopener,noreferrer')
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

  const activeFilterCount = Number(onlyFavorites) + Number(fulfilment !== 'all') + Number(!!category) + Number(radius !== 10)

  if (loading && isInitialLoad.current) return <SellerSplashLoader variant="customer" />

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-16 sm:pt-18 pb-24 text-slate-950">
      <CustomerAppHeader subtitle="Explore all stores" />

      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-4">
        {/* Current delivery area, shown above search */}
        <button
          type="button"
          onClick={selectNearby}
          disabled={locating}
          className="mb-1.5 flex min-w-0 items-center gap-2 rounded-lg py-1 text-left disabled:opacity-60"
          aria-label="Detect or change current location"
        >
          <MapPin className="h-4 w-4 shrink-0 fill-orange-500 text-orange-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-500">Delivering near</span>
            <span className="block truncate text-xs font-extrabold text-slate-900">{locating ? 'Detecting your location…' : locationLabel || (location ? 'Current location' : 'Choose your location')}</span>
          </span>
          <span className="shrink-0 text-[10px] font-bold text-orange-600">Change</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>

        {/* Search and filters */}
        <div className="mb-2 flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search store name, area, category..."
              className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-900 shadow-xs outline-none ring-2 ring-transparent transition placeholder:font-medium placeholder:text-slate-400 focus:border-orange-400 focus:ring-orange-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="relative flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs transition hover:border-orange-200 hover:text-orange-600"
            aria-expanded={showFilters}
            aria-label={activeFilterCount ? `Open filters, ${activeFilterCount} active` : 'Open store filters'}
          >
            <Filter className="h-4 w-4 text-orange-600" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-extrabold leading-none text-white">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Compact category rail */}
        <section className="mb-2 min-w-0">
          <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: '', label: 'All', icon: '▦' },
              ...BUSINESS_TYPES.map((type) => ({ id: type.id, label: getBusinessTypeTitle(type, i18n.language), icon: type.icon }))
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCategory(item.id)}
                className={`flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold transition-colors ${category === item.id ? 'border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200'}`}
              >
                <span>{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {showFilters && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" onClick={() => setShowFilters(false)}>
            <section className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="store-filters-title" onClick={(event) => event.stopPropagation()}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 id="store-filters-title" className="text-base font-extrabold text-slate-900">Filters</h2>
                  <p className="text-xs text-slate-500">Stores ko apni zaroorat ke hisaab se chunein</p>
                </div>
                <button type="button" onClick={() => setShowFilters(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600" aria-label="Close filters"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-xs font-bold text-slate-700">Category</h3>
                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                    {[
                      { id: '', label: 'All Categories', icon: '▦' },
                      ...BUSINESS_TYPES.map((type) => ({ id: type.id, label: getBusinessTypeTitle(type, i18n.language), icon: type.icon }))
                    ].map((item) => (
                      <button key={item.id} type="button" onClick={() => selectCategory(item.id)} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${category === item.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600'}`}><span>{item.icon}</span>{item.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold text-slate-700">Distance</h3>
                  <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1">
                    {[2, 5, 10, 20].map((value) => <button key={value} type="button" aria-pressed={radius === value} onClick={() => chooseRadius(value)} className={`h-9 rounded-lg text-xs font-bold ${radius === value ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'}`}>{value} km</button>)}
                    <button type="button" aria-expanded={showCustomRadius} onClick={() => setShowCustomRadius((value) => !value)} className={`h-9 rounded-lg text-[10px] font-bold ${showCustomRadius ? 'bg-orange-500 text-white' : 'text-orange-600'}`}>Custom</button>
                  </div>
                  {showCustomRadius && <div className="mt-2 flex items-center gap-2"><input aria-label="Custom distance in kilometres" type="number" min="1" max="100" step="0.5" inputMode="decimal" value={customRadius} onChange={(event) => setCustomRadius(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyCustomRadius()} placeholder="1–100 km" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-orange-400" /><button type="button" onClick={applyCustomRadius} className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white">Apply</button></div>}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold text-slate-700">Show stores offering</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {([{ id: 'all', label: 'All options' }, { id: 'delivery', label: 'Home delivery' }, { id: 'pickup', label: 'Store pickup' }] as { id: FulfilmentFilter; label: string }[]).map((item) => <button key={item.id} type="button" onClick={() => setFulfilment(item.id)} className={`h-9 rounded-xl border px-2 text-xs font-bold ${fulfilment === item.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>{item.label}</button>)}
                    <button type="button" onClick={() => setOnlyFavorites((value) => !value)} className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold ${onlyFavorites ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}><Star className={`h-3.5 w-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-500' : ''}`} />Favorites{favorites.length > 0 ? ` (${favorites.length})` : ''}</button>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowFilters(false)} className="mt-5 h-11 w-full rounded-xl bg-orange-500 text-sm font-bold text-white shadow-sm shadow-orange-500/20">Show {visibleStores.length} stores</button>
            </section>
          </div>
        )}

        {/* Store Grid */}
        <section className="mt-3 sm:mt-5">
          <div className="mb-2 flex items-end justify-between">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {visibleStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => navigate(`/s/${store.slug}`, { state: { returnTo: '/customer-stores' } })}
                  className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs transition-all hover:border-orange-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] sm:p-4 cursor-pointer"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 border border-slate-100 sm:h-16 sm:w-16 sm:rounded-2xl">
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
                          <div className="flex min-w-0 items-center gap-1">
                            <h3 className="truncate text-sm sm:text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                              {store.name}
                            </h3>
                            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                          </div>
                          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-orange-600">
                            {store.business_type || 'Local store'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 sm:gap-1.5">
                          {store.distance_km !== undefined && (
                            <a
                              href={getStoreMapUrl(store)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Google Maps par route aur distance dekhein"
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:ring-1 hover:ring-orange-300 px-2 py-0.5 text-[9px] font-black text-slate-700 transition active:scale-95 shadow-2xs"
                            >
                              <Navigation className="h-2.5 w-2.5 text-orange-600" />
                              <span>{store.distance_km} km</span>
                            </a>
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
                      {/* Store Address with Clickable Map Link */}
                      <a
                        href={getStoreMapUrl(store)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Google Maps par store dekhein"
                        className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500 hover:text-orange-600 group/addr transition text-left w-full"
                      >
                        <MapPin className="h-3 w-3 shrink-0 text-orange-500 group-hover/addr:scale-110 transition-transform" />
                        <span className="truncate">{store.address || 'Local verified merchant'}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover/addr:opacity-100 text-orange-500 shrink-0 transition-opacity" />
                      </a>
                      <p className="mt-1 text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Open now
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 truncate">
                      <Truck className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {store.allow_home_delivery && store.allow_store_pickup !== false
                          ? 'Delivery & Pickup'
                          : store.allow_home_delivery
                          ? 'Delivery available'
                          : 'Store pickup only'}
                      </span>
                    </span>
                    <div className="flex shrink-0 gap-1.5">
                      <a
                        href={getStoreMapUrl(store)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Google Maps par route aur distance dekhein"
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-700 shadow-2xs transition hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 active:scale-95 cursor-pointer"
                      >
                        <Navigation className="h-3 w-3 text-orange-500" />
                        <span>Map</span>
                      </a>
                      <span className="rounded-lg bg-orange-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-xs shadow-orange-500/20 group-hover:bg-orange-600 transition-colors flex items-center justify-center gap-1 sm:px-3.5 sm:py-2 sm:text-xs">
                        Visit Store <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
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
