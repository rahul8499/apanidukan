import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import AiAssistantWidget from '../components/AiAssistantWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function SellerChat() {
  const { storeId } = useParams()
  const location = useLocation()
  const [store, setStore] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [textInput, setTextInput] = useState('')
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustMsg, setNewCustMsg] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [associatedOrder, setAssociatedOrder] = useState<any>(null)

  const auth = useAuth()
  const navigate = useNavigate()
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Load store info and list of customer conversations
  const loadStoreAndConversations = async () => {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((x: any) => String(x.id) === storeId)
      if (!found) return navigate('/dashboard')
      setStore(found)

      const convRes = await api.get(`/seller/stores/${storeId}/conversations/`)
      const nextConversations = convRes.data || []
      setConversations(nextConversations)

      const searchParams = new URLSearchParams(location.search)
      const targetConvId = searchParams.get('convId')
      const targetConv = targetConvId
        ? nextConversations.find((c: any) => String(c.id) === String(targetConvId))
        : null

      if (targetConvId) {
        setShowNewModal(false)
        setSelectedConv(targetConv || nextConversations[0] || null)
      } else if (nextConversations.length > 0 && !selectedConv) {
        setSelectedConv(nextConversations[0])
      }
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => {
    loadStoreAndConversations()
  }, [storeId, location.search])

  // Load messages & match associated customer order
  const loadMessagesAndOrder = async (convId: number, convObj: any) => {
    try {
      const res = await api.get(`/seller/stores/${storeId}/conversations/${convId}/messages/`)
      setMessages(res.data.messages || [])
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      )

      // Fetch store orders to find associated order for this customer
      const ordersRes = await api.get(`/seller/stores/${storeId}/whatsapp-orders/`)
      const allOrders = ordersRes.data || []
      const searchRef = new URLSearchParams(location.search).get('orderRef')

      let matched = null
      if (searchRef) {
        matched = allOrders.find((o: any) => String(o.reference) === String(searchRef))
      }
      if (!matched && convObj?.customer_phone) {
        const cleanPhone = convObj.customer_phone.replace(/\D/g, '')
        matched = allOrders.find(
          (o: any) => o.customer_phone && o.customer_phone.replace(/\D/g, '') === cleanPhone
        )
      }
      if (!matched && convObj?.customer_name) {
        matched = allOrders.find(
          (o: any) => o.customer_name && o.customer_name.toLowerCase() === convObj.customer_name.toLowerCase()
        )
      }
      setAssociatedOrder(matched || null)
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  useEffect(() => {
    if (selectedConv) {
      loadMessagesAndOrder(selectedConv.id, selectedConv)
      setTimeout(() => chatInputRef.current?.focus(), 120)
    }
  }, [selectedConv?.id])

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket for Store level new messages
  useEffect(() => {
    if (!storeId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = `${window.location.hostname}:8000`
    const wsUrl = `${protocol}//${host}/ws/store_chats/${storeId}/`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)
      socket.onopen = () => setWsConnected(true)
      socket.onclose = () => setWsConnected(false)

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_chat_message' && data.message) {
            const incomingMsg = data.message
            const convId = data.conversation_id

            if (selectedConv && selectedConv.id === convId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === incomingMsg.id)) return prev
                return [...prev, incomingMsg]
              })
            }

            api.get(`/seller/stores/${storeId}/conversations/`).then((res) => setConversations(res.data))
          }
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }
    } catch (e) {
      console.warn('WS Connect error:', e)
    }

    return () => {
      if (socket) socket.close()
    }
  }, [storeId, selectedConv?.id])

  // Send reply message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || !selectedConv) return
    const textToSend = textInput
    setTextInput('')

    try {
      const res = await api.post(`/seller/stores/${storeId}/conversations/${selectedConv.id}/messages/`, {
        text: textToSend,
      })

      const newMsg = res.data
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id ? { ...c, last_message: textToSend, last_message_at: new Date().toISOString() } : c
        )
      )
    } catch (err) {
      alert('Could not send message. Please try again.')
    }
  }

  // Start new chat with customer
  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustPhone.trim() && !newCustName.trim()) return

    try {
      const res = await api.post(`/seller/stores/${storeId}/conversations/`, {
        customer_name: newCustName || 'Customer',
        customer_phone: newCustPhone,
        message: newCustMsg,
      })

      setShowNewModal(false)
      setNewCustName('')
      setNewCustPhone('')
      setNewCustMsg('')

      await loadStoreAndConversations()
      setSelectedConv(res.data)
    } catch (err) {
      alert('Failed to start chat. Check details.')
    }
  }

  if (!store) return <div className="p-6">Loading chat inbox...</div>

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-100 pb-24 flex flex-col lg:max-w-none lg:w-full">
      {/* WhatsApp Web Style Dark Green Header */}
      <header className="flex items-center justify-between bg-[#075E54] px-5 py-4 text-white shadow-md">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
            Seller Workspace
          </p>
          <h1 className="mt-0.5 text-lg font-black flex items-center gap-2">
            <span>💬 WhatsApp Store Inbox</span>
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
            />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBellHeader />
          <button
            onClick={() => setShowNewModal(true)}
            className="rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-black text-white shadow hover:bg-[#1fba58]"
          >
            + New Chat
          </button>
        </div>
      </header>

      {/* Main Inbox View */}
      <div className="flex-1 flex flex-col p-3 space-y-3">
        {/* Customer Conversations Selector Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              Customer Chats ({conversations.length})
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              WhatsApp Sync Active
            </span>
          </div>

          {conversations.length === 0 ? (
            <div className="premium-card p-6 text-center bg-white">
              <div className="text-3xl">💬</div>
              <p className="mt-2 font-extrabold text-slate-800 text-sm">No customer chats yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Messages sent by customers on your store storefront will appear here live in real-time.
              </p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {conversations.map((c) => {
                const isSelected = selectedConv?.id === c.id
                const displayName =
                  c.customer_name && !c.customer_name.startsWith('Guest Buyer')
                    ? c.customer_name
                    : c.customer_phone
                      ? `Customer (${c.customer_phone})`
                      : c.customer_name || 'Customer'

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className={`flex-shrink-0 min-w-40 max-w-52 rounded-2xl p-3 text-left transition-all border ${isSelected
                      ? 'bg-[#075E54] text-white border-[#075E54] shadow-md'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-xs truncate">
                        👤 {displayName}
                      </p>
                      {c.unread_count > 0 && (
                        <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white animate-pulse">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    {c.customer_phone && (
                      <p className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                        📞 {c.customer_phone}
                      </p>
                    )}
                    <p
                      className={`mt-1 text-[11px] truncate ${isSelected ? 'text-emerald-100 font-medium' : 'text-slate-600'
                        }`}
                    >
                      {c.last_message || 'Started chat'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Chat Room Window */}
        {selectedConv ? (
          <div className="premium-card flex-1 flex flex-col h-[460px] overflow-hidden border border-slate-300 rounded-3xl bg-[#E5DDD5]">
            {/* WhatsApp Header for Selected Customer */}
            <div className="flex items-center justify-between bg-[#075E54] px-4 py-3 text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#128C7E] font-bold text-white text-base shadow border border-white/20">
                  👤
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#075E54]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white leading-tight">
                    {selectedConv.customer_name && !selectedConv.customer_name.startsWith('Guest Buyer')
                      ? selectedConv.customer_name
                      : selectedConv.customer_phone
                        ? `Customer (${selectedConv.customer_phone})`
                        : selectedConv.customer_name || 'Customer'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-emerald-200 font-medium">
                    {selectedConv.customer_phone ? (
                      <span>📞 {selectedConv.customer_phone}</span>
                    ) : (
                      <span>Online Store Buyer</span>
                    )}
                    <span className="text-[10px] text-emerald-300 font-bold">• Live 1-on-1</span>
                  </div>
                </div>
              </div>

              {selectedConv.customer_phone && (
                <a
                  href={`https://wa.me/${selectedConv.customer_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-[#25D366] px-2.5 py-1.5 text-[11px] font-black text-white shadow hover:bg-[#1fba58]"
                >
                  WhatsApp ↗
                </a>
              )}
            </div>

            {/* Prominent Associated Order Card Header */}
            {associatedOrder ? (
              <div className="bg-[#FEF3C7] px-4 py-2.5 border-b border-[#FDE68A] flex items-center justify-between text-xs text-amber-950 font-bold">
                <div>
                  <p className="font-extrabold text-amber-900 flex items-center gap-1">
                    <span>📦 Order #{associatedOrder.reference}</span>
                    <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                      {associatedOrder.status}
                    </span>
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    Total: <strong>₹{associatedOrder.total}</strong> • {associatedOrder.payment_type === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                  </p>
                </div>
                <Link
                  to={`/store/${store.slug}/order/${associatedOrder.reference}`}
                  target="_blank"
                  className="rounded-lg bg-amber-800 text-white px-2.5 py-1 text-[10px] font-extrabold shadow hover:bg-amber-900"
                >
                  View Order ↗
                </Link>
              </div>
            ) : (
              <div className="bg-slate-200/80 px-4 py-1.5 border-b border-slate-300 text-[11px] text-slate-700 font-semibold flex items-center justify-between">
                <span>💬 General Customer Chat</span>
                <span className="text-[10px] text-slate-500">Storefront Inquiry</span>
              </div>
            )}

            {/* WhatsApp Chat Messages History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5]">
              {messages.length === 0 ? (
                <div className="my-auto text-center p-6 bg-white/80 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-extrabold text-xs text-slate-800">Start 1-on-1 Conversation</p>
                  <p className="text-[11px] mt-1 text-slate-600">
                    Type a reply message below to chat with {selectedConv.customer_name || 'this customer'}.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isSeller = m.sender_type === 'SELLER'
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
                    >
                      {/* Seller Messages: Light Green (#DCF8C6) on Right; Customer Messages: White (#FFFFFF) on Left */}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow ${isSeller
                          ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none border border-[#c3ebaa]'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                          }`}
                      >
                        <p className={`font-extrabold text-[10px] mb-0.5 ${isSeller ? 'text-[#075E54]' : 'text-indigo-700'}`}>
                          {isSeller ? 'Store (You)' : m.sender_name || 'Customer'}
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
                          {isSeller && <span className="text-[#34B7F1] font-bold">✓✓</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Send Reply Input Bar */}
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 border-t border-slate-300 bg-[#F0F0F0] p-3"
            >
              <input
                ref={chatInputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-900 shadow-inner focus:border-[#075E54] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#075E54] text-white shadow-md disabled:opacity-50 hover:bg-[#128C7E]"
              >
                ➔
              </button>
            </form>
          </div>
        ) : (
          conversations.length > 0 && (
            <div className="premium-card p-8 text-center bg-white">
              <p className="text-sm font-bold text-slate-600">Select a customer conversation above to view messages</p>
            </div>
          )
        )}
      </div>

      {/* Start New Chat Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Start New Customer Chat</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 text-lg font-bold hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartNewChat} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Customer Name</label>
                <input
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="premium-input mt-1 w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Customer Phone Number</label>
                <input
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="premium-input mt-1 w-full text-xs"
                  inputMode="tel"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Initial Message (Optional)</label>
                <textarea
                  value={newCustMsg}
                  onChange={(e) => setNewCustMsg(e.target.value)}
                  placeholder="Hello! How can we help you today?"
                  className="premium-input mt-1 w-full text-xs min-h-20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="secondary-button flex-1 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button flex-1 py-2.5 text-xs">
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-1 border-t bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:left-0 lg:right-0 lg:max-w-none lg:-translate-x-0 lg:mx-auto lg:w-full">
        <Link
          to={`/stores/${store.id}/manage`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Setup
        </Link>
        <Link
          to={`/stores/${store.id}/orders`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Orders
        </Link>
        <Link
          to={`/stores/${store.id}/payments`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Payments
        </Link>
        <span className="flex-1 rounded-xl bg-[#075E54] px-2 py-2 text-center text-xs font-bold text-white shadow">
          Chat
        </span>
        <Link
          to={`/stores/${store.id}/requests`}
          className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500"
        >
          Requests
        </Link>
        <Link to={`/stores/${storeId}/analytics`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Analytics</Link></nav>
    </main>
  )
}
