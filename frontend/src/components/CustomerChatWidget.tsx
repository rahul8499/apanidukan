import React, { useEffect, useState, useRef } from 'react'
import api from '../services/api'
import { MessageSquare, X, Send, Phone, User, Check, CheckCheck, Sparkles, ExternalLink } from 'lucide-react'

interface CustomerChatWidgetProps {
  storeSlug: string
  orderReference?: string
}

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
  } catch {}
}

export default function CustomerChatWidget({ storeSlug, orderReference }: CustomerChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize or retrieve customer session ID
  useEffect(() => {
    let sid = localStorage.getItem(`qs_chat_session_${storeSlug}`)
    if (!sid) {
      sid = 'cust_' + Math.random().toString(36).substring(2, 11)
      localStorage.setItem(`qs_chat_session_${storeSlug}`, sid)
    }
    setSessionId(sid)

    const savedName = localStorage.getItem('qs_chat_name') || ''
    const savedPhone = localStorage.getItem('qs_chat_phone') || ''
    setCustomerName(savedName)
    setCustomerPhone(savedPhone)

    const handleOpenEvent = () => {
      setIsOpen(true)
      setUnreadCount(0)
      setToastMessage(null)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
    window.addEventListener('qs-open-chat', handleOpenEvent)
    return () => window.removeEventListener('qs-open-chat', handleOpenEvent)
  }, [storeSlug])

  // Load conversation & message history
  const initChat = async () => {
    if (!sessionId || !storeSlug) return
    try {
      const res = await api.post(`/public/stores/${storeSlug}/chat/`, {
        session_id: sessionId,
        customer_name: customerName,
        customer_phone: customerPhone,
        order_reference: orderReference,
        init_chat: true,
      })
      if (res.data && res.data.id) {
        setConversation(res.data)
        setMessages(res.data.messages || [])
      } else {
        setConversation(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to init customer chat:', err)
    }
  }

  useEffect(() => {
    if (isOpen && sessionId) {
      initChat()
    }
  }, [isOpen, sessionId, storeSlug, orderReference])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      setToastMessage(null)
    }
  }, [isOpen])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // WebSocket & Polling Live Updates
  useEffect(() => {
    if (!conversation?.id) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/chat/${conversation.id}/`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)
      socket.onopen = () => setWsConnected(true)
      socket.onclose = () => setWsConnected(false)

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_chat_message' && data.message) {
            const newMsg = data.message
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })

            // If message is from seller, notify customer via chime sound and Push notification
            if (newMsg.sender_type === 'SELLER') {
              playCustomerChime()
              if (!isOpen) {
                setUnreadCount((c) => c + 1)
                setToastMessage(newMsg.text)
              }
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification('💬 Message from Store Owner', {
                      body: newMsg.text,
                      icon: '/icons/multistore-icon.svg',
                      badge: '/icons/multistore-icon.svg',
                      vibrate: [150, 100, 150]
                    } as any)
                  }).catch(() => {
                    new Notification('💬 Message from Store Owner', { body: newMsg.text, icon: '/icons/multistore-icon.svg' })
                  })
                } else {
                  new Notification('💬 Message from Store Owner', { body: newMsg.text, icon: '/icons/multistore-icon.svg' })
                }
              }
            }
          }
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }
    } catch (e) {
      console.warn('WS Connect error:', e)
    }

    // Polling fallback every 4 seconds
    const interval = setInterval(async () => {
      if (!isOpen) return
      try {
        const res = await api.post(`/public/stores/${storeSlug}/chat/`, {
          session_id: sessionId,
          customer_phone: customerPhone,
          order_reference: orderReference,
        })
        if (res.data.messages) {
          const fetchedMsgs = res.data.messages
          setMessages(fetchedMsgs)

          if (!isOpen && fetchedMsgs.length > 0) {
            const lastMsg = fetchedMsgs[fetchedMsgs.length - 1]
            if (lastMsg.sender_type === 'SELLER' && !lastMsg.is_read) {
              setToastMessage(lastMsg.text)
            }
          }
        }
      } catch {}
    }, 4000)

    return () => {
      if (socket) socket.close()
      clearInterval(interval)
    }
  }, [conversation?.id, isOpen, storeSlug, sessionId, customerPhone, orderReference])

  // Save customer details
  const saveDetails = () => {
    localStorage.setItem('qs_chat_name', customerName)
    localStorage.setItem('qs_chat_phone', customerPhone)
    setShowDetails(false)
    initChat()
  }

  // Send message from customer
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !sessionId) return
    const textToSend = text
    setText('')

    try {
      const res = await api.post(`/public/stores/${storeSlug}/chat/messages/`, {
        session_id: sessionId,
        text: textToSend,
        customer_name: customerName,
        customer_phone: customerPhone,
      })

      if (!conversation) {
        await initChat()
      } else {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev
          return [...prev, res.data]
        })
      }
    } catch (err) {
      alert('Message sending failed. Please try again.')
    }
  }

  return (
    <>
      {/* Toast Notification when seller replies while drawer is closed */}
      {!isOpen && toastMessage && (
        <div className="fixed top-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 items-center justify-between rounded-2xl bg-[#075E54] p-3 text-white shadow-2xl border border-[#128C7E] animate-bounce">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl">💬</span>
            <div className="min-w-0">
              <p className="font-extrabold text-xs text-emerald-300">
                {conversation?.store_name || 'Store Seller'} sent a message:
              </p>
              <p className="truncate text-xs font-medium text-white">{toastMessage}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(true)
              setToastMessage(null)
              setUnreadCount(0)
            }}
            className="ml-2 flex-shrink-0 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-extrabold text-white shadow hover:bg-[#1fba58]"
          >
            Reply ➔
          </button>
        </div>
      )}

      {/* WhatsApp Style Chat Window (Responsive Window on Desktop, Full Drawer on Mobile) */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 sm:left-auto sm:right-6 sm:bottom-6 flex h-[85vh] sm:h-[580px] w-full sm:w-[420px] max-w-full flex-col rounded-t-3xl sm:rounded-3xl bg-[#E5DDD5] shadow-[0_-12px_40px_rgba(0,0,0,0.35)] border border-slate-300/80 overflow-hidden font-sans">
          
          {/* Authentic WhatsApp Dark Teal Header */}
          <div className="flex items-center justify-between bg-[#075E54] px-4 py-3 text-white shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#128C7E] font-bold text-white text-base shadow border border-white/20 shrink-0">
                🏪
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#075E54]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-xs sm:text-sm leading-tight text-white truncate">
                  {conversation?.store_name || 'Official Store Chat'}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-200 font-medium mt-0.5 flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-300'
                    }`}
                  />
                  {wsConnected ? 'online • replies instantly' : 'online • store support'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {conversation?.store_phone && (
                <a
                  href={`https://wa.me/${conversation.store_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[#25D366] px-2 py-1 text-[10px] font-black text-white shadow hover:bg-[#1fba58] flex items-center gap-1"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="rounded-lg bg-white/10 p-1.5 text-xs font-semibold hover:bg-white/20 text-white"
                title="Customer Profile"
              >
                <User className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Contact Details Prompt Banner */}
          {(!customerName || showDetails) && (
            <div className="bg-emerald-50 p-3 border-b border-emerald-200 text-xs space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-[#075E54]">👤 Enter Details for Live Chat</p>
                {customerName && (
                  <button onClick={() => setShowDetails(false)} className="text-slate-400 font-bold">
                    ✕
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name (e.g. Rahul)"
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-[#075E54] focus:outline-none"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="WhatsApp Number"
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-[#075E54] focus:outline-none"
                  inputMode="tel"
                />
              </div>
              <button
                onClick={saveDetails}
                className="w-full rounded-xl bg-[#075E54] py-1.5 text-xs font-black text-white shadow hover:bg-[#128C7E] cursor-pointer"
              >
                Save Name & Connect Chat
              </button>
            </div>
          )}

          {/* Order Reference Context Banner */}
          {orderReference && (
            <div className="bg-[#FEF3C7] px-3.5 py-1.5 border-b border-[#FDE68A] flex items-center justify-between text-xs text-amber-950 font-bold shrink-0">
              <span>📦 Live Chat regarding Order #{orderReference}</span>
              <span className="text-[9px] bg-amber-200 px-1.5 py-0.5 rounded-full text-amber-900 font-extrabold">Context</span>
            </div>
          )}

          {/* WhatsApp Chat Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#E5DDD5]">
            {messages.length === 0 ? (
              <div className="my-auto text-center p-6 bg-white/90 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-3xl">💬</div>
                <p className="font-extrabold text-xs text-slate-900">Welcome to Live Store Support!</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Send a message below. Store seller will receive your chat live on their seller dashboard.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isCustomer = m.sender_type === 'CUSTOMER'
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    {/* WhatsApp Style Chat Bubbles */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-xs ${
                        isCustomer
                          ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none border border-[#c3ebaa]'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                      }`}
                    >
                      <p className={`font-extrabold text-[10px] mb-0.5 ${isCustomer ? 'text-[#075E54]' : 'text-indigo-700'}`}>
                        {isCustomer ? 'You' : m.sender_name || conversation?.store_name || 'Store Seller'}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed text-xs text-slate-900 font-medium">
                        {m.text}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-500">
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isCustomer && <CheckCheck className="h-3 w-3 text-[#34B7F1]" />}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Message Input Bar */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-300 bg-[#F0F0F0] p-2.5 shrink-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 shadow-inner focus:border-[#075E54] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#075E54] text-white shadow-md disabled:opacity-50 hover:bg-[#128C7E] cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}
    </>
  )
}
