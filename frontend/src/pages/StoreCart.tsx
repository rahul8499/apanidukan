import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import api from '../services/api'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function StoreCart(){
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return <StoreCartProvider storeSlug={storeSlug}><CartContent /></StoreCartProvider>
}

function CartContent(){
  const { storeSlug } = useParams()
  const navigate = useNavigate()
  const cart = useStoreCart()
  const [store, setStore] = useState<any>(null)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('qs_chat_name') || '')
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('qs_chat_phone') || '')
  const [paymentType, setPaymentType] = useState('COD')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [locationUrl, setLocationUrl] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  
  useEffect(() => {
    if (customerName.trim()) localStorage.setItem('qs_chat_name', customerName.trim())
    else localStorage.removeItem('qs_chat_name')
  }, [customerName])

  useEffect(() => {
    if (customerPhone.trim()) localStorage.setItem('qs_chat_phone', customerPhone.trim())
    else localStorage.removeItem('qs_chat_phone')
  }, [customerPhone])

  useEffect(() => { api.get(`/public/stores/${storeSlug}/`).then(res => setStore(res.data.data || res.data)).catch(() => setError('Store details could not be loaded.')) }, [storeSlug])
  function useCurrentLocation(){
    if (!navigator.geolocation) { setError('Your browser does not support location access.'); return }
    if (!window.isSecureContext) {
      setError('Current location works only on HTTPS. Please open the secure (https://) website link on your mobile.')
      return
    }
    setError('')
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords
      setLocationUrl(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
        const place = await response.json()
        if (place.display_name) setDeliveryAddress(place.display_name)
      } catch {
        setDeliveryAddress(current => current || `Current location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
      } finally { setLocationLoading(false) }
    }, (positionError) => {
      setLocationLoading(false)
      if (positionError.code === positionError.PERMISSION_DENIED) setError('Location permission was denied. Allow Location for this site in your mobile browser settings, then try again.')
      else if (positionError.code === positionError.TIMEOUT) setError('Location request timed out. Turn on GPS and try again.')
      else setError('Your current location could not be found. Turn on GPS and try again.')
    }, { enableHighAccuracy: true, timeout: 10000 })
  }
  async function orderOnWhatsApp(){
    const trimmedName = customerName.trim()
    const trimmedPhone = customerPhone.trim()
    const number = String(store?.phone_number || '').replace(/\D/g, '')

    if (!trimmedPhone) {
      setError('WhatsApp phone number is required to place this order and start live chat.')
      return
    }
    if (!number) { setError('This seller has not added a WhatsApp order number yet. Please contact the store directly.'); return }

    try {
      localStorage.setItem('qs_chat_name', trimmedName)
      localStorage.setItem('qs_chat_phone', trimmedPhone)

      const result = await api.post(`/public/stores/${storeSlug}/whatsapp-orders/`, {
        items: cart.items.map(item => ({ id: item.id, quantity: item.quantity })),
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        payment_type: paymentType,
        delivery_address: deliveryAddress,
        location_url: locationUrl,
      })
      const order = result.data
      const orderHistoryKey = `qs_customer_orders_${storeSlug}`
      const savedOrders = JSON.parse(localStorage.getItem(orderHistoryKey) || '[]')
      const entry = { reference: order.reference, total: order.total, status: order.status, created_at: order.created_at }
      localStorage.setItem(orderHistoryKey, JSON.stringify([entry, ...savedOrders.filter((item: any) => item.reference !== order.reference)].slice(0, 30)))
      const paymentLabel = order.payment_type === 'ONLINE' ? 'Online Payment' : 'COD'
      const trackingUrl = `${window.location.origin}/store/${storeSlug}/order/${order.reference}`
      const lines = [
        `🛒 New ${paymentLabel} Order #${order.reference}`,
        `Customer: ${order.customer_name || 'Not provided'}`,
        ...(order.customer_phone ? [`Phone: ${order.customer_phone}`] : []),
        `Items: ${order.items.map((item: any) => `${item.name} × ${item.quantity}`).join(', ')}`,
        `Total: ₹${order.total}`,
        ...(order.delivery_address ? [`Delivery Address: ${order.delivery_address}`] : []),
        ...(order.location_url ? [`Location: ${order.location_url}`] : []),
        `\n📌 Track Order Live & Invoice:`,
        `${trackingUrl}`
      ]
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer')
      
      // Clear cart and redirect customer to Live Order Tracking Screen
      cart.clear()
      navigate(`/store/${storeSlug}/order/${order.reference}`)
    } catch (requestError: any) { setError(requestError?.response?.data?.detail || 'Order could not be created. Please try again.') }
  }
  if (!cart.items.length) return <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 p-5 pb-32 lg:max-w-none lg:w-full"><Link to={`/store/${storeSlug}`} className="text-sm font-semibold text-indigo-600">← Continue shopping</Link><div className="premium-card mt-6 p-8 text-center"><div className="text-4xl">🛍️</div><h1 className="mt-4 text-xl font-bold">Your cart is empty</h1><p className="mt-2 text-sm text-slate-500">Add products you want to buy.</p></div><CustomerBottomNav storeSlug={storeSlug!} active="cart" /><CustomerChatWidget storeSlug={storeSlug!} /></div>
  return <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32 lg:max-w-none lg:w-full"><header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white"><div className="flex items-center gap-3"><Link to={`/store/${storeSlug}`} className="text-xl">←</Link><div><p className="text-xs text-indigo-200">Shopping cart</p><h1 className="font-bold">Your items</h1></div></div><NotificationBellHeader /></header><main className="space-y-3 p-4">{cart.items.map(item => <div key={item.id} className="premium-card flex gap-3 p-3"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{item.image ? <img src={item.image.startsWith('http') ? item.image : `${window.location.protocol}//${window.location.hostname}:8000${item.image}`} alt="" className="h-full w-full object-cover" /> : '🛍️'}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.name}</p><p className="mt-1 font-bold text-indigo-700">₹{item.price}</p><div className="mt-2 flex items-center gap-3"><button onClick={() => cart.change(item.id, item.quantity - 1)} className="secondary-button px-3 py-1">−</button><span className="font-bold">{item.quantity}</span><button onClick={() => cart.change(item.id, item.quantity + 1)} className="secondary-button px-3 py-1">+</button></div></div></div>)}<section className="premium-card mt-5 p-5"><div className="flex justify-between text-lg font-bold"><span>Total</span><span>₹{cart.total.toFixed(2)}</span></div><div className="mt-5 grid gap-3"><input className="premium-input" placeholder="Your name" value={customerName} onChange={e => setCustomerName(e.target.value)} /><input className="premium-input" inputMode="tel" placeholder="WhatsApp number (required)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /><select className="premium-input" value={paymentType} onChange={e => setPaymentType(e.target.value)}><option value="COD">Cash on Delivery (COD)</option><option value="ONLINE">Online Payment</option></select><textarea className="premium-input min-h-24" placeholder="Delivery address (optional)" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} /><button type="button" onClick={useCurrentLocation} disabled={locationLoading} className="secondary-button w-full">{locationLoading ? 'Getting current address…' : '⌖ Use current address & location'}</button><input className="premium-input" type="url" placeholder="Google Maps location link (optional)" value={locationUrl} onChange={e => setLocationUrl(e.target.value)} /></div>{error && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}<button onClick={orderOnWhatsApp} className="mt-5 w-full rounded-xl bg-[#25D366] px-5 py-3 font-bold text-white shadow-lg shadow-emerald-200 hover:bg-[#1fba58]">Order on WhatsApp ↗</button><p className="mt-3 text-center text-xs text-slate-500">Order is saved and seller will receive your WhatsApp message.</p></section></main><CustomerBottomNav storeSlug={storeSlug!} active="cart" /><CustomerChatWidget storeSlug={storeSlug!} /></div>
}
