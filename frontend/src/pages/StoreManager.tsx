import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import NotificationBellHeader from '../components/NotificationBellHeader'
import api from '../services/api'

const errorMessage = (error: any) =>
  error?.response?.data?.detail || Object.values(error?.response?.data || {}).flat().join(' ') || 'Please check the form and try again.'

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

export default function StoreManager(){
  const { storeId } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const [store, setStore] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('0')
  const [stockQuantity, setStockQuantity] = useState('100')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [productRequests, setProductRequests] = useState<any[]>([])
  const [message, setMessage] = useState('')

  // Dedicated Bulk Product Creator State
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkMode, setBulkMode] = useState<'matrix' | 'text' | 'csv'>('matrix')
  const [bulkRows, setBulkRows] = useState<{ name: string; price: string; stock: string; image_file?: File; image_preview_url?: string }[]>([
    { name: '', price: '', stock: '100' },
    { name: '', price: '', stock: '100' },
    { name: '', price: '', stock: '100' },
    { name: '', price: '', stock: '100' },
  ])
  const [bulkRawText, setBulkRawText] = useState('')
  const [textDefaultStock, setTextDefaultStock] = useState('100')

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<{ category_name: string; name: string; price: string; description: string; stock?: string; image_url?: string; image_file?: File; image_preview_url?: string }[]>([])
  const [isImporting, setIsImporting] = useState(false)

  // Product Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)

  function openEditModal(prod: any) {
    setEditingProduct(prod)
    setEditName(prod.name || '')
    setEditPrice(String(prod.price || '0'))
    setEditStock(String(prod.stock_quantity ?? 100))
    setEditCategory(prod.category ? String(prod.category) : '')
  }

  async function handleSaveProductEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProduct) return
    setIsUpdatingProduct(true)
    try {
      await api.patch(`/products/${editingProduct.id}/`, {
        name: editName,
        price: editPrice,
        stock_quantity: parseInt(editStock || '0', 10),
        category: editCategory ? parseInt(editCategory, 10) : null
      })
      setMessage(`✏️ '${editName}' updated successfully!`)
      setEditingProduct(null)
      load()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setIsUpdatingProduct(false)
    }
  }

  // Smart Stock & Push Notification State
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  const outOfStockItems = useMemo(() => products.filter(p => Number(p.stock_quantity ?? 100) <= 0), [products])
  const lowStockItems = useMemo(() => products.filter(p => Number(p.stock_quantity ?? 100) > 0 && Number(p.stock_quantity ?? 100) <= 5), [products])

  async function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotificationPermission(perm)
      if (perm === 'granted') {
        new Notification('🔔 Notifications Activated!', {
          body: 'You will receive real-time push alerts for orders & low stock items.',
          icon: '/favicon.ico'
        })
        setMessage('🔔 Web Push Notifications Enabled! You will receive alerts on Web & PWA.')
      } else {
        setMessage('⚠️ Notification permission was denied in browser settings.')
      }
    }
  }

  async function handleQuickRestock(productId: number, currentStock: number, addAmount: number = 50) {
    const newStock = Math.max(0, currentStock) + addAmount
    try {
      await api.patch(`/products/${productId}/`, { stock_quantity: newStock })
      setMessage(`⚡ Restocked +${addAmount} units! New Stock: ${newStock}`)
      if (notificationPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        new Notification('⚡ Stock Updated', { body: `Product restocked to ${newStock} units.` })
      }
      await load()
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  // Real-Time Notification Center State
  const [notifications, setNotifications] = useState<{ id: string; type: 'order' | 'low_stock' | 'out_of_stock'; title: string; body: string; time: string; read: boolean; link?: string }[]>([
    {
      id: 'welcome',
      type: 'order',
      title: '🔔 Live Notification System Active',
      body: 'You will receive instant alerts on Web & PWA App when new orders are placed.',
      time: 'Just now',
      read: false
    }
  ])
  const [showNotifPopup, setShowNotifPopup] = useState(false)

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  // Live WebSocket Connection for Real-Time Order & Stock Push Alerts
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
          if (data.type === 'new_order' && data.order) {
            const orderRef = data.order.reference || data.order.order_number || data.order.id || 'NEW'
            const orderTotal = data.order.total || data.order.subtotal || 0
            const newNotif = {
              id: String(Date.now()),
              type: 'order' as const,
              title: `🛍️ New Order #${orderRef}`,
              body: `Total ₹${orderTotal} by ${data.order.customer_name || 'Customer'} (${data.order.customer_phone || 'No phone'})`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false,
              link: `/stores/${store.id}/orders`
            }
            setNotifications(prev => [newNotif, ...prev])
            playNotificationChime()
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(newNotif.title, {
                    body: newNotif.body,
                    icon: '/icons/multistore-icon.svg',
                    badge: '/icons/multistore-icon.svg',
                    vibrate: [200, 100, 200]
                  } as any)
                }).catch(() => {
                  new Notification(newNotif.title, { body: newNotif.body, icon: '/icons/multistore-icon.svg' })
                })
              } else {
                new Notification(newNotif.title, { body: newNotif.body, icon: '/icons/multistore-icon.svg' })
              }
            }
            setMessage(`🛍️ Live Alert: New Order #${orderRef} received for ₹${orderTotal}!`)
            load()
          } else if (data.type === 'new_customer_message') {
            const newNotif = {
              id: String(Date.now()),
              type: 'order' as const,
              title: `💬 Message from ${data.customer_name || 'Customer'}`,
              body: `"${data.text}" (${data.customer_phone || 'No phone'})`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false,
              link: `/stores/${store.id}/chat`
            }
            setNotifications(prev => [newNotif, ...prev])
            playNotificationChime()
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotif.title, { body: newNotif.body, icon: '/icons/multistore-icon.svg' })
            }
          } else if (data.type === 'new_product_request') {
            const newNotif = {
              id: String(Date.now()),
              type: 'order' as const,
              title: `📩 Product Requested: ${data.product_name}`,
              body: `Requested by ${data.customer_name} (${data.customer_phone})`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false,
              link: `/stores/${store.id}/requests`
            }
            setNotifications(prev => [newNotif, ...prev])
            playNotificationChime()
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotif.title, { body: newNotif.body, icon: '/icons/multistore-icon.svg' })
            }
          }
        } catch {}
      }
    } catch {}
    return () => { socket?.close() }
  }, [store?.id])

  function testPushNotification() {
    playNotificationChime()
    const testNotif = {
      id: String(Date.now()),
      type: 'order' as const,
      title: '🔔 Test Order Push Alert Triggered!',
      body: 'Real-time Web Push & PWA notification sound & alert working 100%.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }
    setNotifications(prev => [testNotif, ...prev])
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(testNotif.title, {
        body: testNotif.body,
        icon: '/icons/multistore-icon.svg'
      })
      setMessage('⚡ Sent test Web Push Notification!')
    } else {
      requestNotificationPermission()
    }
  }

  function markAllNotificationsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function clearAllNotifications() {
    setNotifications([])
  }

  const publicUrl = useMemo(() => store ? `${window.location.origin}/store/${store.slug}` : '', [store])

  async function load(){
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((item: any) => String(item.id) === storeId)
      setStore(found || null)
      setPhoneNumber(found?.phone_number || '')
      if (found) {
        const [categoryResult, productResult] = await Promise.all([
          api.get(`/stores/${found.id}/categories/`), api.get('/products/')
        ])
        setCategories(categoryResult.data)
        setProducts(productResult.data.filter((item: any) => item.store === found.id))
      }
    } catch {
      setMessage('Store load nahi ho paaya. Please login again.')
    }
  }

  useEffect(() => { load() }, [storeId])

  useEffect(() => {
    if (!store?.id) return
    const stored = JSON.parse(localStorage.getItem(`qs_product_requests_store_${store.id}`) || '[]')
    setProductRequests(Array.isArray(stored) ? stored : [])
  }, [store?.id])

  async function addCategory(e: React.FormEvent){
    e.preventDefault()
    if (!store || !categoryName.trim()) return
    try {
      await api.post(`/stores/${store.id}/categories/`, { name: categoryName })
      setCategoryName('')
      setMessage('Category add ho gayi.')
      load()
    } catch (error) { setMessage(errorMessage(error)) }
  }

  async function addProduct(e: React.FormEvent){
    e.preventDefault()
    if (!store || !productName.trim()) return
    try {
      const data = new FormData()
      data.append('store', String(store.id))
      data.append('name', productName)
      data.append('price', price || '0')
      data.append('stock_quantity', stockQuantity || '100')
      data.append('currency', 'INR')
      data.append('is_published', 'true')
      if (category) data.append('category', category)
      if (file) {
        data.append('digital_file', file)
        if (file.type.startsWith('image/')) data.append('image', file)
      }
      await api.post('/products/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setProductName(''); setPrice('0'); setStockQuantity('100'); setCategory(''); setFile(null)
      setMessage('Product add ho gaya.')
      load()
    } catch (error) { setMessage(errorMessage(error)) }
  }

  // Bulk Product Handlers
  function handleAddBulkRow() {
    setBulkRows(prev => [...prev, { name: '', price: '', stock: '100' }])
  }

  function handleRowChange(index: number, field: 'name' | 'price' | 'stock', value: string) {
    setBulkRows(prev => {
      const updated = [...prev]
      updated[index][field] = value
      return updated
    })
  }

  function handleRowImageSelect(index: number, file: File) {
    setBulkRows(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        image_file: file,
        image_preview_url: URL.createObjectURL(file)
      }
      return updated
    })
  }

  function handleRemoveBulkRow(index: number) {
    setBulkRows(prev => prev.filter((_, i) => i !== index))
  }

  function handleParseRawText() {
    if (!bulkRawText.trim()) return
    const lines = bulkRawText.split('\n').map(l => l.trim()).filter(Boolean)
    const parsed = lines.map(line => {
      const matchWithStock = line.match(/^(.+?)(?:[-:=]|\s+₹?|\s+INR\s+)?\s*₹?\s*(\d+(?:\.\d{1,2})?)\s*(?:[-:=,]|stock[:=]?|qty[:=]?|\s+)?\s*(\d+)?$/i)
      if (matchWithStock && matchWithStock[3]) {
        return { name: matchWithStock[1].trim(), price: matchWithStock[2].trim(), stock: matchWithStock[3].trim() }
      }
      const match = line.match(/^(.+?)(?:[-:=]|\s+₹?|\s+INR\s+)?\s*₹?\s*(\d+(?:\.\d{1,2})?)$/i)
      if (match) {
        return { name: match[1].trim(), price: match[2].trim(), stock: textDefaultStock || '100' }
      }
      return { name: line, price: '0', stock: textDefaultStock || '100' }
    })
    setBulkRows(parsed)
    setBulkMode('matrix')
    setMessage(`✨ Auto-parsed ${parsed.length} products with price & stock! Review in Form below.`)
  }

  async function handleDirectTextImport() {
    if (!store || !bulkRawText.trim()) return
    const lines = bulkRawText.split('\n').map(l => l.trim()).filter(Boolean)
    const items = lines.map(line => {
      const matchWithStock = line.match(/^(.+?)(?:[-:=]|\s+₹?|\s+INR\s+)?\s*₹?\s*(\d+(?:\.\d{1,2})?)\s*(?:[-:=,]|stock[:=]?|qty[:=]?|\s+)?\s*(\d+)?$/i)
      if (matchWithStock && matchWithStock[3]) {
        return { name: matchWithStock[1].trim(), price: matchWithStock[2].trim(), stock: matchWithStock[3].trim() }
      }
      const match = line.match(/^(.+?)(?:[-:=]|\s+₹?|\s+INR\s+)?\s*₹?\s*(\d+(?:\.\d{1,2})?)$/i)
      if (match) {
        return { name: match[1].trim(), price: match[2].trim(), stock: textDefaultStock || '100' }
      }
      return { name: line, price: '0', stock: textDefaultStock || '100' }
    }).filter(i => i.name.trim() !== '')

    if (items.length === 0) {
      setMessage('Please enter at least one product name in the text area.')
      return
    }

    setMessage('⏳ Importing products directly from text list...')
    try {
      const res = await api.post('/products/bulk-create/', {
        store_id: store.id,
        category_id: bulkCategory || null,
        products: items
      })
      setMessage(`🚀 ${res.data.created_count} products created with price & stock in 1-Click!`)
      setBulkRawText('')
      load()
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!store) return
    const validItems = bulkRows.filter(r => r.name.trim() !== '')
    if (validItems.length === 0) {
      setMessage('Please enter at least one product name.')
      return
    }

    setMessage('⏳ Adding products & uploading photos...')
    try {
      const formData = new FormData()
      formData.append('store_id', String(store.id))
      if (bulkCategory) formData.append('category_id', bulkCategory)

      const productsPayload = validItems.map((item, idx) => {
        const payloadItem: any = {
          name: item.name,
          price: item.price || '0',
          stock: item.stock || '100'
        }
        if (item.image_file) {
          const key = `img_${idx}`
          payloadItem.image_key = key
          formData.append(key, item.image_file)
        }
        return payloadItem
      })

      formData.append('products', JSON.stringify(productsPayload))

      const res = await api.post('/products/bulk-create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage(`🚀 ${res.data.created_count} products added with stock & images in 1-Click!`)
      setBulkRows([
        { name: '', price: '', stock: '100' },
        { name: '', price: '', stock: '100' },
        { name: '', price: '', stock: '100' },
        { name: '', price: '', stock: '100' }
      ])
      setBulkRawText('')
      load()
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  // CSV Import Handlers
  function downloadSampleCsv() {
    const csvContent = `Category,Product Name,Price,Stock,Description,Image URL
Bikes & Accessories,Full Face Riding Helmet,1850,50,DOT & ISI certified safety helmet,https://images.unsplash.com/photo-1558981403-c5f9899a28bc
Bikes & Accessories,Chain Lube & Cleaner Spray,399,100,High performance synthetic chain spray,https://images.unsplash.com/photo-1486006920555-c77dce18193b
Bikes & Accessories,Waterproof Bike Cover,499,35,Heavy duty UV and rain protection cover,https://images.unsplash.com/photo-1558981806-ec527fa84c39
Groceries,Organic Forest Honey 500g,450,20,100% natural raw forest honey,https://images.unsplash.com/photo-1587049352846-4a222e784d38
Groceries,Cold Pressed Coconut Oil 1L,520,40,Unrefined pure extra virgin coconut oil,https://images.unsplash.com/photo-1615485290382-441e4d049cb5
Digital Templates,WhatsApp Store Setup Guide,299,999,E-book step-by-step store setup,https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7
Digital Templates,Instagram Marketing Bundle,499,999,500+ editable Canva social posts,https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0
Electronics,Bluetooth Wireless Earbuds,1299,15,IPX7 waterproof earbuds with bass,https://images.unsplash.com/photo-1590658268037-6bf12165a8df`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'products_import_sample.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleCsvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setCsvFile(selected)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return
      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length <= 1) {
        setMessage('CSV file appears empty or missing product rows.')
        return
      }

      // Smart Delimiter Detection: tab, comma, semicolon
      const firstLine = lines[0]
      let delimiter = ','
      if (firstLine.includes('\t')) {
        delimiter = '\t'
      } else if (firstLine.includes(';') && !firstLine.includes(',')) {
        delimiter = ';'
      }

      const parseCSVLine = (lineStr: string, delim: string): string[] => {
        const result: string[] = []
        let cur = ''
        let inQuotes = false

        for (let i = 0; i < lineStr.length; i++) {
          const char = lineStr[i]
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes
          } else if (char === delim && !inQuotes) {
            result.push(cur.trim().replace(/^["']|["']$/g, ''))
            cur = ''
          } else {
            cur += char
          }
        }
        result.push(cur.trim().replace(/^["']|["']$/g, ''))
        return result
      }

      // Parse headers
      const rawHeaders = parseCSVLine(lines[0], delimiter)
      const headers = rawHeaders.map(h => h.trim().toLowerCase())
      
      let catIdx = headers.findIndex(h => h.includes('cat'))
      let nameIdx = headers.findIndex(h => h.includes('name') || h.includes('product') || h.includes('item') || h.includes('title'))
      let priceIdx = headers.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('rate') || h.includes('amt') || h.includes('amount'))
      let stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity') || h.includes('count'))
      let descIdx = headers.findIndex(h => h.includes('desc') || h.includes('details') || h.includes('note'))
      let imgIdx = headers.findIndex(h => h.includes('img') || h.includes('image') || h.includes('photo') || h.includes('pic') || h.includes('url'))

      // Fallbacks if headers weren't named standardly
      if (catIdx === -1 && rawHeaders.length >= 3) catIdx = 0
      if (nameIdx === -1 && rawHeaders.length >= 3) nameIdx = 1
      if (priceIdx === -1 && rawHeaders.length >= 3) priceIdx = 2

      const parsedItems: { category_name: string; name: string; price: string; description: string; stock?: string; image_url?: string }[] = []

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], delimiter)
        if (cols.length < 2) continue
        
        const catName = catIdx >= 0 && cols[catIdx] ? cols[catIdx] : ''
        const prodName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : (cols[0] || '')
        const rawPriceStr = priceIdx >= 0 && cols[priceIdx] ? cols[priceIdx] : (cols[2] || cols[1] || '0')
        const prodPrice = rawPriceStr.replace(/[^\d.]/g, '')
        const prodStock = stockIdx >= 0 && cols[stockIdx] ? cols[stockIdx].replace(/[^\d]/g, '') : '100'
        const prodDesc = descIdx >= 0 && cols[descIdx] ? cols[descIdx] : ''
        const prodImg = imgIdx >= 0 && cols[imgIdx] ? cols[imgIdx] : ''

        if (prodName) {
          parsedItems.push({
            category_name: catName,
            name: prodName,
            price: prodPrice || '0',
            stock: prodStock || '100',
            description: prodDesc,
            image_url: prodImg
          })
        }
      }

      setCsvPreview(parsedItems)
      setMessage(`📁 Loaded ${parsedItems.length} products with stock quantities! Next: select local images (optional) & click Import.`)
    }
    reader.readAsText(selected)
  }

  function handleLocalImagesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || csvPreview.length === 0) return

    const updated = csvPreview.map(item => {
      const matched = files.find(f => {
        const fname = f.name.toLowerCase()
        const targetImgName = (item.image_url || '').toLowerCase()
        const targetProdName = item.name.toLowerCase()
        return (
          (targetImgName && fname.includes(targetImgName)) ||
          (targetImgName && targetImgName.includes(fname.split('.')[0])) ||
          fname.includes(targetProdName) ||
          targetProdName.includes(fname.split('.')[0])
        )
      })

      if (matched) {
        return {
          ...item,
          image_file: matched,
          image_preview_url: URL.createObjectURL(matched)
        }
      }
      return item
    })

    setCsvPreview(updated)
    const matchCount = updated.filter(i => i.image_file).length
    setMessage(`🖼️ Matched ${matchCount} local product images with CSV items!`)
  }

  function handleSingleItemImageSelect(index: number, file: File) {
    const updated = [...csvPreview]
    updated[index] = {
      ...updated[index],
      image_file: file,
      image_preview_url: URL.createObjectURL(file)
    }
    setCsvPreview(updated)
  }

  async function handleCsvImport(e?: React.MouseEvent) {
    if (e) e.preventDefault()
    if (!store || csvPreview.length === 0 || isImporting) return
    setIsImporting(true)
    setMessage('⏳ Importing products, auto-creating categories & uploading images...')
    try {
      const formData = new FormData()
      formData.append('store_id', String(store.id))

      const productsPayload = csvPreview.map((item, idx) => {
        const payloadItem: any = {
          category_name: item.category_name,
          name: item.name,
          price: item.price,
          stock: item.stock || '100',
          description: item.description,
          image_url: item.image_url
        }
        if (item.image_file) {
          const key = `img_${idx}`
          payloadItem.image_key = key
          formData.append(key, item.image_file)
        }
        return payloadItem
      })

      formData.append('products', JSON.stringify(productsPayload))

      const res = await api.post('/products/bulk-create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage(`🚀 Successfully created ${res.data.created_count} products, categories & images in 1-Click!`)
      setCsvPreview([])
      setCsvFile(null)
      await load()
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setIsImporting(false)
    }
  }

  async function publish(){
    if (!store) return
    try {
      await api.post(`/stores/${store.id}/publish/`)
      setMessage('Store live ho gaya. Ab customer link share kar sakte hain.')
      load()
    } catch (error) { setMessage(errorMessage(error)) }
  }

  async function handleDirectProductImageUpload(productId: number, file: File) {
    if (!file) return
    setMessage('⏳ Uploading image to product...')
    try {
      const data = new FormData()
      data.append('image', file)
      await api.patch(`/products/${productId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage('🖼️ Product image updated successfully!')
      await load()
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  async function handleDeleteProduct(productId: number) {
    if (!window.confirm('Kya aap is product ko delete karna chahte hain?')) return
    try {
      await api.delete(`/products/${productId}/`)
      setMessage('Product deleted successfully.')
      await load()
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  async function savePhone(e: React.FormEvent){
    e.preventDefault()
    if (!store) return
    try {
      const response = await api.patch(`/stores/${store.id}/`, { phone_number: phoneNumber })
      setStore(response.data)
      setMessage('WhatsApp order number saved.')
    } catch (error) { setMessage(errorMessage(error)) }
  }

  async function toggleManageInApp(newValue: boolean){
    if (!store) return
    try {
      const response = await api.patch(`/stores/${store.id}/`, { manage_in_app: newValue })
      setStore(response.data)
      setMessage(newValue ? 'Manage in App ON ho gaya. Orders tab mein status change karke live updates de sakte hain.' : 'Manage in App OFF ho gaya.')
    } catch (error) { setMessage(errorMessage(error)) }
  }

  async function copyLink(){
    await navigator.clipboard.writeText(publicUrl)
    setMessage('Customer link copy ho gaya.')
  }

  if (!store && !message) return <div className="p-6">Loading your store...</div>
  if (!store) return <div className="p-6">{message}</div>

  return <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-24 lg:max-w-none lg:w-full">
    <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Seller workspace</p>
        <h1 className="mt-1 text-xl font-bold">{store.name}</h1>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBellHeader />
        <button onClick={() => { auth.logout(); navigate('/login') }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Logout</button>
      </div>
    </header>



    <div className="space-y-5 p-4">
    <div className="rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200">
      <p className="text-sm font-semibold text-indigo-100">Complete your store in 1 minute</p>
      <p className="mt-1 text-xl font-bold">{store.description || 'Add a category, product, then share your link.'}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{store.is_published ? '● LIVE / PUBLISHED' : '○ DRAFT STORE'}</span>
        <span className="text-xs font-medium text-indigo-100">Setup · Products · Share</span>
      </div>
    </div>

    {message && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-medium text-indigo-900">{message}</div>}

    {/* Smart Inventory Alert & Web Push/PWA Widget */}
    <div className="space-y-3">
      {/* Push Notification & PWA Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-lg">
            🔔
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">Real-Time Web Push & PWA Notifications</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${notificationPermission === 'granted' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                {notificationPermission === 'granted' ? 'Active' : 'Not Enabled'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Receive instant order alerts & low stock warnings on Mobile App (PWA) & Web Browser.</p>
          </div>
        </div>
        {notificationPermission !== 'granted' && (
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            📲 Enable Push Alerts
          </button>
        )}
      </div>

      {/* Smart Stock Warning Banner */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-rose-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs text-white font-black animate-pulse">🚨</span>
              <div>
                <h3 className="font-black text-xs text-rose-950 uppercase tracking-wider">Smart Stock Inventory Alert</h3>
                <p className="text-[11px] text-rose-800 font-medium">
                  {outOfStockItems.length > 0 && <span className="font-bold text-rose-700">{outOfStockItems.length} product(s) Out of Stock! </span>}
                  {lowStockItems.length > 0 && <span className="font-bold text-amber-700">{lowStockItems.length} product(s) Low in Stock (&le; 5 units).</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
            {outOfStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-rose-200 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700 shrink-0">OUT OF STOCK</span>
                  <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickRestock(item.id, Number(item.stock_quantity ?? 0), 50)}
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    ⚡ Restock +50
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}

            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-amber-200 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 shrink-0">ONLY {item.stock_quantity} LEFT</span>
                  <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickRestock(item.id, Number(item.stock_quantity ?? 0), 50)}
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    ⚡ Restock +50
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    <section id="settings" className="premium-card p-5">
      <p className="section-label">App Settings</p>
      <h2 className="mt-1 text-xl font-bold">Order Management Mode</h2>
      <p className="mt-1 text-sm text-slate-500">Enable in-app live status updates & tracking for orders.</p>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
        <div className="pr-3">
          <p className="font-bold text-slate-900">Manage in App</p>
          <p className="text-xs text-slate-500 mt-1">
            {store.manage_in_app
              ? '🟢 ON: Status updates active in Orders tab & live WebSockets sent to customers.'
              : '⚪ OFF: Standard WhatsApp flow. Status updates disabled in Orders tab.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleManageInApp(!store.manage_in_app)}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${store.manage_in_app ? 'bg-indigo-600' : 'bg-slate-300'}`}
        >
          <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${store.manage_in_app ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </section>

    {/* Step 01: Category Add */}
    <section id="categories" className="premium-card p-5">
      <p className="section-label">Step 01</p><h2 className="mt-1 text-xl font-bold">Category add karein</h2><p className="mt-1 text-sm text-slate-500">Customers ko products discover karne mein help karega.</p>
      <form onSubmit={addCategory} className="mt-3 flex gap-3">
        <input value={categoryName} onChange={e => setCategoryName(e.target.value)} required placeholder="e.g. E-books, Templates" className="premium-input flex-1" />
        <button className="primary-button whitespace-nowrap px-4 py-2">Add category</button>
      </form>
      {categories.length > 0 && <p className="mt-3 text-sm text-gray-600">Categories: {categories.map(item => item.name).join(', ')}</p>}
    </section>

    {/* Step 02: Single Product Addition */}
    <section id="products" className="premium-card p-5">
      <p className="section-label">Step 02</p>
      <h2 className="mt-1 text-xl font-bold">Single product add karein</h2>
      <p className="mt-1 text-sm text-slate-500">Price aur downloadable file set karke instantly publish karein.</p>
      <form onSubmit={addProduct} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input value={productName} onChange={e => setProductName(e.target.value)} required placeholder="Product name" className="premium-input" />
        <input value={price} onChange={e => setPrice(e.target.value)} required min="0" type="number" step="0.01" placeholder="Price in INR" className="premium-input" />
        <input value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} required type="number" min="0" placeholder="Stock Qty (default 100)" className="premium-input" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="premium-input"><option value="">No category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input onChange={e => setFile(e.target.files?.[0] || null)} type="file" className="premium-input" />
        <button className="primary-button bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700 sm:col-span-2">Add published product</button>
      </form>
      <p className="mt-2 text-xs text-gray-500">Digital file optional hai; upload karein to customer payment ke baad download kar sakega.</p>
      {products.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {products.map(item => (
            <div key={item.id} className="rounded-2xl bg-white p-3 text-sm flex items-center justify-between border border-slate-200 shadow-xs hover:border-slate-300 transition-all gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-12 w-12 rounded-xl object-cover border border-slate-100 shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <span className="text-lg">📷</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="font-extrabold text-emerald-600 text-xs">₹{item.price}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${Number(item.stock_quantity ?? 100) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {Number(item.stock_quantity ?? 100) > 0 ? `Stock: ${item.stock_quantity ?? 100}` : '🔴 Out of Stock'}
                    </span>
                    {item.category && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 truncate">
                        {categories.find(c => c.id === item.category)?.name || 'Category'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                  title="Edit product name, price, stock"
                >
                  ✏️ Edit
                </button>
                <label className="cursor-pointer rounded-lg bg-indigo-50 px-2 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors">
                  📷 {item.image ? 'Change' : 'Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleDirectProductImageUpload(item.id, e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(item.id)}
                  className="rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors"
                  title="Delete product"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>

    {/* Product Edit Modal */}
    {editingProduct && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Product Inventory Manager</span>
              <h3 className="text-lg font-extrabold text-slate-900">Edit Product Details</h3>
            </div>
            <button onClick={() => setEditingProduct(null)} className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 flex items-center justify-center">✕</button>
          </div>
          <form onSubmit={handleSaveProductEdit} className="mt-4 space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-800">Product Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} required className="premium-input mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800">Price (₹)</label>
                <input value={editPrice} onChange={e => setEditPrice(e.target.value)} required min="0" type="number" step="0.01" className="premium-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800">Stock Quantity</label>
                <input value={editStock} onChange={e => setEditStock(e.target.value)} required min="0" type="number" className="premium-input mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800">Category</label>
              <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="premium-input mt-1">
                <option value="">No category (Uncategorized)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Cancel</button>
              <button type="submit" disabled={isUpdatingProduct} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-black text-white shadow-md shadow-amber-200 hover:bg-amber-700 disabled:opacity-50">
                {isUpdatingProduct ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* DEDICATED STANDALONE SECTION: 1-Click Bulk & CSV Product Import */}
    <section id="bulk-import" className="premium-card border-amber-300 bg-gradient-to-br from-amber-50/70 to-orange-50/50 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
        <div>
          <span className="inline-flex rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">⚡ Killer Feature</span>
          <h2 className="mt-1 text-xl font-extrabold text-amber-950">1-Click Bulk & CSV Product Import</h2>
          <p className="mt-0.5 text-xs text-amber-800 font-medium">Upload Excel/CSV files or paste multiple products at once!</p>
        </div>
        <div className="flex rounded-xl bg-white p-1 border border-amber-200 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBulkMode('matrix')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${bulkMode === 'matrix' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            📝 Form
          </button>
          <button
            type="button"
            onClick={() => setBulkMode('text')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${bulkMode === 'text' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            ✨ Text
          </button>
          <button
            type="button"
            onClick={() => setBulkMode('csv')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${bulkMode === 'csv' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            📁 CSV File
          </button>
        </div>
      </div>

      {bulkMode === 'csv' ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
            <div>
              <p className="text-xs font-bold text-amber-950">CSV Columns Supported:</p>
              <p className="text-[11px] font-mono text-amber-800">Category, Product Name, Price, Description, Image URL</p>
            </div>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 border border-amber-300 hover:bg-amber-100"
            >
              📥 Download Sample CSV
            </button>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-white p-5 text-center shadow-xs">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvFileSelect}
              className="hidden"
              id="csv-file-input-standalone"
            />
            <label htmlFor="csv-file-input-standalone" className="cursor-pointer space-y-1.5 block">
              <span className="text-3xl">📄</span>
              <p className="text-sm font-bold text-slate-800">
                {csvFile ? csvFile.name : 'Click to select CSV / Excel File'}
              </p>
              <p className="text-xs text-slate-400">Supports .csv file exported from Excel or Sheets</p>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-100/70 p-3 rounded-xl border border-amber-300 gap-2">
            <div>
              <p className="text-xs font-bold text-amber-950">🖼️ Have local product image files on your phone/PC?</p>
              <p className="text-[11px] text-amber-800">Select multiple image files to auto-match with CSV products!</p>
            </div>
            <label className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 whitespace-nowrap text-center">
              📁 Pick Local Images
              <input type="file" accept="image/*" multiple onChange={handleLocalImagesSelect} className="hidden" />
            </label>
          </div>

          {csvPreview.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-700">Preview ({csvPreview.length} items parsed):</p>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {csvPreview.filter(i => i.image_file || i.image_url).length}/{csvPreview.length} Images Attached
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 border border-amber-200 rounded-xl bg-white p-2 text-xs">
                {csvPreview.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {item.image_preview_url || item.image_url ? (
                        <img src={item.image_preview_url || item.image_url} alt="" className="h-9 w-9 rounded-md object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0">No img</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.category_name && <span className="text-[10px] bg-indigo-50 font-bold text-indigo-600 px-1.5 py-0.5 rounded">{item.category_name}</span>}
                          <span className="text-[10px] bg-amber-100 font-bold text-amber-900 px-1.5 py-0.5 rounded">Stock: {item.stock || '100'}</span>
                          {item.image_file && <span className="text-[10px] bg-emerald-50 font-bold text-emerald-600 px-1 py-0.5 rounded">Local File attached</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="cursor-pointer rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300">
                        📷 Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => e.target.files?.[0] && handleSingleItemImageSelect(idx, e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      <span className="font-extrabold text-emerald-600">₹{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isImporting}
                onClick={handleCsvImport}
                className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50"
              >
                {isImporting ? '⏳ Importing Products & Images...' : `🚀 Import All ${csvPreview.length} Products & Images (1-Click)`}
              </button>
            </div>
          )}
        </div>
      ) : bulkMode === 'text' ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-amber-900">Target Category:</label>
              <select
                value={bulkCategory}
                onChange={e => setBulkCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-amber-300 bg-white p-2 text-xs font-semibold text-slate-800"
              >
                <option value="">No category (Uncategorized)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-amber-900">Default Stock Qty (if not in text):</label>
              <input
                type="number"
                min="0"
                value={textDefaultStock}
                onChange={e => setTextDefaultStock(e.target.value)}
                placeholder="100"
                className="mt-1 w-full rounded-xl border border-amber-300 bg-white p-2 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900">Paste product list (1 item per line):</label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">Format: Name - Price - Stock</span>
            </div>
            <textarea
              rows={5}
              value={bulkRawText}
              onChange={e => setBulkRawText(e.target.value)}
              placeholder={`Example:\nFull Face Riding Helmet - 1850 - 50\nEngine Oil 1L - 450 - 20\nChain Lube - 250 - 100\nBike Polish - 180 - 15`}
              className="mt-1 w-full rounded-xl border border-amber-300 bg-white p-3 text-xs font-mono text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleParseRawText}
              className="flex-1 rounded-xl border border-amber-400 bg-white py-2.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100"
            >
              ✨ Auto-Parse & Edit in Form
            </button>
            <button
              type="button"
              onClick={handleDirectTextImport}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
            >
              🚀 Instant 1-Click Import from Text
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleBulkSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-amber-900">Target Category:</label>
            <select
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-amber-300 bg-white p-2 text-xs font-semibold text-slate-800"
            >
              <option value="">No category (Uncategorized)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {bulkRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-1.5 rounded-xl bg-white p-2 border border-amber-200 shadow-xs">
                <span className="text-xs font-bold text-amber-700 w-4 text-center shrink-0">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder="Product Name"
                  value={row.name}
                  onChange={e => handleRowChange(idx, 'name', e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 p-1.5 text-xs font-medium focus:outline-indigo-500"
                />
                <div className="relative w-20 shrink-0">
                  <span className="absolute left-1.5 top-1.5 text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="Price"
                    value={row.price}
                    onChange={e => handleRowChange(idx, 'price', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-1.5 pl-4 text-xs font-bold text-slate-800 focus:outline-indigo-500"
                  />
                </div>
                <div className="w-16 shrink-0">
                  <input
                    type="number"
                    placeholder="Stock"
                    title="Stock Quantity"
                    value={row.stock}
                    onChange={e => handleRowChange(idx, 'stock', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-bold text-slate-800 focus:outline-indigo-500 text-center"
                  />
                </div>
                <label className="cursor-pointer rounded-lg bg-slate-100 p-1.5 hover:bg-slate-200 border border-slate-200 shrink-0" title="Attach Product Photo">
                  {row.image_preview_url ? (
                    <img src={row.image_preview_url} alt="" className="h-5 w-5 rounded object-cover" />
                  ) : (
                    <span className="text-xs">📷</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleRowImageSelect(idx, e.target.files[0])}
                    className="hidden"
                  />
                </label>
                {bulkRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBulkRow(idx)}
                    className="h-7 w-7 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={handleAddBulkRow}
              className="rounded-xl border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
            >
              + Add Row
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
            >
              🚀 Save All {bulkRows.filter(r => r.name.trim()).length} Products (1-Click)
            </button>
          </div>
        </form>
      )}
    </section>

    <section className="premium-card p-5">
      <p className="section-label">Customer requests</p>
      <h2 className="mt-1 text-xl font-bold">Product Request Queue</h2>
      <p className="mt-1 text-sm text-slate-500">Customers who searched and could not find a product will appear here.</p>
      <div className="mt-4 space-y-3">
        {productRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No product requests yet.</div>
        ) : (
          productRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{request.productName}</p>
                  <p className="mt-1 text-xs text-slate-600">Customer: {request.customerName}</p>
                  <p className="text-xs text-slate-600">Phone: {request.customerPhone}</p>
                </div>
                <a href={`https://wa.me/${String(request.customerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${request.customerName}, thanks for requesting ${request.productName}. We will contact you soon.`)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[10px] font-black text-white">Reply</a>
              </div>
              {request.message && <p className="mt-2 text-xs text-slate-600">Note: {request.message}</p>}
            </div>
          ))
        )}
      </div>
    </section>

    <section id="share" className="premium-card border-indigo-100 bg-gradient-to-br from-white to-indigo-50 p-5">
      <p className="section-label">Step 03</p><h2 className="mt-1 text-xl font-bold">Customer link share karein</h2>
      <p className="mt-2 text-sm text-gray-600">Pehle store live karein, phir yeh link WhatsApp, Instagram ya email par bhej dein.</p>
      <form onSubmit={savePhone} className="mt-4 rounded-xl border border-indigo-100 bg-white p-4"><label className="text-sm font-bold text-slate-800">WhatsApp order number</label><p className="mt-1 text-xs text-slate-500">Customer checkout par isi number par WhatsApp order message bhejega. Country code ke saath likhein, e.g. 919876543210.</p><div className="mt-3 flex gap-2"><input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="919876543210" className="premium-input flex-1" inputMode="tel" /><button className="secondary-button whitespace-nowrap">Save number</button></div></form>
      <div className="mt-4 flex flex-wrap gap-3">{store.is_published ? <span className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-200">✓ Live / Published</span> : <button onClick={publish} className="primary-button">Make store live</button>}<button onClick={copyLink} className="secondary-button">Copy customer link</button><a href={publicUrl} target="_blank" rel="noreferrer" className="secondary-button">Open store ↗</a></div>
      <code className="mt-4 block break-all rounded-xl border border-indigo-100 bg-white p-3 text-sm text-slate-600">{publicUrl}</code>
    </section>
    </div>
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-1 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] lg:left-0 lg:right-0 lg:max-w-none lg:-translate-x-0 lg:mx-auto lg:w-full"><span className="flex-1 rounded-xl bg-indigo-50 px-2 py-2 text-center text-xs font-bold text-indigo-700">Setup</span><Link to={`/stores/${store.id}/orders`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Orders</Link><Link to={`/stores/${store.id}/payments`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Payments</Link><Link to={`/stores/${store.id}/chat`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Chat</Link><Link to={`/stores/${store.id}/requests`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Requests</Link><Link to={`/stores/${store.id}/analytics`} className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-500">Analytics</Link></nav>
  </div>
}
