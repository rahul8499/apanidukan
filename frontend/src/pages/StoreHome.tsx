import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import InstallAppButton from '../pwa/InstallAppButton'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import AiAssistantWidget from '../components/AiAssistantWidget'
import AiSearchModal from '../components/AiSearchModal'
import { useNotifications } from '../context/NotificationContext'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function StoreHome() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return <StoreCartProvider storeSlug={storeSlug}><Storefront /></StoreCartProvider>
}

function Storefront() {
  const { storeSlug } = useParams()
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestPhone, setRequestPhone] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [aiSearchOpen, setAiSearchOpen] = useState(false)
  const [aiSearchProducts, setAiSearchProducts] = useState<any[] | null>(null)
  const [aiSearchQuery, setAiSearchQuery] = useState('')

  function playCustomerChime() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch { }
  }

  useEffect(() => {
    if (!storeSlug) return
    api.get(`/public/stores/${storeSlug}/`).then(res => {
      const data = res.data.data || res.data
      setStore(data)
    }).catch((error) => {
      setLoadError(error?.response?.status === 404 ? 'This store is not live yet. Please ask the seller to publish it first.' : 'Store could not be opened. Please try again.')
    })
    api.get(`/public/stores/${storeSlug}/products/`).then(res => setProducts(res.data)).catch(() => { })
    api.get(`/public/stores/${storeSlug}/categories/`).then(res => setCategories(res.data)).catch(() => { })
  }, [storeSlug])

  // Customer Real-Time Notification Center State
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; time: string; read: boolean; action?: () => void }[]>([
    {
      id: 'welcome',
      title: '🔔 Store Notifications Active',
      body: `Welcome to store! You will receive real-time alerts for new arrivals, offers & chat replies.`,
      time: 'Just now',
      read: false
    }
  ])
  const [showNotifPopup, setShowNotifPopup] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  async function requestCustomerNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotificationPermission(perm)
      if (perm === 'granted') {
        new Notification('🔔 Notifications Enabled!', {
          body: `You will get real-time alerts for new products & seller chat replies.`,
          icon: '/icons/multistore-icon.svg'
        })
      }
    }
  }

  function testCustomerPushNotification() {
    playCustomerChime()
    const testNotif = {
      id: String(Date.now()),
      title: '🎁 Test Store Offer Notification!',
      body: 'Special Discount: Get 15% OFF on all new arrivals today!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }
    setNotifications(prev => [testNotif, ...prev])
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(testNotif.title, {
        body: testNotif.body,
        icon: '/icons/multistore-icon.svg'
      })
    } else {
      requestCustomerNotificationPermission()
    }
  }

  const { addNotification } = useNotifications()

  // Real-time WebSocket connection for New Product / Offer Arrival notifications
  useEffect(() => {
    if (!store?.id) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/store/${store.id}/`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_product_added' && data.product) {
            playCustomerChime()
            api.get(`/public/stores/${storeSlug}/products/`).then(res => setProducts(res.data)).catch(() => { })
            addNotification({
              type: 'product',
              title: `🎁 New Arrival: ${data.product.name}`,
              body: `Now available in store for ₹${data.product.price}!`,
              link: `/store/${storeSlug}/product/${data.product.slug}`
            })
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(`🎁 New Arrival in Store!`, {
                    body: `${data.product.name} is now available for ₹${data.product.price}!`,
                    icon: '/icons/multistore-icon.svg',
                    badge: '/icons/multistore-icon.svg',
                    vibrate: [150, 100, 150]
                  } as any)
                }).catch(() => {
                  new Notification(`🎁 New Arrival in Store!`, { body: `${data.product.name} - ₹${data.product.price}`, icon: '/icons/multistore-icon.svg' })
                })
              } else {
                new Notification(`🎁 New Arrival in Store!`, { body: `${data.product.name} - ₹${data.product.price}`, icon: '/icons/multistore-icon.svg' })
              }
            }
          }
        } catch { }
      }
    } catch { }
    return () => { socket?.close() }
  }, [store?.id, storeSlug, addNotification])

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = searchTerm.trim()
      if (term.length >= 2 && storeSlug) {
        api.post(`/public/stores/${storeSlug}/record-search/`, { query: term }).catch(() => { })
      }
    }, 1000)
    return () => clearTimeout(handler)
  }, [searchTerm, storeSlug])

  const visibleProducts = aiSearchProducts || (activeCategory ? products.filter(p => p.category?.slug === activeCategory) : products).filter(p => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return [p.name, p.description, p.short_description, p.category?.name].filter(Boolean).join(' ').toLowerCase().includes(q)
  })
  const mediaUrl = (url: string) => url?.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`
  const cart = useStoreCart()

  const submitProductRequest = async () => {
    const trimmedName = requestName.trim()
    const trimmedPhone = requestPhone.trim()
    const requestedItem = searchTerm.trim() || 'Product'

    if (!trimmedName || !trimmedPhone) {
      alert('Please enter your name and phone number before sending the request.')
      return
    }

    const sellerNumber = String(store?.phone_number || '').replace(/\D/g, '')

    try {
      let sid = localStorage.getItem(`qs_chat_session_${storeSlug}`)
      if (!sid) {
        sid = 'cust_' + Math.random().toString(36).substring(2, 11)
        localStorage.setItem(`qs_chat_session_${storeSlug}`, sid)
      }

      await api.post(`/public/stores/${storeSlug}/chat/auto-reply/`, {
        session_id: sid,
        product_name: requestedItem,
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        message: requestMessage.trim() || 'Hello, I want to request this product.'
      })
    } catch (err) {
      console.error('Failed to send auto-reply', err)
    }

    if (!sellerNumber) {
      alert('This seller has not added a WhatsApp number yet. Please contact them directly.')
      setRequestOpen(false)
      setRequestName('')
      setRequestPhone('')
      setRequestMessage('')
      return
    }

    const text = `Hello ${store?.name || 'Seller'}, I want to request this product: ${requestedItem}. My name is ${trimmedName}. My phone number is ${trimmedPhone}. ${requestMessage.trim() ? `Message: ${requestMessage.trim()}` : ''}`
    window.open(`https://wa.me/${sellerNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')

    setRequestOpen(false)
    setRequestName('')
    setRequestPhone('')
    setRequestMessage('')
    setSearchTerm(requestedItem)
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-32 lg:max-w-none lg:w-full">
      {!store ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-white shadow-2xl border border-slate-800 space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mx-auto text-2xl">
              🏪
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">Store Temporarily Offline</h2>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {loadError || 'Dukaan filhal temporary maintenance & stock update ke liye offline hai. Naye orders pause hain.'}
              </p>
            </div>

            {/* Reassurance Alert Box */}
            <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-3.5 text-left text-xs text-emerald-200 space-y-1">
              <p className="font-black text-emerald-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Pehle se kiye gaye Orders Safe Hain!</span>
              </p>
              <p className="text-[11px] text-emerald-200/90 leading-snug">
                Agar aapne is store par order diya hai, toh seller dwara aapka order normally process ho raha hai.
              </p>
            </div>

            <Link
              to="/orders/track"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-500 transition-all shadow-md"
            >
              <span>🔍 Track Existing Order</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <header className="flex items-center gap-3 bg-slate-950 px-5 py-5 text-white">
          {store.logo ? <img src={mediaUrl(store.logo)} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold">{store.name[0]?.toUpperCase()}</span>}
          <div className="min-w-0"><h1 className="truncate text-xl font-bold">{store.name}</h1><p className="truncate text-xs text-slate-300">{store.description || 'Online Store'}</p></div>
          <div className="ml-auto flex items-center gap-2">
            <InstallAppButton storeSlug={storeSlug} />
          </div>
        </header>


        <main className="p-4">
          <section className="rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-cyan-100">Welcome to {store.name}</p><h2 className="mt-2 text-2xl font-bold leading-tight">Shop digital products made for you</h2><p className="mt-2 text-sm text-blue-50">Easy order, quick access, and secure digital downloads.</p><a href="#products" className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700">Start shopping →</a>
          </section>
          <section className="mt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input value={searchTerm} onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (aiSearchProducts) setAiSearchProducts(null); // Clear AI search if user types normally
                }} placeholder="Search products, categories..." className="premium-input pl-10" />
              </div>
              <button
                onClick={() => setAiSearchOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 font-bold text-white shadow hover:opacity-90"
              >
                ✨ AI
              </button>
            </div>
            {aiSearchProducts && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
                <span>Showing AI results for: <strong>"{aiSearchQuery}"</strong></span>
                <button onClick={() => setAiSearchProducts(null)} className="font-bold underline">Clear</button>
              </div>
            )}
          </section>
          <section className="mt-6"><h2 className="text-xl font-bold text-slate-900">Explore Categories</h2><div className="mt-3 flex gap-2 overflow-x-auto pb-1"><button onClick={() => setActiveCategory('')} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ${!activeCategory ? 'bg-indigo-600 text-white shadow' : 'border bg-white text-slate-700'}`}>All</button>{categories.map(c => <button key={c.id} onClick={() => setActiveCategory(c.slug)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ${activeCategory === c.slug ? 'bg-indigo-600 text-white shadow' : 'border bg-white text-slate-700'}`}>{c.name}</button>)}</div></section>
          <section id="products" className="mt-7">
            <h2 className="text-xl font-bold text-slate-900">Store Highlights</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {visibleProducts.map(p => {
                const isOutOfStock = p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) <= 0
                return (
                  <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                    <Link to={`/store/${storeSlug}/product/${p.slug}`}>
                      <div className="flex h-36 items-center justify-center bg-slate-50 relative overflow-hidden">
                        {p.image ? <img src={mediaUrl(p.image)} alt={p.name} className="h-full w-full object-cover" /> : <span className="text-4xl">🛍️</span>}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                            <span className="bg-rose-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full shadow tracking-wider">Out of Stock</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 pb-1">
                        <h3 className="truncate font-semibold text-slate-900">{p.name}</h3>
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-bold text-indigo-700">₹{p.price}</p>
                          {p.stock_quantity !== undefined && p.stock_quantity !== null && Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= 10 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Only {p.stock_quantity} left</span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="p-3 pt-2">
                      <button
                        disabled={isOutOfStock}
                        onClick={() => cart.add({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image })}
                        className="w-full rounded-lg bg-indigo-600 px-2 py-2 text-sm font-semibold text-white disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Add to cart'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {visibleProducts.length === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <p className="text-sm font-semibold text-slate-800">No product matched your search.</p>
                <button onClick={() => setRequestOpen(true)} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Request this product</button>
              </div>
            )}
          </section>
        </main>
        {requestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Request product</h3>
                <button onClick={() => setRequestOpen(false)} className="text-xl text-slate-400">✕</button>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Product name</label>
                  <input value={searchTerm || 'Product'} onChange={(e) => setSearchTerm(e.target.value)} className="premium-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Your name</label>
                  <input value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Your name" className="premium-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Phone number</label>
                  <input value={requestPhone} onChange={(e) => setRequestPhone(e.target.value)} placeholder="e.g. 919876543210" className="premium-input mt-1" inputMode="tel" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Message</label>
                  <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Optional note for the seller" className="premium-input mt-1 min-h-20" />
                </div>
                <button onClick={submitProductRequest} className="w-full rounded-xl bg-[#075E54] px-4 py-3 text-sm font-bold text-white">Send request via WhatsApp</button>
              </div>
            </div>
          </div>
        )}
        {aiSearchOpen && (
          <AiSearchModal
            onClose={() => setAiSearchOpen(false)}
            onResults={(results, query) => {
              setAiSearchProducts(results)
              setAiSearchQuery(query)
            }}
          />
        )}
        <CustomerBottomNav storeSlug={storeSlug!} active="home" />
        <CustomerChatWidget storeSlug={storeSlug!} />
        <AiAssistantWidget />
      </>)}
    </div>
  )
}
