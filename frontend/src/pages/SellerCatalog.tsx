import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'

const errorMessage = (error: any) =>
  error?.response?.data?.detail || Object.values(error?.response?.data || {}).flat().join(' ') || 'Error processing request.'

export default function SellerCatalog() {
  const { storeId } = useParams()
  const navigate = useNavigate()

  const [store, setStore] = useState<any>(() => getCachedStore(storeId))
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')
  const [message, setMessage] = useState('')
  const [isRefreshingData, setIsRefreshingData] = useState(false)

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)

  // Single Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('0')
  const [newProdStock, setNewProdStock] = useState('100')
  const [newProdCat, setNewProdCat] = useState('')
  const [newProdFile, setNewProdFile] = useState<File | null>(null)
  const [newProdImage, setNewProdImage] = useState<File | null>(null)

  const loadData = async () => {
    try {
      const stores = await api.get('/stores/')
      const found = stores.data.find((item: any) => String(item.id) === storeId)
      if (!found) return navigate('/dashboard')
      setCachedStore(found)
      setStore(found)

      const [categoryResult, productResult] = await Promise.all([
        api.get(`/stores/${found.id}/categories/`),
        api.get('/products/')
      ])
      setCategories(categoryResult.data || [])
      setProducts((productResult.data || []).filter((item: any) => item.store === found.id))
    } catch {
      setMessage('Failed to load catalog data.')
    }
  }

  useEffect(() => {
    loadData()
  }, [storeId])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory =
        selectedCategoryFilter === 'ALL' ||
        (selectedCategoryFilter === 'UNCATEGORIZED' && !p.category) ||
        String(p.category) === String(selectedCategoryFilter)
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
      const catObj = categories.find((c) => c.id === prod.category)
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
      await loadData()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setIsUpdatingProduct(false)
    }
  }

  async function handleDirectProductImageUpload(productId: number, file: File) {
    if (!file) return
    setMessage('⏳ Uploading image...')
    try {
      const data = new FormData()
      data.append('image', file)
      await api.patch(`/products/${productId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage('🖼️ Image updated successfully!')
      await loadData()
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  async function handleDeleteProduct(productId: number) {
    if (!window.confirm('Kya aap is product ko delete karna chahte hain?')) return
    try {
      await api.delete(`/products/${productId}/`)
      setMessage('Product deleted successfully.')
      await loadData()
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  async function handleAddSingleProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!store || !newProdName.trim()) return
    setMessage('⏳ Adding product...')
    try {
      const formData = new FormData()
      formData.append('store', String(store.id))
      formData.append('name', newProdName)
      formData.append('price', newProdPrice)
      formData.append('stock_quantity', newProdStock)
      if (newProdCat) formData.append('category', newProdCat)
      if (newProdFile) formData.append('digital_file', newProdFile)
      if (newProdImage) formData.append('image', newProdImage)

      await api.post('/products/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setMessage(`✓ Product '${newProdName}' added successfully!`)
      setNewProdName('')
      setNewProdPrice('0')
      setNewProdStock('100')
      setNewProdFile(null)
      setNewProdImage(null)
      setShowAddModal(false)
      await loadData()
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  if (!store) return <div className="p-6">Loading catalog...</div>

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50/90 pb-28 lg:max-w-none lg:w-full">
      {/* Header */}
      <SellerHeader store={store} activeTabTitle="Category-Wise Product Catalog" onStoreUpdate={loadData} />

      <div className="space-y-6 p-4 sm:p-6">
        {/* Top Title & Stats Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-lg border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-300 border border-indigo-400/30">
                Catalog Management
              </span>
              <span className="text-xs font-semibold text-indigo-200">{products.length} Total Items</span>
            </div>
            <h1 className="mt-2 text-xl font-extrabold text-white">Store Product Catalog</h1>
            <p className="mt-0.5 text-xs text-indigo-200">
              Products organized by category. Edit prices, manage inventory stock & upload photos.
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
              <span>Refresh Catalog</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
            >
              + Add Product
            </button>
            <Link
              to={`/stores/${store.id}/manage`}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all"
            >
              ⚡ Bulk Import
            </Link>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-950 flex items-center justify-between shadow-xs">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
          </div>
        )}

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or category..."
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
            <option value="ALL">📁 All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="UNCATEGORIZED">Uncategorized</option>
          </select>
        </div>

        {/* Category-Wise Grouped Product Sections */}
        {groupedProducts.length === 0 || filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
            <span className="text-4xl">🛍️</span>
            <h3 className="mt-3 font-bold text-slate-800 text-sm">No products found</h3>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery ? `No items matched "${searchQuery}"` : 'Add your first product to see it organized here.'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              + Add First Product
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
                      <h2 className="font-extrabold text-sm text-slate-900">{group.name}</h2>
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

                      return (
                        <div
                          key={prod.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition-all"
                        >
                          <div className="space-y-3">
                            {/* Product Header & Image */}
                            <div className="flex items-start gap-3">
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center">
                                {prod.image ? (
                                  <img src={mediaUrl(prod.image)} alt={prod.name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-2xl">🛍️</span>
                                )}
                                <label
                                  title="Change Product Photo"
                                  className="absolute inset-0 bg-slate-950/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
                                >
                                  📷
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleDirectProductImageUpload(prod.id, e.target.files[0])
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              <div className="min-w-0 flex-1">
                                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 truncate max-w-full">
                                  {group.name}
                                </span>
                                <h3 className="mt-0.5 text-sm font-extrabold text-slate-900 truncate leading-snug">{prod.name}</h3>
                                <p className="mt-1 text-sm font-black text-indigo-600">₹{prod.price}</p>
                              </div>
                            </div>

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
                                {isOutOfStock ? '🔴 Out of Stock' : isLowStock ? `⚠️ Low Stock: ${prod.stock_quantity}` : `✓ Stock: ${prod.stock_quantity ?? 100}`}
                              </span>

                              {prod.digital_file && (
                                <span className="rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-200 text-[10px]">
                                  📁 Digital File
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(prod)}
                              className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              ✏️ Edit
                            </button>

                            <label className="flex-1 text-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                              📷 Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleDirectProductImageUpload(prod.id, e.target.files[0])
                                  }
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Delete Product"
                            >
                              🗑️
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
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Product</h3>
                <p className="text-xs text-slate-500">Update product details & category</p>
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
                <label className="text-xs font-bold text-slate-700">Product Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Price (₹)</label>
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
                  <label className="text-xs font-bold text-slate-700">Stock Quantity</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="">No Category (Uncategorized)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProduct}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  {isUpdatingProduct ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add New Product</h3>
                <p className="text-xs text-slate-500">Publish a single item to catalog</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSingleProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Product Name</label>
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
                  <label className="text-xs font-bold text-slate-700">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Stock</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  value={newProdCat}
                  onChange={(e) => setNewProdCat(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Product Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewProdImage(e.target.files?.[0] || null)}
                  className="mt-1 w-full text-xs text-slate-600"
                />
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
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  Publish Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Seller Bottom Navigation Bar */}
      <SellerBottomNav storeId={store.id} activeTab="catalog" />
    </div>
  )
}
