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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function playNotificationAudio(type: 'seller' | 'customer' = 'seller') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    if (type === 'seller') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } else {
      osc.frequency.setValueAtTime(659.25, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    }
  } catch {}
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'welcome',
      type: 'system',
      title: '🔔 Live App Notifications Active',
      body: 'Real-time order alerts, messages, and stock updates are active across your app.',
      time: 'Just now',
      read: false
    }
  ])
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
      }).catch(() => {})
    }
  }, [auth.user, activeStoreId])

  // Persistent Global WebSocket connection for active store
  useEffect(() => {
    if (!activeStoreId) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/store/${activeStoreId}/`

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

          if (data.type === 'new_order' && data.order) {
            const orderRef = data.order.reference || data.order.order_number || data.order.id || 'NEW'
            const orderTotal = data.order.total || data.order.subtotal || 0
            title = `🛍️ New Order #${orderRef}`
            body = `Total ₹${orderTotal} by ${data.order.customer_name || 'Customer'} (${data.order.customer_phone || 'No phone'})`
            notifType = 'order'
            link = `/stores/${activeStoreId}/orders`
          } else if (data.type === 'new_customer_message') {
            title = `💬 Message from ${data.customer_name || 'Customer'}`
            body = `"${data.text}" (${data.customer_phone || 'No phone'})`
            notifType = 'message'
            link = `/stores/${activeStoreId}/chat`
          } else if (data.type === 'new_product_request') {
            title = `💡 Product Request: ${data.item_name || 'Item'}`
            body = `Requested by ${data.customer_name || 'Customer'} (${data.customer_phone || 'No phone'})`
            notifType = 'request'
            link = `/stores/${activeStoreId}/requests`
          } else if (data.type === 'new_product_added' && data.product) {
            title = `🎁 New Arrival: ${data.product.name}`
            body = `Now available for ₹${data.product.price}!`
            notifType = 'product'
          }

          if (title) {
            playNotificationAudio(notifType === 'product' ? 'customer' : 'seller')
            const notifItem: AppNotification = {
              id: String(Date.now()),
              type: notifType,
              title,
              body,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false,
              link
            }
            setNotifications(prev => [notifItem, ...prev])

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
        } catch {}
      }
    } catch {}

    return () => { socket?.close() }
  }, [activeStoreId])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  async function requestPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm === 'granted') {
        new Notification('🔔 Notifications Enabled!', {
          body: 'You will receive real-time alerts everywhere in the application.',
          icon: '/icons/multistore-icon.svg'
        })
      }
    }
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function clearAll() {
    setNotifications([])
  }

  function removeNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  function addNotification(notif: Omit<AppNotification, 'id' | 'time' | 'read'>) {
    playNotificationAudio()
    const newN: AppNotification = {
      ...notif,
      id: String(Date.now()),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }
    setNotifications(prev => [newN, ...prev])
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
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
        setActiveStoreId
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
