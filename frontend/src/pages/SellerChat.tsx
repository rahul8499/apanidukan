import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { formatPhoneForWhatsApp } from '../utils/phoneUtils'

export default function SellerChat() {
  const { storeId } = useParams()
  const location = useLocation()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [textInput, setTextInput] = useState('')
  const [searchConv, setSearchConv] = useState('')
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustMsg, setNewCustMsg] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [associatedOrder, setAssociatedOrder] = useState<any>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  const auth = useAuth()
  const navigate = useNavigate()
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [isRefreshingData, setIsRefreshingData] = useState(false)

  // Load store info and list of customer conversations
  const loadStoreAndConversations = async () => {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((x: any) => String(x.id) === storeId)
      if (!found) return navigate('/dashboard')
      setCachedStore(found)
      setStore(found)

      const convRes = await api.get(`/seller/stores/${storeId}/conversations/`)
      const nextConversations = convRes.data || []
      setConversations(nextConversations)

      const searchParams = new URLSearchParams(location.search)
      const targetConvId = searchParams.get('convId')
      const targetConv = targetConvId
        ? nextConversations.find((c: any) => String(c.id) === String(targetConvId))
        : null

      if (targetConvId && targetConv) {
        setShowNewModal(false)
        setSelectedConv(targetConv)
        setMobileView('chat')
      }
    } catch {
      navigate('/login')
    }
  }

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)

  useEffect(() => {
    if (!storeId) return
    try {
      localStorage.setItem(`unread_chat_count_${storeId}`, String(totalUnreadCount))
      window.dispatchEvent(new Event('unread_chat_updated'))
    } catch { }
  }, [totalUnreadCount, storeId])

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
      setMobileView('chat')
    } catch (err) {
      alert('Failed to start chat. Check details.')
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'C'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const filteredConvs = conversations.filter((c) => {
    const q = searchConv.trim().toLowerCase()
    if (!q) return true
    return (
      (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
      (c.customer_phone && c.customer_phone.includes(q)) ||
      (c.last_message && c.last_message.toLowerCase().includes(q))
    )
  })

  if (!store) return <div className="p-6 text-xs text-slate-500 font-bold">Loading WhatsApp Inbox...</div>

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50/90 pb-14 sm:pb-16 flex flex-col lg:max-w-none lg:w-full">
      {/* Unified Seller Header */}
      <SellerHeader store={store} activeTabTitle="WhatsApp Chat Inbox" onStoreUpdate={loadStoreAndConversations} />

      <div className="flex-1 flex flex-col p-3 sm:p-5 space-y-3">
        {/* Responsive Grid Container: List View + Chat View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 min-h-[550px]">

          {/* LEFT SIDE: Vertical WhatsApp Conversations List */}
          <div
            className={`md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'
              }`}
          >
            {/* Conversations List Header */}
            <div className="p-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h2 className="text-sm font-extrabold text-white">WhatsApp Inbox</h2>
                  {totalUnreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 shadow-md shadow-emerald-500/40 border border-emerald-400 animate-pulse">
                      {totalUnreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRefreshingData(true)
                      await loadStoreAndConversations()
                      setTimeout(() => setIsRefreshingData(false), 500)
                    }}
                    className="flex items-center gap-1 rounded-xl border border-teal-400/40 bg-teal-900/60 px-2.5 py-1.5 text-xs font-bold text-teal-200 hover:bg-teal-800 hover:text-white transition-all cursor-pointer shadow-xs"
                    title="Click to fetch live fresh chat conversations"
                  >
                    <span className={`text-xs ${isRefreshingData ? 'animate-spin' : ''}`}>🔄</span>
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewModal(true)}
                    className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-all cursor-pointer"
                  >
                    + New Chat
                  </button>
                </div>
              </div>

              {/* Search Box inside Conversations List */}
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                <input
                  type="text"
                  value={searchConv}
                  onChange={(e) => setSearchConv(e.target.value)}
                  placeholder="Search buyer name or phone..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-1.5 pl-8 pr-3 text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {/* Vertical List of Conversations */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[480px]">
              {filteredConvs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <div className="text-3xl">💬</div>
                  <p className="text-xs font-bold text-slate-800">
                    {searchConv ? 'No conversations match search' : 'No customer chats yet'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Messages from store customers will appear here in real-time.
                  </p>
                </div>
              ) : (
                filteredConvs.map((c) => {
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
                      onClick={() => {
                        setSelectedConv(c)
                        setMobileView('chat')
                      }}
                      className={`w-full p-3.5 text-left transition-all flex items-start gap-3 cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/80 border-l-4 border-l-teal-600' : 'bg-white'
                        }`}
                    >
                      {/* Avatar Circle */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xs shadow-2xs shrink-0">
                        {getInitials(c.customer_name)}
                      </div>

                      {/* Info & Snippet */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-xs text-slate-900 truncate">
                            {displayName}
                          </p>
                          {c.last_message_at && (
                            <span className="text-[10px] font-medium text-slate-400 shrink-0">
                              {new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        {c.customer_phone && (
                          <p className="text-[10px] font-mono font-semibold text-indigo-600">
                            📞 {c.customer_phone}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <p className="text-[11px] text-slate-500 truncate font-medium">
                            {c.last_message || 'Chat started'}
                          </p>
                          {c.unread_count > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 shadow-md shadow-emerald-500/30 border border-emerald-400 animate-pulse shrink-0">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Active Chat Room Window */}
          <div
            className={`md:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'
              }`}
          >
            {selectedConv ? (
              <div className="flex-1 flex flex-col h-[520px] bg-[#E5DDD5]">
                {/* Chat Room Top Bar */}
                <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3 text-white shadow-xs">
                  <div className="flex items-center gap-3">
                    {/* Back button for mobile view */}
                    <button
                      type="button"
                      onClick={() => setMobileView('list')}
                      className="md:hidden rounded-lg bg-white/10 p-1.5 text-xs text-white hover:bg-white/20 font-bold"
                    >
                      ⬅️
                    </button>

                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 font-extrabold text-white text-xs shadow-2xs">
                      {getInitials(selectedConv.customer_name)}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-xs text-white leading-tight">
                        {selectedConv.customer_name && !selectedConv.customer_name.startsWith('Guest Buyer')
                          ? selectedConv.customer_name
                          : selectedConv.customer_phone
                            ? `Customer (${selectedConv.customer_phone})`
                            : selectedConv.customer_name || 'Customer'}
                      </h3>
                      <p className="text-[10px] text-teal-300 font-medium">
                        {selectedConv.customer_phone ? `📞 ${selectedConv.customer_phone}` : 'Storefront Buyer'} • Live Chat
                      </p>
                    </div>
                  </div>

                  {selectedConv.customer_phone && (
                    <a
                      href={`https://wa.me/${formatPhoneForWhatsApp(selectedConv.customer_phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      WhatsApp ↗
                    </a>
                  )}
                </div>

                {/* Prominent Associated Order Banner */}
                {associatedOrder ? (
                  <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between text-xs text-amber-950">
                    <div>
                      <p className="font-extrabold text-amber-950 flex items-center gap-1.5">
                        <span>📦 Order #{associatedOrder.reference}</span>
                        <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded text-[10px] font-bold">
                          {associatedOrder.status}
                        </span>
                      </p>
                      <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                        Total: <strong>₹{associatedOrder.total}</strong> • {associatedOrder.payment_type === 'COD' ? '💵 COD' : '💳 Online'}
                      </p>
                    </div>
                    <Link
                      to={`/store/${store.slug}/order/${associatedOrder.reference}`}
                      target="_blank"
                      className="rounded-xl bg-slate-900 text-white px-3 py-1 text-[10px] font-bold shadow-xs hover:bg-slate-800"
                    >
                      View Order ↗
                    </Link>
                  </div>
                ) : (
                  <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-200 text-[11px] text-slate-600 font-semibold flex items-center justify-between">
                    <span>💬 Storefront Inquiry</span>
                    <span className="text-[10px] text-slate-400 font-medium">Direct 1-on-1</span>
                  </div>
                )}

                {/* Chat Messages History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5]/90">
                  {messages.length === 0 ? (
                    <div className="my-auto text-center p-6 bg-white/90 rounded-2xl border border-slate-200 shadow-2xs max-w-xs mx-auto">
                      <p className="font-extrabold text-xs text-slate-800">Start 1-on-1 Conversation</p>
                      <p className="text-[11px] mt-1 text-slate-500">
                        Type a reply message below to chat live with {selectedConv.customer_name || 'this customer'}.
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
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs ${isSeller
                              ? 'bg-teal-700 text-white rounded-tr-none'
                              : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                              }`}
                          >
                            <p className={`font-extrabold text-[10px] mb-0.5 ${isSeller ? 'text-teal-200' : 'text-indigo-600'}`}>
                              {isSeller ? 'Store (You)' : m.sender_name || 'Customer'}
                            </p>
                            <p className="whitespace-pre-wrap leading-relaxed text-xs font-medium">
                              {m.text}
                            </p>
                            <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${isSeller ? 'text-teal-200' : 'text-slate-400'}`}>
                              <span>
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isSeller && <span className="text-teal-300 font-black">✓✓</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Reply Message Input Bar */}
                <form
                  onSubmit={sendMessage}
                  className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
                >
                  <input
                    ref={chatInputRef}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your reply message..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white font-black text-sm shadow-xs disabled:opacity-50 hover:bg-teal-700 cursor-pointer transition-all shrink-0"
                  >
                    ➔
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center space-y-3">
                <div className="text-4xl">💬</div>
                <h3 className="text-sm font-extrabold text-slate-900">Select a Conversation</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Choose a customer conversation from the left vertical list to view and reply to messages.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Start New Chat Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-extrabold text-slate-900">Start New Customer Chat</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 text-sm font-bold hover:text-slate-700 cursor-pointer"
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
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Customer Phone Number</label>
                <input
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:outline-none"
                  inputMode="tel"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Initial Message (Optional)</label>
                <textarea
                  value={newCustMsg}
                  onChange={(e) => setNewCustMsg(e.target.value)}
                  placeholder="Hello! How can we help you today?"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:outline-none min-h-20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-all cursor-pointer"
                >
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="chat" />
    </main>
  )
}
