import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { Tag, Plus, Trash2, CheckCircle2, XCircle, Percent, IndianRupee, Sparkles, AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react'

export default function SellerCoupons() {
  const { storeId } = useParams()
  const [store, setStore] = useState<any>(null)
  const [coupons, setCoupons] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')

  // Form State
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('0')
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  const fetchStoreData = async () => {
    try {
      const res = await api.get('/stores/')
      const found = res.data.results?.find((s: any) => String(s.id) === String(storeId)) || res.data[0]
      if (found) setStore(found)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/')
      const list = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setProducts(list.filter((p: any) => String(p.store) === String(storeId)))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await api.get('/coupons/')
      const list = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setCoupons(list.filter((c: any) => String(c.store) === String(storeId)))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStoreData()
    fetchProducts()
    fetchCoupons()
  }, [storeId])

  const openCreateModal = () => {
    setEditingCoupon(null)
    setCode('')
    setDiscountType('FLAT')
    setDiscountValue('')
    setMinOrderAmount('0')
    setMaxDiscountAmount('')
    setSelectedProductId('')
    setError('')
    setCreateModalOpen(true)
  }

  const openEditModal = (coupon: any) => {
    setEditingCoupon(coupon)
    setCode(coupon.code || '')
    setDiscountType(coupon.discount_type || 'FLAT')
    setDiscountValue(String(coupon.discount_value || ''))
    setMinOrderAmount(String(coupon.min_order_amount || '0'))
    setMaxDiscountAmount(String(coupon.max_discount_amount || ''))
    setSelectedProductId(coupon.product_id ? String(coupon.product_id) : '')
    setError('')
    setCreateModalOpen(true)
  }

  const handleSaveCoupon = async (e: React.FormEvent, isPublished: boolean) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Coupon code is required.')
      return
    }
    if (!discountValue || Number(discountValue) <= 0) {
      setError('Valid discount value is required.')
      return
    }

    setError('')
    setSaving(true)

    const payload = {
      store: Number(storeId),
      product_id: selectedProductId ? Number(selectedProductId) : null,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_order_amount: Number(minOrderAmount || 0),
      max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      is_active: isPublished
    }

    try {
      if (editingCoupon) {
        await api.patch(`/coupons/${editingCoupon.id}/`, payload)
        setSuccessMsg(`Coupon "${code.toUpperCase()}" updated as ${isPublished ? 'PUBLISHED' : 'DRAFT'}!`)
      } else {
        await api.post('/coupons/', payload)
        setSuccessMsg(`Coupon "${code.toUpperCase()}" created as ${isPublished ? 'PUBLISHED' : 'DRAFT'}!`)
      }

      setEditingCoupon(null)
      setCode('')
      setDiscountValue('')
      setMinOrderAmount('0')
      setMaxDiscountAmount('')
      setSelectedProductId('')
      setCreateModalOpen(false)
      fetchCoupons()

      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.code?.[0] || 'Failed to save coupon.')
    } finally {
      setSaving(false)
    }
  }

  const toggleCouponStatus = async (coupon: any) => {
    try {
      const nextStatus = !coupon.is_active
      await api.patch(`/coupons/${coupon.id}/`, { is_active: nextStatus })
      setSuccessMsg(`Coupon "${coupon.code}" moved to ${nextStatus ? 'PUBLISHED' : 'DRAFT'}!`)
      fetchCoupons()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteCoupon = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return
    try {
      await api.delete(`/coupons/${id}/`)
      fetchCoupons()
    } catch (err) {
      console.error(err)
    }
  }

  const publishedCoupons = coupons.filter(c => c.is_active)
  const draftCoupons = coupons.filter(c => !c.is_active)
  const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0)

  const filteredCoupons = coupons.filter(c => {
    if (statusFilter === 'PUBLISHED') return c.is_active
    if (statusFilter === 'DRAFT') return !c.is_active
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {store && <SellerHeader store={store} activeTabTitle="Store Coupons & Offers" onStoreUpdate={fetchStoreData} />}

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 border border-indigo-500/20 shadow-2xl">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-400/30">
                  <Tag className="h-4 w-4" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Promotions & Item Discounts</span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">Coupons & Draft/Publish Workflow</h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-300">
                Create & edit store coupons. Save as <strong className="text-amber-400">Draft</strong> or <strong className="text-emerald-400">Publish</strong> live for store customers!
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Coupon</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="rounded-2xl bg-emerald-950/80 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-300 flex items-center justify-between">
            <span>🎉 {successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400">✕</button>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl bg-slate-900/90 border border-emerald-500/30 p-5 space-y-1">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">🟢 Published Live</p>
            <p className="text-3xl font-black text-emerald-400">{publishedCoupons.length}</p>
            <p className="text-[11px] text-slate-400">Active & redeemable by store customers</p>
          </div>
          <div className="rounded-3xl bg-slate-900/90 border border-amber-500/30 p-5 space-y-1">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">🟡 Saved as Draft</p>
            <p className="text-3xl font-black text-amber-400">{draftCoupons.length}</p>
            <p className="text-[11px] text-slate-400">In progress (Hidden from customers)</p>
          </div>
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Coupon Redemptions</p>
            <p className="text-3xl font-black text-indigo-400">{totalUsage}</p>
            <p className="text-[11px] text-slate-400">Successful customer orders</p>
          </div>
        </div>

        {/* Coupons List Section */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-400" />
              <span>Store Coupons ({filteredCoupons.length})</span>
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({coupons.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PUBLISHED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  statusFilter === 'PUBLISHED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Published ({publishedCoupons.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  statusFilter === 'DRAFT'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟡 Drafts ({draftCoupons.length})
              </button>
              <button
                onClick={fetchCoupons}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer ml-1"
                title="Refresh List"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">Loading store coupons…</div>
          ) : filteredCoupons.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <span className="text-4xl">🏷️</span>
              <p className="text-sm font-bold text-slate-300">
                {statusFilter === 'PUBLISHED' ? 'No published coupons' : statusFilter === 'DRAFT' ? 'No draft coupons' : 'No coupons created yet'}
              </p>
              <p className="text-xs text-slate-500">Create or publish coupons to offer discounts to your store customers!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`rounded-2xl border p-5 space-y-3 transition-all relative ${
                    coupon.is_active
                      ? 'bg-slate-900 border-emerald-500/40 hover:border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/20'
                      : 'bg-slate-950/90 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono font-black text-base tracking-wider">
                        {coupon.code}
                      </span>
                      <p className="mt-2 text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                        {coupon.discount_type === 'PERCENTAGE' ? (
                          <>
                            <Percent className="h-3.5 w-3.5" />
                            <span>{coupon.discount_value}% OFF</span>
                          </>
                        ) : (
                          <>
                            <IndianRupee className="h-3.5 w-3.5" />
                            <span>FLAT ₹{coupon.discount_value} OFF</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${
                      coupon.is_active
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                    }`}>
                      {coupon.is_active ? (
                        <>🚀 PUBLISHED</>
                      ) : (
                        <>📝 DRAFT</>
                      )}
                    </span>
                  </div>

                  {/* Product Specific Tag */}
                  <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800 text-xs">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase">Applicable Scope:</p>
                    {coupon.product_name ? (
                      <p className="text-indigo-300 font-bold flex items-center gap-1 mt-0.5 truncate">
                        <ShoppingBag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Only for: {coupon.product_name}</span>
                      </p>
                    ) : (
                      <p className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                        <span>🌐</span>
                        <span>All Products in Store</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex justify-between">
                      <span>Min Order Amount:</span>
                      <strong className="text-white">₹{coupon.min_order_amount || 0}</strong>
                    </div>
                    {coupon.discount_type === 'PERCENTAGE' && coupon.max_discount_amount && (
                      <div className="flex justify-between">
                        <span>Max Savings Cap:</span>
                        <strong className="text-white">₹{coupon.max_discount_amount}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Redemptions:</span>
                      <strong className="text-indigo-400">{coupon.usage_count || 0} orders</strong>
                    </div>
                  </div>

                  {/* ACTION BUTTONS (Edit, Publish/Unpublish, Delete) */}
                  <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => openEditModal(coupon)}
                      className="text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>✏️ Edit</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCouponStatus(coupon)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          coupon.is_active
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40 hover:bg-amber-900'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md'
                        }`}
                      >
                        {coupon.is_active ? '📝 Move to Draft' : '🚀 Publish Now'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 cursor-pointer"
                        title="Delete Coupon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Coupon Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-black text-white">
                  {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Offer Coupon'}
                </h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-xl text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-950/80 border border-rose-500/30 p-3 text-xs font-bold text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={(e) => handleSaveCoupon(e, true)} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase text-slate-400">Coupon Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10, FLAT50, HELMET100"
                  className="w-full mt-1 rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white uppercase font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Product Selection Dropdown */}
              <div>
                <label className="text-xs font-extrabold uppercase text-slate-400">
                  Applicable Product / Scope
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full mt-1 rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none font-medium"
                >
                  <option value="">🌐 All Products in Store (Store-wide Offer)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      📦 {p.name} (₹{p.price})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Select a specific product to limit this coupon offer to that item only.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full mt-1 rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="FLAT">Flat Amount (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400">
                    {discountType === 'FLAT' ? 'Discount Value (₹)' : 'Discount Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'FLAT' ? 'e.g. 50' : 'e.g. 10'}
                    className="w-full mt-1 rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="e.g. 299"
                    className="w-full mt-1 rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                {discountType === 'PERCENTAGE' && (
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400">Max Savings Cap (₹)</label>
                    <input
                      type="number"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      placeholder="e.g. 200 (optional)"
                      className="w-full mt-1 rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* DRAFT & PUBLISH ACTIONS */}
              <div className="pt-2 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => handleSaveCoupon(e, false)}
                    className="w-1/2 rounded-2xl bg-amber-950/80 border border-amber-500/40 py-3 text-xs font-bold text-amber-300 hover:bg-amber-900 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : '📝 Save as Draft'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => handleSaveCoupon(e, true)}
                    className="w-1/2 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-500 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Publishing…' : '🚀 Publish Coupon'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {store && <SellerBottomNav storeId={store.id} activeTab="dashboard" />}
    </div>
  )
}
