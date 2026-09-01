import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'
import { useTranslation } from 'react-i18next'
import { X, Trash2, Copy, Share2 } from 'lucide-react'
import { getBusinessType, UNIT_LABEL_MAP, formatUnitDisplay, getUnitDisplayLabel, getUnitHint, getStockLabel } from '../utils/businessTypes'

const errorMessage = (error: any) =>
  error?.response?.data?.detail || Object.values(error?.response?.data || {}).flat().join(' ') || 'Error processing request.'

export default function SellerCatalog() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')
  const [message, setMessage] = useState('')
  const [isRefreshingData, setIsRefreshingData] = useState(false)

  // Multi-Select & Universal Confirmation Modal State
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [isBulkDeletingProducts, setIsBulkDeletingProducts] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'primary' | 'success'
    onConfirm: () => void | Promise<void>
  } | null>(null)

  function toggleSelectProduct(id: number) {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    )
  }

  function toggleSelectAllFilteredProducts() {
    const currentFilteredIds = filteredProducts.map(p => p.id)
    if (selectedProductIds.length === currentFilteredIds.length && currentFilteredIds.length > 0) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(currentFilteredIds)
    }
  }

  function requestBulkDeleteProducts() {
    if (selectedProductIds.length === 0) return
    setConfirmModal({
      isOpen: true,
      title: `🗑️ Delete ${selectedProductIds.length} Selected Products?`,
      message: `तुम्हाला निवडलेले ${selectedProductIds.length} प्रॉडक्ट्स दुकानातून कायमचे डिलीट करायचे आहेत का? हे प्रॉडक्ट्स रिकव्हर होणार नाहीत.`,
      confirmText: `🗑️ Yes, Delete (${selectedProductIds.length})`,
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: confirmBulkDeleteProducts
    })
  }

  async function confirmBulkDeleteProducts() {
    if (selectedProductIds.length === 0) return
    setIsBulkDeletingProducts(true)
    const loadingToast = toast.loading(`Deleting ${selectedProductIds.length} products...`)
    try {
      await Promise.all(selectedProductIds.map(id => api.delete(`/products/${id}/`)))
      toast.success(`🗑️ ${selectedProductIds.length} products deleted successfully!`, { id: loadingToast })
      setSelectedProductIds([])
      await loadData()
    } catch (error) {
      toast.error(errorMessage(error), { id: loadingToast })
    } finally {
      setIsBulkDeletingProducts(false)
    }
  }

  // Custom Delete Modal State
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null)
  const [isDeletingProduct, setIsDeletingProduct] = useState(false)

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editUnit, setEditUnit] = useState('Pc')
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)
  const [isAddingProduct, setIsAddingProduct] = useState(false)

  // Single Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('0')
  const [newProdStock, setNewProdStock] = useState('100')
  const [newProdCat, setNewProdCat] = useState('')
  const [newProdUnit, setNewProdUnit] = useState('Pc')
  const [newProdFile, setNewProdFile] = useState<File | null>(null)
  const [newProdImage, setNewProdImage] = useState<File | null>(null)
  const [newProdImages, setNewProdImages] = useState<File[]>([])
  const [newProdPrimaryIndex, setNewProdPrimaryIndex] = useState<number>(0)
  const [editNewImages, setEditNewImages] = useState<File[]>([])

  const loadData = async () => {
    try {
      let found: any = null
      if (storeId) {
        try {
          const directRes = await api.get(`/stores/${storeId}/`)
          found = directRes.data
        } catch {
          const stores = await api.get('/stores/')
          const storeList = Array.isArray(stores.data) ? stores.data : (stores.data?.results || [])
          found = storeList.find((item: any) => String(item.id) === storeId)
        }
      } else {
        const stores = await api.get('/stores/')
        const storeList = Array.isArray(stores.data) ? stores.data : (stores.data?.results || [])
        found = storeList[0] || null
      }
      if (!found) return navigate('/dashboard')
      setCachedStore(found)
      setStore(found)

      const [categoryResult, productResult] = await Promise.all([
        api.get(`/stores/${found.id}/categories/`),
        api.get('/products/')
      ])
      const catList = Array.isArray(categoryResult.data) ? categoryResult.data : (categoryResult.data?.results || [])
      const prodList = Array.isArray(productResult.data) ? productResult.data : (productResult.data?.results || [])
      setCategories(catList)
      setProducts(prodList.filter((item: any) => item.store === found.id))
    } catch {
      toast.error('Failed to load catalog data.')
    }
  }

  useEffect(() => {
    loadData()
  }, [storeId])

  const getProdCategoryId = (prod: any) => {
    if (!prod || !prod.category) return null
    return typeof prod.category === 'object' ? prod.category.id : prod.category
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const catId = getProdCategoryId(p)
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory =
        selectedCategoryFilter === 'ALL' ||
        (selectedCategoryFilter === 'UNCATEGORIZED' && !catId) ||
        String(catId) === String(selectedCategoryFilter)
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategoryFilter])

  // Group Filtered Products by Category Name
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: { categoryId: number | null; items: any[] } } = {}

    // Initialize groups for all categories
    categories.forEach((cat) => {
      groups[cat.name] = { categoryId: cat.id, items: [] }
    })
    groups['Uncategorized'] = { categoryId: null, items: [] }

    // Assign products to groups
    filteredProducts.forEach((prod) => {
      const catId = getProdCategoryId(prod)
      const catObj = categories.find((c) => Number(c.id) === Number(catId))
      const groupKey = catObj ? catObj.name : 'Uncategorized'
      if (!groups[groupKey]) {
        groups[groupKey] = { categoryId: catObj ? catObj.id : null, items: [] }
      }
      groups[groupKey].items.push(prod)
    })

    // Filter out empty category groups unless search is empty and user explicitly views all
    const result: { name: string; categoryId: number | null; items: any[] }[] = []
    Object.keys(groups).forEach((name) => {
      if (groups[name].items.length > 0 || (searchQuery === '' && selectedCategoryFilter === 'ALL')) {
        result.push({ name, categoryId: groups[name].categoryId, items: groups[name].items })
      }
    })

    return result
  }, [filteredProducts, categories, searchQuery, selectedCategoryFilter])

  // Media image URL helper
  function mediaUrl(url: string | null) {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`
  }

  // Edit Product Handlers
  function openEditModal(prod: any) {
    setEditingProduct(prod)
    setEditName(prod.name || '')
    setEditPrice(String(prod.price || '0'))
    setEditStock(String(prod.stock_quantity ?? 100))
    const catVal = getProdCategoryId(prod)
    setEditCategory(catVal ? String(catVal) : '')
    setEditUnit(prod.unit || prod.ordering_unit || getBusinessType(store?.business_type).defaultUnit)
    setEditNewImages([])
  }

  async function handleSaveProductEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProduct) return
    setIsUpdatingProduct(true)
    try {
      const formData = new FormData()
      formData.append('name', editName)
      formData.append('price', editPrice)
      formData.append('stock_quantity', editStock)
      formData.append('unit', editUnit)
      if (editCategory && editCategory !== '[object Object]' && editCategory.trim() !== '') {
        formData.append('category', editCategory)
      }

      // Upload extra gallery images
      if (editNewImages.length > 0) {
        editNewImages.forEach((imgFile) => {
          formData.append('images', imgFile)
        })
      }

      await api.patch(`/products/${editingProduct.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`✏️ '${editName}' updated successfully!`)
      setEditingProduct(null)
      setEditNewImages([])
      await loadData()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setIsUpdatingProduct(false)
    }
  }

  async function handleSetPrimaryCardImage(productId: number, imageId: number) {
    const loadingToast = toast.loading('⏳ Updating main card photo...')
    try {
      const res = await api.patch(`/products/${productId}/images/`, {
        set_primary_id: imageId
      })
      toast.success('⭐ Primary card photo updated!', { id: loadingToast })
      if (editingProduct && editingProduct.id === productId) {
        setEditingProduct(res.data.product)
      }
      await loadData()
    } catch (error) {
      toast.error(errorMessage(error), { id: loadingToast })
    }
  }

  async function handleDeleteGalleryImage(productId: number, imageId: number) {
    try {
      await api.delete(`/products/${productId}/images/`, {
        data: { image_id: imageId }
      })
      setEditingProduct((prev: any) => prev ? {
        ...prev,
        images: (prev.images || []).filter((img: any) => img.id !== imageId)
      } : null)
      toast.success('🖼️ Gallery image deleted successfully.')
      await loadData()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleDirectProductImageUpload(productId: number, files: FileList | File[]) {
    let fileArray = Array.from(files)
    if (fileArray.length === 0) return

    if (fileArray.length > 3) {
      toast.error('⚠️ Maximum 3 photos allowed! (Only first 3 photos selected)')
      fileArray = fileArray.slice(0, 3)
    }

    const loadingToast = toast.loading(`⏳ Uploading ${fileArray.length} image(s)...`)
    try {
      const formData = new FormData()
      fileArray.forEach((f) => formData.append('images', f))
      const res = await api.post(`/products/${productId}/images/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`🖼️ Uploaded ${fileArray.length} photo(s) to catalog product!`, { id: loadingToast })
      await loadData()
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
      toast.success(`Product "${productToDelete.name}" deleted successfully.`)
      setProductToDelete(null)
      await loadData()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setIsDeletingProduct(false)
    }
  }

  function requestAddSingleProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!store) return

    if (!newProdName.trim()) {
      toast.error('⚠️ Product Name is required!')
      return
    }

    if (!newProdPrice || Number(newProdPrice) <= 0) {
      toast.error('⚠️ Product Price is required and must be greater than ₹0!')
      return
    }

    if (!newProdCat) {
      toast.error('⚠️ Category is required! Please select a category.')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: `🛍️ Publish "${newProdName}" to Store?`,
      message: `तुम्हाला "${newProdName}" (₹${newProdPrice}) हा प्रॉडक्ट ग्राहकांसाठी दुकानात पब्लिश करायचा आहे का?`,
      confirmText: '🚀 Yes, Publish Product',
      cancelText: 'Cancel',
      variant: 'success',
      onConfirm: () => executeAddSingleProduct()
    })
  }

  async function executeAddSingleProduct() {
    if (!store || !newProdName.trim()) return
    setIsAddingProduct(true)
    setMessage('⏳ Uploading images & publishing product to store...')
    try {
      const formData = new FormData()
      formData.append('store', String(store.id))
      formData.append('name', newProdName)
      formData.append('price', newProdPrice)
      formData.append('stock_quantity', newProdStock)
      formData.append('unit', newProdUnit || getBusinessType(store?.business_type).defaultUnit)
      if (newProdCat) formData.append('category', newProdCat)
      if (newProdFile) formData.append('digital_file', newProdFile)

      // Multiple Images & Primary Selection
      const primaryFile = newProdImages[newProdPrimaryIndex] || newProdImage || (newProdImages.length > 0 ? newProdImages[0] : null)
      if (primaryFile) {
        formData.append('image', primaryFile)
      }

      if (newProdImages.length > 0) {
        newProdImages.forEach((imgFile) => {
          formData.append('images', imgFile)
        })
      }

      await api.post('/products/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success(`✓ Product '${newProdName}' added successfully with ${newProdImages.length || (newProdImage ? 1 : 0)} photos!`)
      setNewProdName('')
      setNewProdPrice('0')
      setNewProdStock('100')
      setNewProdFile(null)
      setNewProdImage(null)
      setNewProdImages([])
      setNewProdPrimaryIndex(0)
      setShowAddModal(false)
      await loadData()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setIsAddingProduct(false)
    }
  }


  if (!store) return <div className="p-6">Loading catalog...</div>

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50/90 pb-28 lg:max-w-none lg:w-full">
      {/* Header */}
      <SellerHeader store={store} activeTabTitle={t('storeProductCatalog')} onStoreUpdate={loadData} />

      <div className="space-y-6 p-4 sm:p-6">
        {/* Top Title & Stats Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-lg border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-300 border border-indigo-400/30">
                {t('catalogManagement')}
              </span>
              <span className="text-xs font-semibold text-indigo-200">{products.length} {t('totalItems')}</span>
            </div>
            <h1 className="mt-2 text-xl font-extrabold text-white">{t('storeProductCatalog')}</h1>
            <p className="mt-0.5 text-xs text-indigo-200">
              {t('catalogSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                setIsRefreshingData(true)
                await loadData()
                setTimeout(() => setIsRefreshingData(false), 500)
              }}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-400/40 bg-indigo-900/60 px-3.5 py-2.5 text-xs font-extrabold text-indigo-200 hover:bg-indigo-800 hover:text-white transition-all cursor-pointer shadow-xs"
              title="Click to fetch live fresh catalog products"
            >
              <span className={`text-sm ${isRefreshingData ? 'animate-spin' : ''}`}>🔄</span>
              <span>{t('refreshCatalog')}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
            >
              {t('addProduct')}
            </button>
            <Link
              to={`/stores/${store.id}/manage`}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all"
            >
              {t('bulkImport')}
            </Link>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchCatalogPlaceholder')}
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs focus:border-indigo-600 focus:outline-none"
          >
            <option value="ALL">{t('allCategories')} ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="UNCATEGORIZED">{t('uncategorized')}</option>
          </select>
        </div>

        {/* Multi-Select & Bulk Delete Products Toolbar */}
        {filteredProducts.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-800 select-none">
              <input
                type="checkbox"
                checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                onChange={toggleSelectAllFilteredProducts}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
              />
              <span>Select All Products ({filteredProducts.length})</span>
            </label>

            <div className="flex items-center gap-2">
              {selectedProductIds.length > 0 ? (
                <button
                  type="button"
                  onClick={requestBulkDeleteProducts}
                  disabled={isBulkDeletingProducts}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md hover:from-rose-500 hover:to-red-500 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Selected ({selectedProductIds.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleSelectAllFilteredProducts}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ☑️ Select All to Delete
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category-Wise Grouped Product Sections */}
        {groupedProducts.length === 0 || filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
            <span className="text-4xl">🛍️</span>
            <h3 className="mt-3 font-bold text-slate-800 text-sm">{t('noProductsFound')}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery ? `No items matched "${searchQuery}"` : 'Add your first product to see it organized here.'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              {t('addFirstProduct')}
            </button>
          </div>
        ) : (
          groupedProducts.map((group) => {
            if (group.items.length === 0 && searchQuery !== '') return null

            return (
              <section key={group.name} className="space-y-3">
                {/* Category Group Header Banner */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-100">
                      📁
                    </span>
                    <div>
                      <h2 className="font-extrabold text-sm text-slate-900">{group.name === 'Uncategorized' ? t('uncategorized') : group.name}</h2>
                      <p className="text-[11px] text-slate-500 font-medium">{group.items.length} Product(s)</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 border border-slate-200">
                    {group.items.length} items
                  </span>
                </div>

                {/* Product Grid within Category */}
                {group.items.length === 0 ? (
                  <p className="px-3 text-xs italic text-slate-400">No products in this category yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((prod) => {
                      const isOutOfStock = Number(prod.stock_quantity ?? 100) <= 0
                      const isLowStock = Number(prod.stock_quantity ?? 100) > 0 && Number(prod.stock_quantity ?? 100) <= 5
                      
                      // Gather all images attached to this product
                      const allProdImages: { id?: number; url: string; isPrimary: boolean }[] = []
                      if (prod.image) {
                        allProdImages.push({ url: mediaUrl(prod.image), isPrimary: true })
                      }
                      if (Array.isArray(prod.images)) {
                        prod.images.forEach((gImg: any) => {
                          const fullUrl = mediaUrl(gImg.image)
                          if (fullUrl && !allProdImages.some(item => item.url === fullUrl)) {
                            allProdImages.push({ id: gImg.id, url: fullUrl, isPrimary: false })
                          }
                        })
                      }

                      const isSelected = selectedProductIds.includes(prod.id)

                      return (
                        <div
                          key={prod.id}
                          className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all space-y-3 ${
                            isSelected
                              ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-300 shadow-md'
                              : 'border-slate-200 bg-white shadow-xs hover:shadow-md'
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <label
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-3 right-3 z-10 flex items-center justify-center p-1 cursor-pointer"
                            title="Select Product to Delete"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProduct(prod.id)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                            />
                          </label>

                          <div className="space-y-3">
                            {/* Product Header & Image */}
                            <div className="flex items-start gap-3 pr-6">
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center group">
                                {prod.image ? (
                                  <img src={mediaUrl(prod.image)} alt={prod.name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-2xl">🛍️</span>
                                )}
                                <span className="absolute top-0.5 left-0.5 bg-indigo-600/90 backdrop-blur-xs text-[8px] font-black text-white px-1 py-0.2 rounded">Card Main</span>
                                <label
                                  title="Upload Multiple Product Photos"
                                  className="absolute inset-0 bg-slate-950/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold p-1 text-center"
                                >
                                  📷 Upload
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        handleDirectProductImageUpload(prod.id, e.target.files)
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              <div className="min-w-0 flex-1">
                                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 truncate max-w-full">
                                  {group.name === 'Uncategorized' ? t('uncategorized') : group.name}
                                </span>
                                <h3 className="mt-0.5 text-sm font-extrabold text-slate-900 truncate leading-snug">{prod.name}</h3>
                                <p className="mt-1 text-sm font-black text-indigo-600 flex items-center gap-1">
                                  <span>₹{prod.price}</span>
                                  <span className="text-[11px] font-bold text-slate-500">
                                    / {formatUnitDisplay(prod.unit || prod.ordering_unit || getBusinessType(store?.business_type).defaultUnit)}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Card Gallery Thumbnails Strip & Primary Card Image Switcher */}
                            {allProdImages.length > 1 && (
                              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2 space-y-1">
                                <p className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                                  <span>🖼️ {t('productGallery')} ({allProdImages.length})</span>
                                  <span className="text-indigo-600 font-extrabold">{t('clickThumbnailMain')}</span>
                                </p>
                                <div className="flex gap-1.5 overflow-x-auto py-1">
                                  {allProdImages.map((imgItem, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      title={imgItem.isPrimary ? "Current Card Profile Image" : "Click to set as Card Profile Image"}
                                      onClick={() => {
                                        if (imgItem.id) {
                                          handleSetPrimaryCardImage(prod.id, imgItem.id)
                                        }
                                      }}
                                      className={`relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                        imgItem.isPrimary
                                          ? 'border-indigo-600 ring-2 ring-indigo-300 scale-105'
                                          : 'border-slate-200 opacity-70 hover:opacity-100'
                                      }`}
                                    >
                                      <img src={imgItem.url} alt="" className="h-full w-full object-cover" />
                                      {imgItem.isPrimary && (
                                        <span className="absolute bottom-0 inset-x-0 bg-indigo-600 text-[7px] font-black text-white text-center">⭐ Main</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Stock Badge & Digital File Badge */}
                            <div className="flex items-center justify-between text-[11px] font-bold pt-1 border-t border-slate-100">
                              <span
                                className={`rounded-full px-2.5 py-0.5 border ${
                                  isOutOfStock
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isLowStock
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {isOutOfStock
                                  ? ((store?.business_type === 'PHOTO_STUDIO' || store?.business_type === 'SERVICES') ? 'No Slots Left' : t('outOfStock'))
                                  : isLowStock
                                  ? `${t('lowStock')}: ${prod.stock_quantity} ${formatUnitDisplay(prod.unit || prod.ordering_unit || getBusinessType(store?.business_type).defaultUnit)}`
                                  : ((store?.business_type === 'PHOTO_STUDIO' || store?.business_type === 'SERVICES')
                                      ? `✓ Slots: ${prod.stock_quantity ?? 100} ${formatUnitDisplay(prod.unit || prod.ordering_unit || getBusinessType(store?.business_type).defaultUnit)}`
                                      : `✓ Stock: ${prod.stock_quantity ?? 100} ${formatUnitDisplay(prod.unit || prod.ordering_unit || getBusinessType(store?.business_type).defaultUnit)}`)}
                              </span>

                              {prod.digital_file && (
                                <span className="rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-200 text-[10px]">
                                  {t('digitalFile')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(prod)}
                              className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              {t('editBtn')}
                            </button>

                            <label title="Add Multiple Photos to this Product" className="flex-1 text-center rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap">
                              {t('multiPhotos')}
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handleDirectProductImageUpload(prod.id, e.target.files)
                                  }
                                }}
                              />
                            </label>

                            {/* Share Product WhatsApp */}
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `🛍️ *${prod.name}*\n💰 Price: ₹${prod.price}\n\n👉 Buy Online: ${window.location.origin}/store/${store?.slug}/product/${prod.slug || prod.id}`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-[#25D366] px-2 py-1.5 text-[11px] font-extrabold text-white hover:bg-[#20ba5a] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                              title="Share Product on WhatsApp"
                            >
                              <span>📲 Share</span>
                            </a>

                            {/* Copy Product Link */}
                            <button
                              type="button"
                              onClick={() => {
                                const prodLink = `${window.location.origin}/store/${store?.slug}/product/${prod.slug || prod.id}`
                                navigator.clipboard.writeText(prodLink)
                                toast.success('Product link copied!')
                              }}
                              className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1.5 text-[11px] font-extrabold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                              title="Copy Direct Product Link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => promptDeleteProduct(prod)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-extrabold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                              title="Delete Product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">{t('editProductTitle')}</h3>
                <p className="text-xs text-slate-500">{t('editProductSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">{t('productNameLabel')}</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">{t('priceLabel')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Ordering Unit (युनिट)</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    {getBusinessType(store?.business_type).units.map((u) => (
                      <option key={u} value={u}>
                        {getUnitDisplayLabel(u, store?.business_type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-indigo-700 font-semibold bg-indigo-50/90 p-1.5 rounded-lg border border-indigo-200/60 flex items-center gap-1 mt-0.5">
                <span>💡</span>
                <span><strong>{formatUnitDisplay(editUnit)}:</strong> {getUnitHint(editUnit, store?.business_type)}</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">{getStockLabel(store?.business_type, i18n.language, editUnit)}</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">{t('categoryLabel')}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="">{t('noCategory')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Image Gallery & Primary Photo Selector */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800">
                    {t('productGallery')} & Main Card Photo
                  </label>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    {(editingProduct?.images?.length || 0) + (editingProduct?.image ? 1 : 0)} Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{t('clickThumbnailMain')}</p>

                {/* Existing Gallery Images Grid with Primary Chooser */}
                <div className="grid grid-cols-3 gap-2">
                  {editingProduct?.image && (
                    <div className="relative group h-20 rounded-xl border-2 border-indigo-600 bg-white overflow-hidden shadow-xs flex flex-col justify-between p-1">
                      <img
                        src={mediaUrl(editingProduct.image)}
                        alt="Primary"
                        className="h-12 w-full object-cover rounded"
                      />
                      <span className="bg-indigo-600 text-[9px] font-black text-white text-center py-0.5 rounded">⭐ Main Card Photo</span>
                    </div>
                  )}

                  {(editingProduct?.images || []).map((imgObj: any) => {
                    const isCurrentMain = editingProduct?.image && mediaUrl(editingProduct.image) === mediaUrl(imgObj.image)
                    return (
                      <div key={imgObj.id} className="relative group h-20 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col justify-between p-1">
                        <img
                          src={mediaUrl(imgObj.image)}
                          alt="Gallery"
                          className="h-11 w-full object-cover rounded"
                        />
                        <div className="flex items-center justify-between gap-1">
                          {!isCurrentMain ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryCardImage(editingProduct.id, imgObj.id)}
                              className="flex-1 bg-slate-800 text-[8px] font-black text-white py-0.5 rounded hover:bg-indigo-600"
                            >
                              ⭐ Set Main
                            </button>
                          ) : (
                            <span className="flex-1 bg-indigo-600 text-[8px] font-black text-white text-center py-0.5 rounded">⭐ Main</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryImage(editingProduct.id, imgObj.id)}
                            className="h-4 w-4 flex items-center justify-center rounded bg-rose-600 text-[9px] text-white font-black hover:bg-rose-700 shrink-0"
                            title="Delete Photo"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700">Add More Photos to Gallery (Max 3 Allowed)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      let selectedFiles = Array.from(e.target.files || [])
                      if (selectedFiles.length > 3) {
                        toast.error('⚠️ Maximum 3 photos allowed! (Only first 3 photos selected)')
                        selectedFiles = selectedFiles.slice(0, 3)
                      }
                      setEditNewImages(selectedFiles)
                    }}
                    className="mt-1 w-full text-xs text-slate-600"
                  />
                  {editNewImages.length > 0 && (
                    <p className="mt-1 text-[10px] font-bold text-emerald-600">
                      ✓ {editNewImages.length} new photo(s) selected to upload on save! (Max 3)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setEditingProduct(null); setEditNewImages([]) }}
                  disabled={isUpdatingProduct}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProduct}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isUpdatingProduct ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>{t('saveChanges')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">{t('addNewProductTitle')}</h3>
                <p className="text-xs text-slate-500">{t('addNewProductSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={requestAddSingleProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">{t('productNameLabel')} <span className="text-rose-500 font-extrabold">*</span></label>
                <input
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. Wireless Headphones"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">{t('priceLabel')} (₹) <span className="text-rose-500 font-extrabold">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Ordering Unit (युनिट)</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    {getBusinessType(store?.business_type).units.map((u) => (
                      <option key={u} value={u}>
                        {getUnitDisplayLabel(u, store?.business_type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-indigo-700 font-semibold bg-indigo-50/90 p-1.5 rounded-lg border border-indigo-200/60 flex items-center gap-1 mt-0.5">
                <span>💡</span>
                <span><strong>{formatUnitDisplay(newProdUnit)}:</strong> {getUnitHint(newProdUnit, store?.business_type)}</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">{getStockLabel(store?.business_type, i18n.language, newProdUnit)}</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">{t('categoryLabel')} <span className="text-rose-500 font-extrabold">*</span></label>
                  <select
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="">-- Select Category (Required) --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multiple Images Selector with Primary Card Photo Chooser */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>Product Photos (Optional)</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {newProdImages.length > 0 || newProdImage || newProdFile ? `${newProdImages.length || 1} Selected` : 'Optional'}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    let files = Array.from(e.target.files || [])
                    if (files.length > 3) {
                      toast.error('⚠️ Maximum 3 photos allowed! (Only first 3 photos selected)')
                      files = files.slice(0, 3)
                    }
                    setNewProdImages(files)
                    setNewProdPrimaryIndex(0)
                  }}
                  className="mt-1 w-full text-xs text-slate-600"
                />

                {newProdImages.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-600">Click photo thumbnail to choose which image displays on Card Profile:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {newProdImages.map((file, idx) => {
                        const isPrimary = newProdPrimaryIndex === idx
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewProdPrimaryIndex(idx)}
                            className={`relative h-16 rounded-xl border-2 overflow-hidden shrink-0 shadow-xs flex flex-col justify-between p-0.5 cursor-pointer ${
                              isPrimary ? 'border-teal-600 ring-2 ring-teal-300' : 'border-slate-200 opacity-70'
                            }`}
                          >
                            <img src={URL.createObjectURL(file)} alt="preview" className="h-10 w-full object-cover rounded" />
                            <span className={`text-[8px] font-black text-center py-0.5 rounded ${isPrimary ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              {isPrimary ? '⭐ Main Card' : 'Gallery'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Digital File (Optional PDF/Zip)</label>
                <input
                  type="file"
                  onChange={(e) => setNewProdFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full text-xs text-slate-600"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isAddingProduct}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isAddingProduct}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isAddingProduct ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Publishing Product...</span>
                    </>
                  ) : (
                    <span>{t('publishProduct')}</span>
                  )}
                </button>
              </div>
            </form>
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
                तुम्हाला <strong className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-bold">"{productToDelete.name}"</strong> हा प्रॉडक्ट कॅटलॉग मधून नक्की डिलीट करायचा आहे का?
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

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="catalog" />
    </div>
  )
}
