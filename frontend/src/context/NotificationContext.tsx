import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

export interface AppNotification {
  id: string
  type: 'order' | 'message' | 'request' | 'stock' | 'product' | 'system'
  title: string
  body: string
  time: string
  read: boolean
  link?: string
  action?: () => void
}

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  showNotifDrawer: boolean
  setShowNotifDrawer: (open: boolean) => void
  permission: string
  requestPermission: () => Promise<void>
  markAllRead: () => void
  clearAll: () => void
  removeNotification: (id: string) => void
  addNotification: (notif: Omit<AppNotification, 'id' | 'time' | 'read'>) => void
  activeStoreId: number | null
  setActiveStoreId: (id: number | null) => void
  testVoiceAlert: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

let globalAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return null
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass()
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => { })
    }
    return globalAudioCtx
  } catch (e) {
    console.error('AudioContext initialization error:', e)
    return null
  }
}

export function playNotificationAudio(type: 'seller' | 'customer' = 'seller') {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { })
    }

    // Android & Mobile Chrome optimized AudioBuffer chime sound
    const duration = type === 'seller' ? 0.6 : 0.5
    const sampleRate = ctx.sampleRate || 44100
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate)
    const channel = buffer.getChannelData(0)
    const freq1 = type === 'seller' ? 587.33 : 659.25
    const freq2 = 880

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate
      const f = t < 0.15 ? freq1 : freq2
      const decay = Math.exp(-t / 0.18)
      channel[i] = Math.sin(2 * Math.PI * f * t) * decay * 0.7
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch (e) {
    console.error('Error playing notification audio:', e)
  }
}

export function speakSoundboxAlert(text: string, delayMs: number = 0) {
  if (delayMs > 0) {
    setTimeout(() => executeSpeak(text), delayMs);
    return;
  }
  executeSpeak(text);
}

function executeSpeak(text: string) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const synth = window.speechSynthesis
    if (synth.speaking || synth.pending) {
      synth.cancel()
    }
    if (synth.paused) {
      synth.resume()
    }

    const utterance = new SpeechSynthesisUtterance(text + '.')
    utterance.lang = 'hi-IN'
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const speakNow = () => {
      try {
        const voices = synth.getVoices()
        if (voices && voices.length > 0) {
          const hindiVoice = voices.find(v =>
            v.lang.toLowerCase().includes('hi') ||
            v.lang.toLowerCase().includes('in') ||
            v.name.toLowerCase().includes('hindi') ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('google')
          )
          if (hindiVoice) {
            utterance.voice = hindiVoice
          }
        }
      } catch { }
      synth.speak(utterance)
    }

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => {
        speakNow()
        synth.onvoiceschanged = null
      }
      speakNow()
    } else {
      speakNow()
    }
  } catch (e) {
    console.error('Soundbox alert error:', e)
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null)

  // Notification history is loaded only for the active seller/store or customer/store scope.
  const [sellerNotifications, setSellerNotifications] = useState<AppNotification[]>([])
  const [customerNotifications, setCustomerNotifications] = useState<AppNotification[]>([])

  // Android / iOS Mobile gesture unlock on any touch, tap, scroll, or pointerdown
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const ctx = getAudioContext()
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => { })
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.resume()
          window.speechSynthesis.getVoices()
          const silentUtterance = new SpeechSynthesisUtterance('')
          silentUtterance.volume = 0
          window.speechSynthesis.speak(silentUtterance)
        }
      } catch { }
    }

    const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'scroll']
    events.forEach(evt => {
      window.addEventListener(evt, unlockAudio, { passive: true })
    })

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        try { window.speechSynthesis.getVoices() } catch { }
      }
    }

    return () => {
      events.forEach(evt => {
        window.removeEventListener(evt, unlockAudio)
      })
    }
  }, [])

  const [showNotifDrawer, setShowNotifDrawer] = useState(false)
  const [permission, setPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  // Fetch seller's primary store ID automatically if authenticated and activeStoreId not set
  useEffect(() => {
    if (auth.user && !activeStoreId) {
      api.get('/stores/').then(res => {
        const stores = res.data.results || res.data
        if (Array.isArray(stores) && stores.length > 0) {
          setActiveStoreId(stores[0].id)
        }
      }).catch(() => { })
    }
  }, [auth.user, activeStoreId])

  const getCurrentStoreId = (): number | null => {
    if (typeof window !== 'undefined') {
      const sellerMatch = window.location.pathname.match(/\/stores\/(\d+)/)
      if (sellerMatch && sellerMatch[1]) {
        return parseInt(sellerMatch[1], 10)
      }
      const customerMatch = window.location.pathname.match(/\/store\/(\d+)/)
      if (customerMatch && customerMatch[1]) {
        return parseInt(customerMatch[1], 10)
      }
    }
    return activeStoreId
  }

  const isSellerRoute = () => {
    if (typeof window === 'undefined') return false
    const path = window.location.pathname
    return path.startsWith('/stores/') || path === '/dashboard' || path === '/platform'
  }

  const effectiveStoreId = getCurrentStoreId()
  const trackingToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null
  const customerIdentity = typeof window !== 'undefined' ? (() => {
    const key = 'qs_notification_visitor_id'
    let value = localStorage.getItem(key)
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : `visitor_${Math.random().toString(36).slice(2)}`
      localStorage.setItem(key, value)
    }
    return value
  })() : 'server'
  const notificationScope = isSellerRoute()
    ? `seller_${auth.user?.id || 'anonymous'}_store_${effectiveStoreId || 'none'}`
    : `customer_store_${effectiveStoreId || 'none'}_${trackingToken || customerIdentity}`
  const notificationStorageKey = `qs_notifications_${notificationScope}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isSellerRoute() && effectiveStoreId) {
      api.get(`/stores/${effectiveStoreId}/notifications/`).then(res => {
         const dbNotifs = res.data.map((n: any) => ({
             id: String(n.id),
             type: n.notification_type,
             title: n.title,
             body: n.body,
             time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
             read: n.is_read,
             link: n.link
         }))
         setSellerNotifications(dbNotifs)
      }).catch(console.error)
    } else if (effectiveStoreId) {
      api.get(`/public/stores/id/${effectiveStoreId}/notifications/?token=${trackingToken || customerIdentity}`).then(res => {
         const dbNotifs = res.data.map((n: any) => ({
             id: String(n.id),
             type: n.notification_type,
             title: n.title,
             body: n.body,
             time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
             read: n.is_read,
             link: n.link
         }))
         setCustomerNotifications(dbNotifs)
      }).catch(console.error)
    }
  }, [effectiveStoreId, auth.user])



  // Fast polling backup sync for instant bell icon notifications (Every 4 seconds - Seller Only)
  const knownOrderIdsRef = React.useRef<Set<number>>(new Set())
  const isInitialFetchRef = React.useRef<boolean>(true)

  useEffect(() => {
    if (!auth.user || !effectiveStoreId || !isSellerRoute()) return

    const checkNewOrders = async () => {
      if (!isSellerRoute()) return

      try {
        const res = await api.get(`/seller/stores/${effectiveStoreId}/whatsapp-orders/`)
        const orders = res.data
        if (!Array.isArray(orders)) return

        if (isInitialFetchRef.current) {
          orders.forEach((o: any) => knownOrderIdsRef.current.add(o.id))
          isInitialFetchRef.current = false
          return
        }

        const newOrders = orders.filter((o: any) => !knownOrderIdsRef.current.has(o.id))
        if (newOrders.length > 0) {
          newOrders.forEach((order: any) => {
            knownOrderIdsRef.current.add(order.id)
            const orderRef = order.reference || order.id
            const title = `🛍️ New Order #${orderRef}`
            const body = `Total ₹${order.total} by ${order.customer_name || 'Customer'} (${order.customer_phone || 'No phone'})`

            playNotificationAudio('seller')
            const custText = order.customer_name ? `${order.customer_name} se ` : ''
            const amtText = order.total ? `kul ${Number(order.total).toFixed(0)} rupaye ka ` : ''
            speakSoundboxAlert(`Aapke Store par ${custText}${amtText}naya order praapt hua.`, 800)

            const notifItem: AppNotification = {
              id: `order_${order.id}_${Date.now()}`,
              type: 'order',
              title,
              body,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false,
              link: `/stores/${effectiveStoreId}/orders`
            }
            // Push ONLY to seller notifications
            setSellerNotifications(prev => [notifItem, ...prev])

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(title, { body, icon: '/icons/multistore-icon.svg' })
            }
          })
        }
      } catch { }
    }

    checkNewOrders()
    const interval = setInterval(checkNewOrders, 120000)
    return () => clearInterval(interval)
  }, [auth.user, effectiveStoreId])

  // Persistent Global WebSocket connection for active store (Seller & Customer)
  useEffect(() => {
    if (!effectiveStoreId) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '5173' ||
      window.location.port === '3000'
    )
    const host = isLocal ? `${window.location.hostname}:8000` : window.location.host
    const wsUrl = `${protocol}//${host}/ws/store/${effectiveStoreId}/`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          let title = ''
          let body = ''
          let notifType: AppNotification['type'] = 'system'
          let link = ''
          const currentIsSeller = isSellerRoute()

          if (data.type === 'new_order' && data.order) {
            // Seller order alerts MUST NOT go to customer
            if (!currentIsSeller) return

            knownOrderIdsRef.current.add(data.order.id)
            const orderRef = data.order.reference || data.order.order_number || data.order.id || 'NEW'
            const orderTotal = data.order.total || data.order.subtotal || 0
            title = `🛍️ New Order #${orderRef}`
            body = `Total ₹${orderTotal} by ${data.order.customer_name || 'Customer'} (${data.order.customer_phone || 'No phone'})`
            notifType = 'order'
            link = `/stores/${effectiveStoreId}/orders`

          } else if (data.type === 'new_customer_message') {
            if (!currentIsSeller) return
            title = `💬 Message from ${data.customer_name || 'Customer'}`
            body = `"${data.text}" (${data.customer_phone || 'No phone'})`
            notifType = 'message'
            link = `/stores/${effectiveStoreId}/chat`

          } else if (data.type === 'new_product_request') {
            if (!currentIsSeller) return
            title = `💡 Product Request: ${data.item_name || 'Item'}`
            body = `Requested by ${data.customer_name || 'Customer'} (${data.customer_phone || 'No phone'})`
            notifType = 'request'
            link = `/stores/${effectiveStoreId}/requests`

          } else if (data.type === 'new_product' || data.type === 'product_published' || data.type === 'new_product_added') {
            // Product announcements MUST NOT go to seller dashboard! Only for customer!
            if (currentIsSeller) return

            const pName = data.product?.name || data.product_name || data.item_name || 'New Item'
            title = `🎉 New Product Live: ${pName}`
            body = `${pName} is now published & available to order!`
            notifType = 'product'
            link = `/store/${effectiveStoreId}`
          }

          if (title) {
            playNotificationAudio(notifType === 'product' ? 'customer' : 'seller')

            if (notifType === 'order' && data.order && currentIsSeller) {
              const custText = data.order.customer_name ? `${data.order.customer_name} se ` : ''
              const totalVal = data.order.total || data.order.subtotal
              const amtText = totalVal ? `kul ${Number(totalVal).toFixed(0)} rupaye ka ` : ''
              speakSoundboxAlert(`QuickStore par ${custText}${amtText}naya order praapt hua.`, 800)
            } else if (notifType === 'request' && currentIsSeller) {
              speakSoundboxAlert(`QuickStore par naya product request aaya hai: ${data.item_name || 'Item'}.`, 800)
            } else if (notifType === 'product' && !currentIsSeller) {
              const pName = data.product?.name || data.product_name || data.item_name || 'Naya item'
              speakSoundboxAlert(`Store par naya product live ho gaya hai: ${pName}.`)
            }

            const notifItem: AppNotification = {
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              type: notifType,
              title,
              body,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false,
              link
            }

            // Route notification to appropriate store: seller vs customer
            if (currentIsSeller) {
              setSellerNotifications(prev => [notifItem, ...prev])
            } else {
              setCustomerNotifications(prev => [notifItem, ...prev])
            }

            // Trigger OS Native Web Push
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, {
                    body,
                    icon: '/icons/multistore-icon.svg',
                    badge: '/icons/multistore-icon.svg',
                    vibrate: [200, 100, 200]
                  } as any)
                }).catch(() => {
                  new Notification(title, { body, icon: '/icons/multistore-icon.svg' })
                })
              } else {
                new Notification(title, { body, icon: '/icons/multistore-icon.svg' })
              }
            }
          }
        } catch (err) {
          console.error("WS notification error:", err)
        }
      }
    } catch { }

    return () => { socket?.close() }
  }, [effectiveStoreId])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Dynamic context view based on route
  const currentIsSeller = isSellerRoute()
  const activeNotifications = currentIsSeller ? sellerNotifications : customerNotifications
  const setActiveNotifications = currentIsSeller ? setSellerNotifications : setCustomerNotifications

  const unreadCount = useMemo(() => activeNotifications.filter(n => !n.read).length, [activeNotifications])

  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('⚠️ Push Notifications are not supported by this browser.')
      return
    }

    const currentStatus = Notification.permission
    if (currentStatus === 'denied') {
      setPermission('denied')
      alert('⚠️ Notifications are blocked in your browser settings.\n\nTo enable:\n1. Click the 🔒 lock icon next to the website address (URL).\n2. Change Notifications setting from "Block" to "Allow".\n3. Refresh the page.')
      return
    }

    try {
      let finalPermission: NotificationPermission = 'default'

      if (typeof Notification.requestPermission === 'function') {
        const result = Notification.requestPermission((p) => {
          if (p) {
            finalPermission = p
            setPermission(p)
            if (p === 'granted') {
              playNotificationAudio('seller')
              new Notification('🔔 Notifications Enabled!', {
                body: 'You will receive real-time order & chat alerts everywhere.',
                icon: '/icons/multistore-icon.svg'
              })
            }
          }
        })

        if (result && typeof (result as any).then === 'function') {
          const resPermission = await result
          finalPermission = resPermission
          setPermission(resPermission)
          if (resPermission === 'granted') {
            playNotificationAudio('seller')
            new Notification('🔔 Notifications Enabled!', {
              body: 'You will receive real-time order & chat alerts everywhere.',
              icon: '/icons/multistore-icon.svg'
            })
          } else if (resPermission === 'denied') {
            alert('⚠️ Permission was blocked. Please click the 🔒 lock icon near the address bar to allow notifications.')
          }
        }
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e)
    }
  }

  function markAllRead() {
    if (effectiveStoreId) {
       if (isSellerRoute()) {
         api.post(`/stores/${effectiveStoreId}/notifications/`, {}).catch(console.error)
       } else {
         const token = trackingToken || customerIdentity;
         api.post(`/public/stores/id/${effectiveStoreId}/notifications/`, { token }).catch(console.error)
       }
    }
    
    if (isSellerRoute()) {
      setSellerNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } else {
      setCustomerNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  function clearAll() {
    if (isSellerRoute()) setSellerNotifications([]);
    else setCustomerNotifications([]);
  }

  function removeNotification(id: string) {
    if (isSellerRoute()) {
      setSellerNotifications(prev => prev.filter(n => n.id !== id));
    } else {
      setCustomerNotifications(prev => prev.filter(n => n.id !== id));
    }
  }

  function addNotification(notif: Omit<AppNotification, 'id' | 'time' | 'read'>) {
    playNotificationAudio(notif.type === 'product' ? 'customer' : 'seller')

    if (notif.type === 'order') {
      speakSoundboxAlert(`QuickStore naya order aaya hai! ${notif.title}. ${notif.body}`)
    } else if (notif.type === 'product') {
      speakSoundboxAlert(`Store par naya product live ho gaya hai! ${notif.title}`)
    } else if (notif.type === 'request') {
      speakSoundboxAlert(`Naya product request aaya hai! ${notif.title}`)
    } else if (notif.type === 'message') {
      speakSoundboxAlert(`Naya grahak message aaya hai! ${notif.title}`)
    }

    const newN: AppNotification = {
      ...notif,
      id: String(Date.now()),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }

    if (notif.type === 'product' || !currentIsSeller) {
      setCustomerNotifications(prev => [newN, ...prev])
      if (effectiveStoreId) {
        const token = trackingToken || customerIdentity;
        api.post(`/public/stores/id/${effectiveStoreId}/notifications/`, {
          action: 'create',
          token,
          type: notif.type,
          title: notif.title,
          body: notif.body,
          link: notif.link || ''
        }).catch(() => {})
      }
    } else {
      setSellerNotifications(prev => [newN, ...prev])
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification(notif.title, {
                body: notif.body,
                icon: '/icons/multistore-icon.svg',
                badge: '/icons/multistore-icon.svg',
                vibrate: [200, 100, 200]
              } as any)
            }).catch(() => {
              new Notification(notif.title, { body: notif.body, icon: '/icons/multistore-icon.svg' })
            })
          } else {
            new Notification(notif.title, { body: notif.body, icon: '/icons/multistore-icon.svg' })
          }
        } catch (e) {
          console.error('Error firing Web Push in addNotification:', e)
        }
      }
    }
  }

  function testVoiceAlert() {
    playNotificationAudio('seller')
    speakSoundboxAlert('QuickStore soundbox notification voice active aur ready hai!')
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications: activeNotifications,
        unreadCount,
        showNotifDrawer,
        setShowNotifDrawer,
        permission,
        requestPermission,
        markAllRead,
        clearAll,
        removeNotification,
        addNotification,
        activeStoreId,
        setActiveStoreId,
        testVoiceAlert
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
