import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import NotificationBellHeader from '../components/NotificationBellHeader'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import api from '../services/api'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import StoreQrStandeeModal from '../components/StoreQrStandeeModal'
import SellerOnboardingGuideModal from '../components/SellerOnboardingGuideModal'
import { useTranslation } from 'react-i18next'
import { BUSINESS_TYPES, getBusinessType, getBusinessTypeTitle, getBusinessTypeCategories, getBusinessTypeProducts, getBusinessTypeCheckoutHint, getUnitDisplayLabel, getUnitHint, formatUnitDisplay, UNIT_LABEL_MAP } from '../utils/businessTypes'
import { X, Trash2 } from 'lucide-react'

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
  } catch { }
}

export default function StoreManager() {
  const { t, i18n } = useTranslation()
  const { storeId } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [categories, setCategories] = useState<any[]>([])
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null)
  const [isDeletingProduct, setIsDeletingProduct] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('0')
  const [stockQuantity, setStockQuantity] = useState('100')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [productImages, setProductImages] = useState<File[]>([])
  const [productPrimaryIndex, setProductPrimaryIndex] = useState<number>(0)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [productRequests, setProductRequests] = useState<any[]>([])
  const [message, setMessage] = useState('')

  // Dedicated Bulk Product Creator State
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkMode, setBulkMode] = useState<'matrix' | 'text' | 'csv'>('csv')
  const [bulkRows, setBulkRows] = useState<{ name: string; price: string; stock: string; image_files?: File[]; image_preview_urls?: string[] }[]>([
    { name: '', price: '', stock: '100' },
    { name: '', price: '', stock: '100' },
    { name: '', price: '', stock: '100' },
    { name: '', price: '', stock: '100' },
  ])
  const [bulkRawText, setBulkRawText] = useState('')
  const [textDefaultStock, setTextDefaultStock] = useState('100')

  // CSV Import & Collapsible Feature State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<{ category_name: string; name: string; price: string; description: string; stock?: string; image_url?: string; image_file?: File; image_preview_url?: string }[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [isKillerFeatureOpen, setIsKillerFeatureOpen] = useState(false)
  const [guideModalType, setGuideModalType] = useState<'csv' | 'text' | 'matrix' | null>(null)

  // Product Edit Modal & Sidebar Drawer State
  const [productUnit, setProductUnit] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isPublishingStore, setIsPublishingStore] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [showDemoCsvModal, setShowDemoCsvModal] = useState(false)
  const [demoCsvViewMode, setDemoCsvViewMode] = useState<'table' | 'raw'>('table')
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([])
  const [isBulkDeletingCats, setIsBulkDeletingCats] = useState(false)
  const [showBulkDeleteCatModal, setShowBulkDeleteCatModal] = useState(false)

  // Universal Reusable Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'primary' | 'success'
    onConfirm: () => void | Promise<void>
  } | null>(null)

  function requestPublish() {
    if (!store) return
    const isGoingLive = !store.is_published
    setConfirmModal({
      isOpen: true,
      title: isGoingLive ? '🚀 Store Live Karayche?' : '⏸️ Store Draft Mode Karayche?',
      message: isGoingLive
        ? 'तुम्हाला तुमचे दुकान ऑनलाईन Live (Publish) करायचे आहे का? ग्राहक दुकान पाहू शकतील आणि ऑर्डर देऊ शकतील.'
        : 'तुम्हाला दुकान Draft मोडवर ठेवायचे आहे का? ग्राहक दुकान ऑनलाईन पाहू शकणार नाहीत.',
      confirmText: isGoingLive ? '🚀 Yes, Make Live' : 'Yes, Set to Draft',
      cancelText: 'Cancel',
      variant: isGoingLive ? 'success' : 'warning',
      onConfirm: publish
    })
  }

  function requestAutoCreateSampleCategories() {
    if (!store) return
    const currentBType = getBusinessType(store.business_type)
    const bTitle = getBusinessTypeTitle(currentBType, i18n.language || 'mr')
    setConfirmModal({
      isOpen: true,
      title: `⚡ 1-Click Ready Categories Add Karayche?`,
      message: `तुम्हाला "${bTitle}" व्यवसायासाठी तयार कॅटेगरीज दुकानात १-क्लिकमध्ये जोडायचे आहेत का? (फक्त कॅटेगरीज जोडल्या जातील, प्रॉडक्ट्स नाही)`,
      confirmText: '⚡ Yes, Import Categories',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: handleAutoCreateSampleCategories
    })
  }

  function requestUpdateBusinessType(newType: string) {
    if (!store || newType === store.business_type) return
    const bTitle = getBusinessTypeTitle(getBusinessType(newType), i18n.language || 'mr')
    setConfirmModal({
      isOpen: true,
      title: 'Business Category Badlaychi?',
      message: `तुम्हाला दुकानाची श्रेणी "${bTitle}" मध्ये बदलावायची आहे का? यामुळे चेकाऊट नियम आणि युनिट्स अपडेट होतील.`,
      confirmText: '⚙️ Yes, Change',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: () => handleUpdateBusinessType(newType)
    })
  }

  function requestBulkDeleteCategories() {
    if (selectedCatIds.length === 0) return
    setConfirmModal({
      isOpen: true,
      title: `🗑️ Delete ${selectedCatIds.length} Selected Categories?`,
      message: `तुम्हाला निवडलेल्या ${selectedCatIds.length} कॅटेगरीज दुकानातून कायमच्या डिलीट करायच्या आहेत का?`,
      confirmText: `🗑️ Yes, Delete (${selectedCatIds.length})`,
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: confirmBulkDeleteCategories
    })
  }

  function openEditModal(prod: any) {
    setEditingProduct(prod)
    setEditName(prod.name || '')
    setEditPrice(String(prod.price || '0'))
    setEditStock(String(prod.stock_quantity ?? 100))
    setEditCategory(prod.category ? String(prod.category) : '')
    setEditUnit(prod.unit || getBusinessType(store?.business_type).defaultUnit)
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
        category: editCategory ? parseInt(editCategory, 10) : null,
        unit: editUnit || 'Pc'
      })
      toast.success(`✏️ '${editName}' updated successfully!`)
      setEditingProduct(null)
      load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setIsUpdatingProduct(false)
    }
  }

  async function handleUpdateBusinessType(newType: string) {
    if (!store) return
    const loadingId = toast.loading('Updating business category...')
    try {
      const res = await api.patch(`/stores/${store.id}/`, { business_type: newType })
      setStore(res.data)
      setCachedStore(res.data)
      toast.success(`🎉 Business Category set to ${getBusinessType(newType).name}!`, { id: loadingId })
    } catch (err) {
      toast.error(errorMessage(err), { id: loadingId })
    }
  }

  async function handleAutoCreateSampleCategories() {
    if (!store) return
    const currentBType = getBusinessType(store.business_type)
    const activeLang = i18n.language || 'mr'
    const sampleCats = getBusinessTypeCategories(currentBType, activeLang)
    const bTitle = getBusinessTypeTitle(currentBType, activeLang)

    const loadingId = toast.loading(`Creating preset categories for ${bTitle}...`)
    try {
      let createdCats = 0
      for (const catName of sampleCats) {
        if (!categories.some(c => c.name.toLowerCase() === catName.toLowerCase())) {
          await api.post(`/stores/${store.id}/categories/`, { name: catName })
          createdCats++
        }
      }

      toast.success(`✨ ${createdCats > 0 ? `${createdCats} new categories` : 'Categories already exist'} added for ${bTitle}!`, { id: loadingId })
      load()
    } catch (err) {
      toast.error(errorMessage(err), { id: loadingId })
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
        toast.success('🔔 Web Push Notifications Enabled! You will receive alerts on Web & PWA.')
      } else {
        toast.error('⚠️ Notification permission was denied in browser settings.')
      }
    }
  }

  async function handleQuickRestock(productId: number, currentStock: number, addAmount: number = 50) {
    const newStock = Math.max(0, currentStock) + addAmount
    try {
      await api.patch(`/products/${productId}/`, { stock_quantity: newStock })
      toast.success(`⚡ Restocked +${addAmount} units! New Stock: ${newStock}`)
      if (notificationPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        new Notification('⚡ Stock Updated', { body: `Product restocked to ${newStock} units.` })
      }
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
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
        } catch { }
      }
    } catch { }
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
        icon: '/favicon.ico'
      })
      toast.success('⚡ Sent test Web Push Notification!')
    } else {
      requestNotificationPermission()
    }
  }

  const [showOnboardingModal, setShowOnboardingModal] = useState(false)

  function markAllNotificationsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function clearAllNotifications() {
    setNotifications([])
  }

  const [showQrModal, setShowQrModal] = useState(false)

  const publicUrl = useMemo(() => store ? `${window.location.origin}/store/${store.slug}` : '', [store])

  const whatsappShareUrl = useMemo(() => {
    if (!store?.name || !publicUrl) return ''
    const inviteMsg = `🛍️ *${store.name}* me aapka swagat hai!\n\nAap hamari dukaan se ghar baithe saara samaan online order kar sakte hain. Direct WhatsApp checkout & Fast Doorstep Delivery! 🚀\n\n👇 *Store Check Karein & Order Karein:*\n${publicUrl}`
    return `https://wa.me/?text=${encodeURIComponent(inviteMsg)}`
  }, [store?.name, publicUrl])

  async function load() {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((item: any) => String(item.id) === storeId)
      if (found) setCachedStore(found)
      setStore(found || null)
      setPhoneNumber(found?.phone_number || '')
      if (found) {
        const hideKey = `qs_hide_seller_tour_${found.id}`
        const hiddenInStorage = localStorage.getItem(hideKey) === 'true'
        if (!found.has_seen_onboarding_tour && !hiddenInStorage) {
          setShowOnboardingModal(true)
        }

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

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!store || !categoryName.trim()) return
    setIsAddingCategory(true)
    try {
      await api.post(`/stores/${store.id}/categories/`, { name: categoryName })
      setCategoryName('')
      toast.success('Category add ho gayi.')
      load()
    } catch (error) { toast.error(errorMessage(error)) }
    finally {
      setIsAddingCategory(false)
    }
  }

  function promptDeleteCategory(catId: number, catName: string) {
    setCategoryToDelete({ id: catId, name: catName })
  }

  async function confirmDeleteCategory() {
    if (!categoryToDelete) return
    setIsDeletingCategory(true)
    try {
      await api.delete(`/categories/${categoryToDelete.id}/`)
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id))
      toast.success(`Category "${categoryToDelete.name}" delete jhali!`)
      setCategoryToDelete(null)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setIsDeletingCategory(false)
    }
  }

  function toggleSelectCat(id: number) {
    setSelectedCatIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
  }

  function toggleSelectAllCats() {
    if (selectedCatIds.length === categories.length) {
      setSelectedCatIds([])
    } else {
      setSelectedCatIds(categories.map(c => c.id))
    }
  }

  async function confirmBulkDeleteCategories() {
    if (selectedCatIds.length === 0) return
    setIsBulkDeletingCats(true)
    const toastId = toast.loading(`⏳ Deleting ${selectedCatIds.length} categories...`)
    try {
      await Promise.all(selectedCatIds.map(id => api.delete(`/categories/${id}/`)))
      setCategories(prev => prev.filter(c => !selectedCatIds.includes(c.id)))
      toast.success(`🗑️ Successfully deleted ${selectedCatIds.length} categories!`, { id: toastId })
      setSelectedCatIds([])
      setShowBulkDeleteCatModal(false)
    } catch (error) {
      toast.error(errorMessage(error), { id: toastId })
    } finally {
      setIsBulkDeletingCats(false)
    }
  }

  function requestAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!store) return

    if (!productName.trim()) {
      toast.error('⚠️ Product Name is required!')
      return
    }

    if (!price || Number(price) <= 0) {
      toast.error('⚠️ Product Price is required and must be greater than ₹0!')
      return
    }

    if (!category) {
      toast.error('⚠️ Category is required! Please select a category (or add one in Step 02 first).')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: `⚡ Publish "${productName}" to Store?`,
      message: `तुम्हाला "${productName}" (₹${price}) हा प्रॉडक्ट दुकानात पब्लिश करायचा आहे का?`,
      confirmText: '🚀 Yes, Publish Product',
      cancelText: 'Cancel',
      variant: 'success',
      onConfirm: () => executeAddProduct()
    })
  }

  async function executeAddProduct() {
    if (!store || !productName.trim()) return
    setIsAddingProduct(true)
    const toastId = toast.loading('⏳ Uploading images & publishing product to S3 Cloud...')
    try {
      const data = new FormData()
      data.append('store', String(store.id))
      data.append('name', productName)
      data.append('price', price || '0')
      data.append('stock_quantity', stockQuantity || '100')
      data.append('currency', 'INR')
      data.append('is_published', 'true')
      data.append('unit', productUnit || getBusinessType(store?.business_type).defaultUnit)
      if (category) data.append('category', category)
      if (file) {
        data.append('digital_file', file)
      }

      // Multiple Images Support & Primary Card Image Selection
      const primaryFile = productImages[productPrimaryIndex] || (productImages.length > 0 ? productImages[0] : null)
      if (primaryFile) {
        data.append('image', primaryFile)
      }

      if (productImages.length > 0) {
        productImages.forEach((imgFile) => {
          data.append('images', imgFile)
        })
      } else if (file && file.type.startsWith('image/')) {
        data.append('image', file)
      }

      await api.post('/products/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      const addedName = productName
      setProductName(''); setPrice('0'); setStockQuantity('100'); setCategory(''); setFile(null); setProductImages([]); setProductPrimaryIndex(0)
      toast.success(`🎉 SUCCESS: Product '${addedName}' published to store with ${productImages.length || 1} photo(s)!`, { id: toastId })
      load()
    } catch (error) {
      toast.error(errorMessage(error), { id: toastId })
    } finally {
      setIsAddingProduct(false)
    }
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

  function handleRowImageSelect(index: number, files: File[]) {
    setBulkRows(prev => {
      const updated = [...prev]
      const currentFiles = updated[index].image_files || []
      const combinedFiles = [...currentFiles, ...files]
      const previewUrls = combinedFiles.map(f => URL.createObjectURL(f))
      updated[index] = {
        ...updated[index],
        image_files: combinedFiles,
        image_preview_urls: previewUrls
      }
      return updated
    })
  }

  function handleRemoveRowImage(rowIndex: number, imgIndex: number) {
    setBulkRows(prev => {
      const updated = [...prev]
      const currentFiles = updated[rowIndex].image_files || []
      const filteredFiles = currentFiles.filter((_, i) => i !== imgIndex)
      const previewUrls = filteredFiles.map(f => URL.createObjectURL(f))
      updated[rowIndex] = {
        ...updated[rowIndex],
        image_files: filteredFiles,
        image_preview_urls: previewUrls
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
      toast.error('Please enter at least one product name in the text area.')
      return
    }

    const toastId = toast.loading('⏳ Importing products directly from text list...')
    try {
      const res = await api.post('/products/bulk-create/', {
        store_id: store.id,
        category_id: bulkCategory || null,
        products: items
      })
      toast.success(`🚀 ${res.data.created_count} products created with price & stock in 1-Click!`, { id: toastId })
      setBulkRawText('')
      load()
    } catch (error) {
      toast.error(errorMessage(error), { id: toastId })
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!store) return
    const validItems = bulkRows.filter(r => r.name.trim() !== '')
    if (validItems.length === 0) {
      toast.error('Please enter at least one product name.')
      return
    }

    const toastId = toast.loading('⏳ Adding products & uploading photos...')
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
        if (item.image_files && item.image_files.length > 0) {
          const keys: string[] = []
          item.image_files.forEach((imgFile, imgIdx) => {
            const key = `img_${idx}_${imgIdx}`
            keys.push(key)
            formData.append(key, imgFile)
          })
          payloadItem.image_keys = keys
        }
        return payloadItem
      })

      formData.append('products', JSON.stringify(productsPayload))

      const res = await api.post('/products/bulk-create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`🚀 ${res.data.created_count} products added with stock & images in 1-Click!`, { id: toastId })
      setBulkRows([
        { name: '', price: '', stock: '100' },
        { name: '', price: '', stock: '100' },
        { name: '', price: '', stock: '100' },
        { name: '', price: '', stock: '100' }
      ])
      setBulkRawText('')
      load()
    } catch (error) {
      toast.error(errorMessage(error), { id: toastId })
    }
  }

  // CSV Import Handlers
  function downloadSampleCsv() {
    const currentBType = getBusinessType(store?.business_type)
    const header = 'Category,Product Name,Price,Stock,Unit,Description,Image URL\n'
    
    let rows = ''
    if (currentBType.sampleProducts && currentBType.sampleProducts.length > 0) {
      rows = currentBType.sampleProducts.map(sp => 
        `"${sp.category}","${sp.name}",${sp.price},${sp.stock},"${sp.unit}","Quality ${sp.name} for your store","${sp.image || ''}"`
      ).join('\n')
    } else {
      rows = `General Products,Sample Item 1,199,50,Pc,Sample description,"sample1.jpg, sample2.jpg"`
    }

    const csvContent = header + rows
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${(store?.slug || 'store')}_sample_products_import.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function downloadSampleText() {
    const currentBType = getBusinessType(store?.business_type)
    let textContent = ''
    if (currentBType.sampleProducts && currentBType.sampleProducts.length > 0) {
      textContent = currentBType.sampleProducts.map(sp => `${sp.name} - ${sp.price} - ${sp.stock} - ${sp.unit}`).join('\n')
    } else {
      textContent = `Full Face Riding Helmet - 1850 - 50 - Pc\nEngine Oil 1L - 450 - 20 - Litre\nSugar - 42 - 100 - Kg`
    }
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${(store?.slug || 'store')}_sample_products_text_list.txt`)
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
      let unitIdx = headers.findIndex(h => h.includes('unit') || h.includes('measure') || h.includes('pkg'))
      let descIdx = headers.findIndex(h => h.includes('desc') || h.includes('details') || h.includes('note'))
      let imgIdx = headers.findIndex(h => h.includes('img') || h.includes('image') || h.includes('photo') || h.includes('pic') || h.includes('url'))

      // Fallbacks if headers weren't named standardly
      if (catIdx === -1 && rawHeaders.length >= 3) catIdx = 0
      if (nameIdx === -1 && rawHeaders.length >= 3) nameIdx = 1
      if (priceIdx === -1 && rawHeaders.length >= 3) priceIdx = 2

      const parsedItems: { category_name: string; name: string; price: string; description: string; stock?: string; unit?: string; image_url?: string }[] = []

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], delimiter)
        if (cols.length < 2) continue

        const catName = catIdx >= 0 && cols[catIdx] ? cols[catIdx] : ''
        const prodName = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : (cols[0] || '')
        const rawPriceStr = priceIdx >= 0 && cols[priceIdx] ? cols[priceIdx] : (cols[2] || cols[1] || '0')
        const prodPrice = rawPriceStr.replace(/[^\d.]/g, '')
        const prodStock = stockIdx >= 0 && cols[stockIdx] ? cols[stockIdx].replace(/[^\d]/g, '') : '100'
        const prodUnit = unitIdx >= 0 && cols[unitIdx] ? cols[unitIdx] : ''
        const prodDesc = descIdx >= 0 && cols[descIdx] ? cols[descIdx] : ''
        const prodImg = imgIdx >= 0 && cols[imgIdx] ? cols[imgIdx] : ''

        if (prodName) {
          parsedItems.push({
            category_name: catName,
            name: prodName,
            price: prodPrice || '0',
            stock: prodStock || '100',
            unit: prodUnit,
            description: prodDesc,
            image_url: prodImg
          })
        }
      }

      setCsvPreview(parsedItems)
      toast.success(`📁 Loaded ${parsedItems.length} products with stock quantities! Next: select local images (optional) & click Import.`)
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
    toast.success(`🖼️ Matched ${matchCount} local product images with CSV items!`)
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
      toast.success(`🚀 Successfully created ${res.data.created_count} products, categories & images in 1-Click!`)
      setCsvPreview([])
      setCsvFile(null)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setIsImporting(false)
    }
  }

  async function publish() {
    if (!store) return
    setIsPublishingStore(true)
    const loadingToast = toast.loading('Publishing store...')
    try {
      await api.post(`/stores/${store.id}/publish/`)
      toast.success('🚀 SUCCESS: Store LIVE ho gaya! Customer link active hai.', { id: loadingToast })
      load()
    } catch (error) {
      toast.error(errorMessage(error), { id: loadingToast })
    } finally {
      setIsPublishingStore(false)
    }
  }

  async function handleDirectProductImageUpload(productId: number, file: File) {
    if (!file) return
    const loadingToast = toast.loading('⏳ Uploading image to product...')
    try {
      const data = new FormData()
      data.append('image', file)
      await api.patch(`/products/${productId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('🖼️ Product image updated successfully!', { id: loadingToast })
      await load()
    } catch (error) {
      toast.error(errorMessage(error), { id: loadingToast })
    }
  }

  function promptDeleteProduct(prod: any) {
    setProductToDelete({ id: prod.id, name: prod.name })
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return
    setIsDeletingProduct(true)
    try {
      await api.delete(`/products/${productToDelete.id}/`)
      toast.success(`Product "${productToDelete.name}" deleted!`)
      setProductToDelete(null)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setIsDeletingProduct(false)
    }
  }

  async function savePhone(e: React.FormEvent) {
    e.preventDefault()
    if (!store) return
    try {
      const response = await api.patch(`/stores/${store.id}/`, { phone_number: phoneNumber })
      setStore(response.data)
      toast.success('WhatsApp order number saved.')
    } catch (error) { toast.error(errorMessage(error)) }
  }

  async function toggleManageInApp(newValue: boolean) {
    if (!store) return
    try {
      const response = await api.patch(`/stores/${store.id}/`, { manage_in_app: newValue })
      setStore(response.data)
      toast.success(newValue ? 'Manage in App ON ho gaya. Orders tab mein status change karke live updates de sakte hain.' : 'Manage in App OFF ho gaya.')
    } catch (error) { toast.error(errorMessage(error)) }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    toast.success('Customer link copy ho gaya.')
  }

  if (!store && !message) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50/80">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm font-bold text-slate-500 animate-pulse">Loading your store...</p>
      </div>
    </div>
  )
  if (!store) return <div className="p-6 text-red-500 font-bold text-center">{message}</div>
  return <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50/80 pb-14 sm:pb-16 lg:max-w-none lg:w-full">
    {/* Unified Seller Header */}
    <SellerHeader store={store} activeTabTitle="Store Setup" onStoreUpdate={load} />

    <div className="space-y-3 sm:space-y-5 p-2.5 sm:p-6">

      {/* Enterprise Store Status Banner — Compact & Powerful Mobile Express Launcher */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-3 sm:p-6 text-white shadow-md sm:shadow-2xl border border-indigo-500/30 backdrop-blur-xl">
        {/* Glow & Sparkle Accents */}
        <div className="absolute -top-20 -right-20 h-36 sm:h-56 w-36 sm:w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-36 sm:h-56 w-36 sm:w-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] sm:text-[10px] font-black uppercase text-emerald-300 border border-emerald-400/40 tracking-wider shadow-xs">
                {t('expressLauncher')}
              </span>
              <span className="text-[9px] sm:text-xs font-extrabold text-amber-300">
                1-Min Setup
              </span>
            </div>

            {/* Mobile vs Desktop Title */}
            <h1 className="text-sm sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight leading-tight">
              {t('expressSetupTitle')}
            </h1>

            {/* Mobile vs Desktop Sub-text */}
            <p className="text-[10px] sm:text-xs text-slate-300 font-medium max-w-xl leading-snug sm:leading-relaxed">
              {t('expressSetupSubtext')}
            </p>
          </div>

          <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5 sm:gap-2.5 shrink-0 border-t border-white/10 sm:border-t-0 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={requestPublish}
              title={store.is_published ? "Store is LIVE (Click to set Draft)" : "Click to Make Store LIVE"}
              className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1 text-[9px] sm:text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${store.is_published
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300 hover:from-emerald-600 hover:to-teal-700 animate-pulse'
                }`}
            >
              <span className={`h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full ${store.is_published ? 'bg-emerald-400 animate-ping' : 'bg-white'}`} />
              <span>{store.is_published ? t('liveStore') : t('makeStoreLive')}</span>
            </button>
            <span className="text-[9px] sm:text-[11px] font-extrabold text-indigo-300">
              {t('orderLinkReady')}
            </span>
          </div>
        </div>
      </div>

      {/* Step 01: Storefront & WhatsApp Order Channel Setup - Sleek Compact Card */}
      <section id="share" className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs space-y-2.5 transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white text-[10px] font-black shadow-xs">
              01
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900">{t('step1Title')}</h2>
              <p className="text-[10px] text-slate-500 font-medium">{t('step1Subtext')}</p>
            </div>
          </div>
          {store.is_published ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          ) : (
            <button onClick={publish} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white shadow-2xs hover:bg-emerald-700 cursor-pointer">
              🚀 Make Live
            </button>
          )}
        </div>

        {/* 2-Column Responsive Row: Left WhatsApp Phone, Right Link & Share Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
          {/* WhatsApp Phone Form */}
          <form onSubmit={savePhone} className="md:col-span-5 flex flex-col justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                <span>📲 WhatsApp Order Phone</span>
              </label>
              <span className="text-[9px] font-mono text-slate-400">Direct Orders</span>
            </div>
            <div className="flex gap-1.5">
              <input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="919876543210"
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none shadow-2xs"
                inputMode="tel"
              />
              <button className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 shrink-0 cursor-pointer shadow-2xs">
                Save
              </button>
            </div>
          </form>

          {/* Storefront Link & Action Buttons */}
          <div className="md:col-span-7 flex flex-col justify-between bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 space-y-1.5">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="text-xs">🌐</span>
                <span className="text-[11px] sm:text-xs font-black text-indigo-900 truncate font-mono">{publicUrl}</span>
              </div>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-black text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shrink-0 shadow-2xs"
              >
                Open ↗
              </a>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-2 py-1 text-[10px] font-black text-white hover:brightness-110 shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span>🖨️ QR Standee</span>
              </button>

              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2 py-1 text-[10px] font-black text-white hover:bg-[#20ba5a] shadow-2xs cursor-pointer whitespace-nowrap"
                title="Share on WhatsApp"
              >
                <span>📲 WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={copyLink}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-white hover:bg-slate-800 shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <span>📋 Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* DEDICATED STANDALONE SECTION: Ultra-Premium Collapsible 1-Click Bulk & CSV Product Import */}
      <section id="bulk-import" className="relative overflow-hidden rounded-xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-3.5 sm:p-6 text-white shadow-md sm:shadow-2xl transition-all backdrop-blur-xl group hover:border-amber-400/50">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div
          onClick={() => {
            const nextState = !isKillerFeatureOpen
            setIsKillerFeatureOpen(nextState)
            if (nextState) setBulkMode('csv')
          }}
          className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 cursor-pointer select-none"
        >
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2 py-0.2 text-[8px] sm:text-[10px] font-black uppercase text-slate-950 shadow-xs tracking-wider">
                {t('killerFeature')}
              </span>
              <span className="text-[10px] sm:text-xs font-extrabold text-amber-200/90 tracking-wide">
                {t('expressEngine')}
              </span>
            </div>
            <h2 className="mt-1 text-sm sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200">
              {t('bulkImportTitle')}
            </h2>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-300 font-medium leading-tight">
              {t('bulkImportSubtext')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
            {isKillerFeatureOpen && (
              <div onClick={e => e.stopPropagation()} className="flex rounded-lg sm:rounded-2xl bg-white/10 p-0.5 sm:p-1 border border-amber-400/20 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setBulkMode('matrix')}
                  className={`rounded-md sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition-all ${bulkMode === 'matrix'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                    }`}
                >
                  {t('gridMode')}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('text')}
                  className={`rounded-md sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition-all ${bulkMode === 'text'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                    }`}
                >
                  {t('textMode')}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('csv')}
                  className={`rounded-md sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition-all ${bulkMode === 'csv'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                    }`}
                >
                  {t('csvMode')}
                </button>
              </div>
            )}

            <button
              type="button"
              className="rounded-lg sm:rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500 to-yellow-600 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-black text-slate-950 shadow-xs hover:brightness-110 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>{isKillerFeatureOpen ? '▲ Collapse' : '⚡ Setup (Expand ▾)'}</span>
            </button>
          </div>
        </div>

        {isKillerFeatureOpen && (
          <div className="pt-4 border-t border-indigo-800/50 mt-3 animate-in fade-in duration-200 text-slate-900">
            {bulkMode === 'csv' ? (
              <div className="space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>📊 CSV Columns Supported:</span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">Multi-Image Active</span>
                    </p>
                    <p className="text-[11px] font-mono text-slate-600 mt-0.5">Category, Product Name, Price, Stock, Unit, Description, Image URL</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDemoCsvModal(true)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all flex items-center gap-1 cursor-pointer"
                      title="Preview Demo CSV content & 1-Click Auto-Import"
                    >
                      <span>👁️ 1-Click Live CSV Demo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGuideModalType('csv')}
                      className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Open Multi-Image CSV Guide & Format Examples"
                    >
                      <span>📖 Multi-Image Guide</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadSampleCsv}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>📥 Download Sample CSV</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-indigo-300/80 bg-white p-5 text-center shadow-xs">
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
                    <p className="text-xs text-slate-500">Supports .csv file exported from Excel or Sheets</p>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50/90 p-3 rounded-xl border border-indigo-200 gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-900">🖼️ Have local product image files on your phone/PC?</p>
                    <p className="text-[11px] text-slate-600">Select multiple image files to auto-match with CSV products!</p>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 whitespace-nowrap text-center transition-all">
                    📁 Pick Local Images
                    <input type="file" accept="image/*" multiple onChange={handleLocalImagesSelect} className="hidden" />
                  </label>
                </div>

                {csvPreview.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-200">Preview ({csvPreview.length} items parsed):</p>
                      <span className="text-[11px] text-teal-300 font-bold">
                        {csvPreview.filter(i => i.image_file || i.image_url).length}/{csvPreview.length} Images Attached
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl bg-white p-2 text-xs">
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
                                <span className="text-[10px] bg-slate-100 font-bold text-slate-700 px-1.5 py-0.5 rounded">Stock: {item.stock || '100'}</span>
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
                      className="w-full rounded-xl bg-teal-600 py-3 text-xs font-black text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isImporting ? '⏳ Importing Products & Images...' : `🚀 Import All ${csvPreview.length} Products & Images (1-Click)`}
                    </button>
                  </div>
                )}
              </div>
            ) : bulkMode === 'text' ? (
              <div className="space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>✨ Text Product Import:</span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">Paste & Import</span>
                    </p>
                    <p className="text-[11px] font-mono text-slate-600 mt-0.5">Format: Product Name - Price - Stock Quantity</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGuideModalType('text')}
                      className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Open Text Import Format Guide"
                    >
                      <span>📖 Text Guide</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadSampleText}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>📥 Download Sample Text</span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-200">Target Category:</label>
                    <select
                      value={bulkCategory}
                      onChange={e => setBulkCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    >
                      <option value="">No category (Uncategorized)</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-200">Default Stock Qty (if not in text):</label>
                    <input
                      type="number"
                      min="0"
                      value={textDefaultStock}
                      onChange={e => setTextDefaultStock(e.target.value)}
                      placeholder="100"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">Paste product list (1 item per line):</label>
                    <span className="text-[10px] font-bold text-indigo-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">Format: Name - Price - Stock</span>
                  </div>
                  <textarea
                    rows={5}
                    value={bulkRawText}
                    onChange={e => setBulkRawText(e.target.value)}
                    placeholder={`Example:\nFull Face Riding Helmet - 1850 - 50\nEngine Oil 1L - 450 - 20\nChain Lube - 250 - 100\nBike Polish - 180 - 15`}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleParseRawText}
                    className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-white/20 transition-all cursor-pointer"
                  >
                    ✨ Auto-Parse & Edit in Form
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectTextImport}
                    className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white shadow-md hover:bg-teal-700 transition-all cursor-pointer"
                  >
                    🚀 Instant 1-Click Import from Text
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBulkSubmit} className="space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>📝 Multi-Row Form Grid:</span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">Direct Entry</span>
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5 font-medium">Add multiple items with custom price, stock & photos directly!</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGuideModalType('matrix')}
                      className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Open Form Grid Guide"
                    >
                      <span>📖 Form Guide</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadSampleCsv}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>📥 Download Template</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200">Target Category:</label>
                  <select
                    value={bulkCategory}
                    onChange={e => setBulkCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                  >
                    <option value="">No category (Uncategorized)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {bulkRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 rounded-xl bg-white p-2 border border-slate-200 shadow-xs">
                      <span className="text-xs font-bold text-slate-600 w-4 text-center shrink-0">{idx + 1}.</span>
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
                      <div className="flex items-center gap-1 shrink-0">
                        {row.image_preview_urls && row.image_preview_urls.length > 0 ? (
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            {row.image_preview_urls.map((url, imgIdx) => (
                              <div key={imgIdx} className="relative group">
                                <img src={url} alt="" className="h-6 w-6 rounded object-cover border border-slate-300" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRowImage(idx, imgIdx)}
                                  className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center opacity-80 hover:opacity-100"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <label className="cursor-pointer rounded bg-slate-200 px-1.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300" title="Add More Photos">
                              +
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={e => e.target.files && handleRowImageSelect(idx, Array.from(e.target.files))}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer rounded-lg bg-slate-100 p-1.5 hover:bg-slate-200 border border-slate-200 shrink-0 flex items-center gap-1 text-slate-700" title="Attach Product Photos (Multiple supported)">
                            <span className="text-xs">📷</span>
                            <span className="text-[10px] font-bold">Add Photos</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={e => e.target.files && handleRowImageSelect(idx, Array.from(e.target.files))}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkRow(idx)}
                          className="h-7 w-7 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 shrink-0 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-800/50">
                  <button
                    type="button"
                    onClick={handleAddBulkRow}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-all cursor-pointer"
                  >
                    + Add Row
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-teal-700 transition-all cursor-pointer"
                  >
                    🚀 Save All {bulkRows.filter(r => r.name.trim()).length} Products (1-Click)
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Business Category & Ordering Logic Customizer Section */}
      {store && (
        <section id="business-category" className="rounded-xl sm:rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 p-3.5 sm:p-5 text-white shadow-md space-y-3 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl shadow-inner border border-white/20">
                {getBusinessType(store.business_type).icon}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-black px-2 py-0.5 border border-amber-400/40 uppercase">
                    Category & Logic Setup
                  </span>
                </div>
                <h3 className="text-xs sm:text-base font-black text-white mt-0.5">
                  {getBusinessTypeTitle(getBusinessType(store.business_type), i18n.language)}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={requestAutoCreateSampleCategories}
                className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1.5 text-[10px] sm:text-xs font-black text-slate-950 hover:brightness-110 shadow-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span>{t('autoAddSampleCategories', '⚡ 1-Click रेडी कॅटेगरीज जोडा')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider block">Change Business Category:</label>
              <select
                value={store.business_type || 'GENERAL'}
                onChange={e => requestUpdateBusinessType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-indigo-700 bg-slate-900 p-2 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
              >
                {BUSINESS_TYPES.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.icon} {getBusinessTypeTitle(b, i18n.language)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-white/5 p-2.5 border border-white/10 space-y-1">
              <p className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">🎯 Checkout UX & Unit Rules:</p>
              <p className="text-[11px] text-slate-200 font-medium">
                {getBusinessTypeCheckoutHint(getBusinessType(store.business_type), i18n.language)}
              </p>
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[9.5px] text-slate-400 font-bold">Units:</span>
                {getBusinessType(store.business_type).units.map(u => (
                  <span key={u} className="bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-1.5 py-0.2 rounded text-[9px] font-bold">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}



      {/* Step 02: Category Add */}
      <section id="categories" className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs transition-all">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-slate-900 text-white text-[10px] sm:text-xs font-black shadow-xs">
              02
            </span>
            <div>
              <h2 className="text-xs sm:text-base font-black text-slate-900">{t('step2Title')}</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">{t('step2Subtext')}</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-xs font-bold text-slate-700 border border-slate-200">
            {categories.length} Categories
          </span>
        </div>

        <form onSubmit={addCategory} className="mt-3 flex gap-1.5">
          <input
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
            required
            placeholder="e.g. E-books, Groceries, Electronics"
            className="flex-1 rounded-lg sm:rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
          />
          <button disabled={isAddingCategory} className="rounded-lg sm:rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 whitespace-nowrap cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
            {isAddingCategory ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              '+ Add'
            )}
          </button>
        </form>

        {categories.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
            {/* Category Bulk Action Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-200">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={categories.length > 0 && selectedCatIds.length === categories.length}
                  onChange={toggleSelectAllCats}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                />
                <span>Select All ({categories.length})</span>
              </label>

              <div className="flex items-center gap-1.5">
                {selectedCatIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={requestBulkDeleteCategories}
                    disabled={isBulkDeletingCats}
                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow-xs hover:bg-rose-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>🗑️ Delete Selected ({selectedCatIds.length})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleSelectAllCats}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    ☑️ Select All to Delete
                  </button>
                )}
              </div>
            </div>

            {/* Category Badges with Selection Checkboxes */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map(item => {
                const isSelected = selectedCatIds.includes(item.id)
                return (
                  <span
                    key={item.id}
                    onClick={() => toggleSelectCat(item.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs ring-1 ring-rose-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer pointer-events-none"
                    />
                    <span>📁 {item.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        promptDeleteCategory(item.id, item.name)
                      }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-rose-600 hover:text-white transition-all cursor-pointer ml-0.5"
                      title={`Delete category ${item.name}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Step 03: Single Product Addition */}
      <section id="products" className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4 transition-all">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-slate-900 text-white text-[10px] sm:text-xs font-black shadow-xs">
              03
            </span>
            <div>
              <h2 className="text-xs sm:text-base font-black text-slate-900">{t('step3Title')}</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">{t('step3Subtext')}</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-xs font-bold text-emerald-700 border border-emerald-200">
            {products.length} Products
          </span>
        </div>

        <form onSubmit={requestAddProduct} className="space-y-2.5">
          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">Product Name <span className="text-rose-500 font-extrabold">*</span></label>
              <input value={productName} onChange={e => setProductName(e.target.value)} required placeholder="Product name" className="premium-input mt-0.5 p-2 text-xs" />
            </div>
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">{t('price')} (₹) <span className="text-rose-500 font-extrabold">*</span></label>
              <input value={price} onChange={e => setPrice(e.target.value)} required min="0.01" type="number" step="0.01" placeholder="Price in INR (> 0)" className="premium-input mt-0.5 p-2 text-xs" />
            </div>
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">{t('stock')}</label>
              <input value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} required type="number" min="0" placeholder="Stock Qty (default 100)" className="premium-input mt-0.5 p-2 text-xs" />
            </div>
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">Ordering Unit (विक्री युनिट)</label>
              <select
                value={productUnit || getBusinessType(store?.business_type).defaultUnit}
                onChange={e => setProductUnit(e.target.value)}
                className="premium-input mt-0.5 p-2 text-xs font-medium"
              >
                {getBusinessType(store?.business_type).units.map(u => (
                  <option key={u} value={u}>{getUnitDisplayLabel(u, store?.business_type)}</option>
                ))}
              </select>
              <p className="text-[10px] text-indigo-700 font-semibold mt-1 bg-indigo-50/90 p-1.5 rounded-lg border border-indigo-200/60 flex items-center gap-1">
                <span>💡</span>
                <span><strong>{formatUnitDisplay(productUnit || getBusinessType(store?.business_type).defaultUnit)}:</strong> {getUnitHint(productUnit || getBusinessType(store?.business_type).defaultUnit, store?.business_type)}</span>
              </p>
            </div>
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">{t('category')} <span className="text-rose-500 font-extrabold">*</span></label>
              <select value={category} onChange={e => setCategory(e.target.value)} required className="premium-input mt-0.5 p-2 text-xs font-bold border-indigo-200">
                <option value="">-- Select Category (Required) --</option>
                {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          </div>

          {/* Multiple Product Photos Picker with Main Card Photo Selection */}
          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 transition-all">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>🖼️ Photos (Optional)</span>
              </label>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                {productImages.length > 0 ? `${productImages.length} Selected` : 'Optional'}
              </span>
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files || [])
                setProductImages(files)
                setProductPrimaryIndex(0)
              }}
              className="premium-input text-xs p-1.5"
            />

            {productImages.length > 0 && (
              <div className="space-y-1 pt-1.5 border-t border-slate-200">
                <p className="text-[9px] font-bold text-slate-600">Tap photo to choose Main Card Display:</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {productImages.map((imgFile, idx) => {
                    const isPrimary = productPrimaryIndex === idx
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProductPrimaryIndex(idx)}
                        className={`relative h-14 rounded-lg border-2 overflow-hidden shrink-0 shadow-xs flex flex-col justify-between p-0.5 cursor-pointer ${isPrimary ? 'border-teal-600 ring-1 ring-teal-300' : 'border-slate-200 opacity-70'
                          }`}
                      >
                        <img src={URL.createObjectURL(imgFile)} alt="preview" className="h-8 w-full object-cover rounded" />
                        <span className={`text-[7px] font-black text-center py-0.2 rounded ${isPrimary ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {isPrimary ? '⭐ Main' : 'Gallery'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] sm:text-xs font-bold text-slate-700">Digital Downloadable File (Optional PDF/Zip)</label>
            <input onChange={e => setFile(e.target.files?.[0] || null)} type="file" className="premium-input mt-0.5 p-1.5 text-xs" />
          </div>

          <button
            type="submit"
            disabled={isAddingProduct}
            className="primary-button bg-slate-900 shadow-md hover:bg-slate-800 py-3 text-xs font-black cursor-pointer transition-all w-full flex items-center justify-center gap-2 rounded-xl text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isAddingProduct ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Publishing Product to S3 Cloud...</span>
              </>
            ) : (
              <span>⚡ + Add Published Product</span>
            )}
          </button>
        </form>

        {/* Prominent Category Catalog Button & Access Banner */}
        <div className="rounded-xl sm:rounded-2xl border border-indigo-900/40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 sm:p-4 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-teal-500/20 px-2 py-0.2 text-[8px] sm:text-[10px] font-black uppercase text-teal-300 border border-teal-400/30">
                  {t('categoryCatalog')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-200">{products.length} Products</span>
              </div>
              <h3 className="mt-0.5 text-xs sm:text-base font-black text-white">{t('categoryCatalog')}</h3>
              <p className="text-[10px] sm:text-xs text-indigo-200">
                {t('viewAllProducts')}
              </p>
            </div>

            <Link
              to={`/stores/${store.id}/catalog`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-all shrink-0 cursor-pointer"
            >
              <span>{t('openCategoryCatalog')} ({products.length})</span>
              <span>➔</span>
            </Link>
          </div>
        </div>
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
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800">Price (₹)</label>
                  <input value={editPrice} onChange={e => setEditPrice(e.target.value)} required min="0" type="number" step="0.01" className="premium-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800">Stock Qty</label>
                  <input value={editStock} onChange={e => setEditStock(e.target.value)} required min="0" type="number" className="premium-input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800">Unit</label>
                  <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="premium-input mt-1">
                    {getBusinessType(store?.business_type).units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
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

      {/* Universal Guide Dialogue Modal (CSV, Text, Form Grid) */}
      {guideModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {guideModalType === 'csv' ? '📊' : guideModalType === 'text' ? '✨' : '📝'}
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {guideModalType === 'csv'
                      ? 'CSV Multi-Image Import Guide'
                      : guideModalType === 'text'
                        ? 'Text List Import Guide'
                        : 'Multi-Row Form Grid Guide'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {guideModalType === 'csv'
                      ? 'Learn how to bulk import multiple product photos via CSV'
                      : guideModalType === 'text'
                        ? 'Learn how to bulk paste products using text format'
                        : 'Learn how to quickly add multiple items via form rows'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuideModalType(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {guideModalType === 'csv' ? (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3.5 space-y-2 text-teal-900">
                  <p className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>💡 How Multi-Image Works in CSV</span>
                  </p>
                  <p className="font-medium leading-relaxed">
                    Single product mein <b>Multiple Images</b> link karne ke liye, CSV file ki <code>Image URL</code> column mein saari images ke filenames ya URLs ko comma (<code>,</code>) se separate karke double quotes ke andar rakhein.
                  </p>
                  <p className="font-bold text-teal-950">
                    ⭐ Pehli Photo <u>Card Profile Main Image</u> banegi, aur baaki saari photos product ki <u>Gallery</u> mein attach hongi!
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs">Example 1: Local Image Files (Phone/PC Files)</h4>
                  <p className="text-[11px] text-slate-500">Aap apne phone ya computer ki local image files (e.g. <code>helmet.jpg</code>) ko matching names se link kar sakte hain:</p>
                  <div className="bg-slate-900 text-teal-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                    "helmet.jpg, helmet-side.jpg, helmet-back.jpg"
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs">Example 2: Online Web URLs</h4>
                  <p className="text-[11px] text-slate-500">Aap Internet image links (e.g. Unsplash, Cloudinary, AWS) bhi direct link kar sakte hain:</p>
                  <div className="bg-slate-900 text-indigo-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                    "https://img.com/helmet-1.jpg, https://img.com/helmet-2.jpg"
                  </div>
                </div>
              </div>
            ) : guideModalType === 'text' ? (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3.5 space-y-2 text-teal-900">
                  <p className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>✨ How Text Import Works</span>
                  </p>
                  <p className="font-medium leading-relaxed">
                    Aap bas multiple products ki list ko 1 line per product type karke copy-paste kar sakte hain. Format: <code>Product Name - Price - Stock</code>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs">Copyable Text Example:</h4>
                  <div className="bg-slate-900 text-emerald-300 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 select-all">
                    Full Face Riding Helmet - 1850 - 50<br />
                    Engine Oil 1L - 450 - 20<br />
                    Chain Lube & Cleaner Spray - 399 - 100<br />
                    Waterproof Bike Cover - 499 - 35
                  </div>
                  <p className="text-[11px] text-slate-500">Tip: Stock quantity optional hai, nahi denge toh default stock 100 auto-apply ho jayega.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3.5 space-y-2 text-teal-900">
                  <p className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>📝 How Multi-Row Form Grid Works</span>
                  </p>
                  <p className="font-medium leading-relaxed">
                    Form grid mein aap <code>+ Add Row</code> button se multiple products add kar sakte hain, har row ke liye custom price & stock quantity set kar sakte hain aur camera icon (📷) se individual photo attach kar sakte hain!
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs">Features Included:</h4>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 font-medium">
                    <li>Multi-Row instant addition</li>
                    <li>Instant photo file picker per product row</li>
                    <li>1-Click Save all products together</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={guideModalType === 'text' ? downloadSampleText : downloadSampleCsv}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all flex items-center gap-1.5"
              >
                <span>
                  {guideModalType === 'text' ? '📥 Download Sample Text' : '📥 Download Sample CSV / Template'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setGuideModalType(null)}
                className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Demo CSV Viewer & 1-Click Importer Modal */}
      {showDemoCsvModal && store && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-left space-y-4 font-sans max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>1-Click Live CSV Demo & Excel Preview</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                      {getBusinessType(store.business_type).icon} {getBusinessType(store.business_type).nameMr}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    इथे CSV फाईलचा लाईव्ह डेटा Excel टेबल टेबल रूपात दाखवला आहे
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoCsvModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 text-xs text-slate-700">
              <div className="rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 p-3.5 space-y-1.5 text-teal-950">
                <p className="font-extrabold text-xs flex items-center gap-1.5 text-teal-900">
                  <span>💡 ही खरीखुरी CSV फाईल अपलोड केल्यावर काय घडते त्याचा डेमो आहे!</span>
                </p>
                <p className="font-medium text-[11px] leading-relaxed text-teal-800">
                  खालील तक्त्यात दाखवल्याप्रमाणे <b>Category, Product Name, Price, Stock, Unit, Description, Image URL</b> हे ७ कॉलम असतात. <b>"🚀 1-Click Auto-Import This Demo CSV"</b> वर क्लिक करताच हे सर्व प्रॉडक्ट्स अचूक युनिट्ससह १ सेकंदात तयार होतात!
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDemoCsvViewMode('table')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      demoCsvViewMode === 'table'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📊 Visual Excel Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoCsvViewMode('raw')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      demoCsvViewMode === 'raw'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📝 Raw CSV Code
                  </button>
                </div>

                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {(store.slug || 'store')}_sample_products_import.csv
                </span>
              </div>

              {/* View Content */}
              {demoCsvViewMode === 'table' ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-200 text-[11px] font-bold uppercase tracking-wider">
                        <th className="p-2.5 border-b border-slate-800">Category</th>
                        <th className="p-2.5 border-b border-slate-800">Product Name</th>
                        <th className="p-2.5 border-b border-slate-800 text-right">Price</th>
                        <th className="p-2.5 border-b border-slate-800 text-center">Stock</th>
                        <th className="p-2.5 border-b border-slate-800 text-center">Unit</th>
                        <th className="p-2.5 border-b border-slate-800">Image URL / Files</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {(() => {
                        const currentBType = getBusinessType(store.business_type)
                        const items = getBusinessTypeProducts(currentBType, i18n.language)
                        if (items.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">No sample items found</td>
                            </tr>
                          )
                        }
                        return items.map((sp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                              <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200 text-[11px]">
                                {sp.category}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">{sp.name}</td>
                            <td className="p-2.5 text-right font-black text-emerald-600 whitespace-nowrap">₹{sp.price}</td>
                            <td className="p-2.5 text-center font-bold text-slate-700 whitespace-nowrap">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[11px] text-slate-800 font-mono">
                                {sp.stock}
                              </span>
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className="bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full text-[10px] border border-amber-300">
                                {sp.unit}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 font-mono text-[10px] max-w-[150px] truncate" title={sp.image || 'None'}>
                              {sp.image ? (
                                <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-sans font-bold flex items-center gap-1 w-fit">
                                  <span>📷</span>
                                  <span className="truncate max-w-[120px]">{sp.image}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No image link</span>
                              )}
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-900 text-emerald-300 p-3.5 rounded-2xl font-mono text-[11px] leading-relaxed border border-slate-800 overflow-x-auto whitespace-pre select-all shadow-inner">
                  {(() => {
                    const currentBType = getBusinessType(store.business_type)
                    const sampleProds = getBusinessTypeProducts(currentBType, i18n.language)
                    const header = 'Category,Product Name,Price,Stock,Unit,Description,Image URL\n'
                    let rows = ''
                    if (sampleProds && sampleProds.length > 0) {
                      rows = sampleProds.map(sp => 
                        `"${sp.category}","${sp.name}",${sp.price},${sp.stock},"${sp.unit}","Quality ${sp.name}","${sp.image || ''}"`
                      ).join('\n')
                    } else {
                      rows = `General Products,Sample Item 1,199,50,Pc,Sample description,"sample.jpg"`
                    }
                    return header + rows
                  })()}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📥 Download CSV File</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowDemoCsvModal(false)
                  requestAutoCreateSampleCategories()
                }}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🚀 1-Click Auto-Import Demo CSV Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Shop QR Code Standee & Poster Modal */}
      {showQrModal && store && (
        <StoreQrStandeeModal
          store={store}
          publicUrl={publicUrl}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Premium Custom Category Delete Dialogue Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4 font-sans">
            <button
              onClick={() => setCategoryToDelete(null)}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-md">
              <Trash2 className="h-7 w-7 text-rose-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Category Delete Karayechi?
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                तुम्हाला <strong className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-bold">"{categoryToDelete.name}"</strong> ही कॅटेगरी नक्की डिलीट करायची आहे का?
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={isDeletingCategory}
                className="flex-1 rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                disabled={isDeletingCategory}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-bold text-white shadow-lg hover:from-rose-500 hover:to-red-500 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeletingCategory ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Custom Product Delete Dialogue Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4 font-sans">
            <button
              onClick={() => setProductToDelete(null)}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-md">
              <Trash2 className="h-7 w-7 text-rose-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Product Delete Karaycha?
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                तुम्हाला <strong className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-bold">"{productToDelete.name}"</strong> हा प्रॉडक्ट दुकानातून नक्की डिलीट करायचा आहे का?
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="flex-1 rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={isDeletingProduct}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-bold text-white shadow-lg hover:from-rose-500 hover:to-red-500 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeletingProduct ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Reusable Confirmation Dialogue Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4 font-sans">
            <button
              onClick={() => setConfirmModal(null)}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-md ${
              confirmModal.variant === 'danger' ? 'bg-rose-100 text-rose-600' :
              confirmModal.variant === 'warning' ? 'bg-amber-100 text-amber-600' :
              confirmModal.variant === 'success' ? 'bg-emerald-100 text-emerald-600' :
              'bg-indigo-100 text-indigo-600'
            }`}>
              {confirmModal.variant === 'danger' ? <Trash2 className="h-7 w-7" /> :
               confirmModal.variant === 'success' ? <span className="text-2xl">🚀</span> :
               confirmModal.variant === 'warning' ? <span className="text-2xl">⚡</span> :
               <span className="text-2xl">⚙️</span>}
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmModal.onConfirm
                  setConfirmModal(null)
                  await action()
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  confirmModal.variant === 'danger' ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500' :
                  confirmModal.variant === 'success' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500' :
                  confirmModal.variant === 'warning' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black hover:brightness-110' :
                  'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller Onboarding Tour Guide Modal */}
      <SellerOnboardingGuideModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        storeId={store?.id}
        onDismissPermanently={() => {
          if (store?.id) {
            setStore((prev: any) => prev ? { ...prev, has_seen_onboarding_tour: true } : prev)
          }
        }}
      />

    </div>
    {/* Unified Seller Bottom Navigation Bar */}
    <SellerBottomNav storeId={store.id} activeTab="setup" />
  </div>
}
