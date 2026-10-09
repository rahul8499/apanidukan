import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'
import {
  Tag, Sparkles, ShoppingCart, Share2, Heart, ShieldCheck,
  Truck, RotateCcw, ChevronRight, ChevronLeft, Star, Copy, Eye, MapPin,
  Zap, ArrowLeft, Plus, Minus, X, CheckCircle2,
  Maximize2, Store as StoreIcon, CheckCircle
} from 'lucide-react'
import { getStoreTheme } from '../utils/storeTheme'
import StoreOfflinePage from './StoreOfflinePage'
import { isStoreOffline } from '../utils/storeStatus'
import { formatUnitDisplay } from '../utils/businessTypes'

export default function ProductPage() {
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return (
    <StoreCartProvider storeSlug={storeSlug}>
      <ProductContent />
    </StoreCartProvider>
  )
}

function ProductContent() {
  const { storeSlug, productSlug } = useParams()
  const navigate = useNavigate()
  const cart = useStoreCart()

  const [product, setProduct] = useState<any>(null)
  const [store, setStore] = useState<any>(null)
  const [otherProducts, setOtherProducts] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [couponLoadError, setCouponLoadError] = useState(false)
  const [selectedImgIndex, setSelectedImgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [storeOffline, setStoreOffline] = useState(false)

  // Interactive UI States
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState('')
  const [sizeError, setSizeError] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)
  const [addedToast, setAddedToast] = useState(false)
  const [pincode, setPincode] = useState('')
  const [pincodeChecked, setPincodeChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'highlights' | 'store' | 'reviews'>('description')

  useEffect(() => {
    if (!storeSlug || !productSlug) return
    setLoading(true)
    setStoreOffline(false)

    // Fetch Product Details
    api.get(`/public/stores/${storeSlug}/products/${productSlug}/`)
      .then((res) => {
        setProduct(res.data)
        setSelectedImgIndex(0)
        setSelectedSize('')
        setSizeError(false)
        if (res.data?.id) {
          const savedWishlist = localStorage.getItem(`multistore_wishlist_${res.data.id}`)
          setIsWishlisted(savedWishlist === 'true')
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))

    // Fetch Store info
    api.get(`/public/stores/${storeSlug}/`)
      .then((res) => {
        const storeData = res.data.data || res.data
        setStore(storeData)
        if (storeData?.name) {
          document.title = `${storeData.name} - Online Store`
        }
      })
      .catch((error) => {
        if (isStoreOffline(error)) {
          setStoreOffline(true)
          document.title = 'Store Under Maintenance'
        }
      })

    // Fetch Store Products for Similar Items
    api.get(`/public/stores/${storeSlug}/products/`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || [])
        setOtherProducts(list)
      })
      .catch(() => { })

    // Fetch Store Coupons
    setCouponsLoading(true)
    setCouponLoadError(false)
    api.get(`/public/stores/${storeSlug}/coupons/`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.data || [])
        setCoupons(Array.isArray(list) ? list : [])
      })
      .catch(() => { setCoupons([]); setCouponLoadError(true) })
      .finally(() => setCouponsLoading(false))
  }, [storeSlug, productSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-3">
        <div className="w-full max-w-5xl rounded-2xl bg-white p-4 sm:p-6 shadow-md space-y-4 animate-pulse">
          <div className="h-5 w-28 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-64 sm:h-80 rounded-xl bg-slate-200" />
            <div className="lg:col-span-7 space-y-3">
              <div className="h-6 w-3/4 bg-slate-200 rounded" />
              <div className="h-5 w-1/3 bg-slate-200 rounded" />
              <div className="h-14 w-full bg-slate-200 rounded-xl" />
              <div className="h-20 w-full bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (storeOffline) {
    return <StoreOfflinePage />
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-xs bg-white p-6 rounded-2xl shadow-lg space-y-3 border border-slate-200">
          <div className="text-4xl">🛍️</div>
          <h2 className="text-base font-bold text-slate-900">Product Not Found</h2>
          <p className="text-xs text-slate-500">Product is unavailable or removed.</p>
          <Link
            to={`/store/${storeSlug}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Store
          </Link>
        </div>
      </div>
    )
  }

  const mediaUrl = (url: string) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`
  }

  const allImages: string[] = []
  if (product.image) {
    allImages.push(mediaUrl(product.image))
  }
  if (Array.isArray(product.images)) {
    product.images.forEach((imgObj: any) => {
      if (imgObj.image) {
        const url = mediaUrl(imgObj.image)
        if (url && !allImages.includes(url)) {
          allImages.push(url)
        }
      }
    })
  }

  const currentImage = allImages[selectedImgIndex] || null
  const numPrice = Number(product.price) || 0
  const lineSubtotal = numPrice * quantity
  const couponEstimate = (coupon: any) => {
    const minimum = Number(coupon.min_order_amount || 0)
    const eligible = lineSubtotal >= minimum && (coupon.discount_type !== 'BOGO' || quantity >= 2)
    let saving = 0
    let benefit = ''
    if (coupon.discount_type === 'PERCENTAGE') {
      saving = lineSubtotal * Number(coupon.discount_value || 0) / 100
      if (coupon.max_discount_amount) saving = Math.min(saving, Number(coupon.max_discount_amount))
      benefit = `${Number(coupon.discount_value)}% off${coupon.max_discount_amount ? `, up to ₹${Number(coupon.max_discount_amount).toFixed(0)}` : ''}`
    } else if (coupon.discount_type === 'FLAT') {
      saving = Math.min(lineSubtotal, Number(coupon.discount_value || 0))
      benefit = `Flat ₹${Number(coupon.discount_value || 0).toFixed(0)} off`
    } else if (coupon.discount_type === 'BOGO') {
      saving = Math.floor(quantity / 2) * numPrice
      benefit = 'Buy 1 Get 1 Free'
    } else if (coupon.discount_type === 'FREE_DELIVERY') {
      benefit = 'Free delivery at checkout'
    }
    return { eligible, saving: eligible ? saving : 0, benefit, shortfall: Math.max(0, minimum - lineSubtotal) }
  }
  const applicableCoupons = (coupons || [])
    .filter((c: any) => c && (Number(c.product_id) === Number(product?.id) || !c.product_id))
    .sort((a: any, b: any) => Number(Boolean(b.product_id)) - Number(Boolean(a.product_id)))
  const activeCoupon = applicableCoupons[0] || null
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity !== null && Number(product.stock_quantity) <= 0

  const actualMRP = product.mrp && Number(product.mrp) > numPrice ? Number(product.mrp) : null
  const savings = actualMRP ? Math.max(0, actualMRP - numPrice) : 0
  const discountPercent = actualMRP ? Math.round((savings / actualMRP) * 100) : 0

  const similarItems = otherProducts.filter(p => p.id !== product.id).slice(0, 6)

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedImgIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1))
  }

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedImgIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1))
  }

  const toggleWishlist = () => {
    const nextState = !isWishlisted
    setIsWishlisted(nextState)
    localStorage.setItem(`multistore_wishlist_${product.id}`, String(nextState))
  }

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 2200)
  }

  const handleAddToCart = () => {
    if (isOutOfStock || !product) return
    if (product.available_sizes?.length && !selectedSize) {
      setSizeError(true)
      return
    }
    if (selectedSize && Number(product.size_stock?.[selectedSize] || 0) < quantity) {
      setSizeError(true)
      return
    }
    cart.add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: currentImage || product.image,
      unit: product.unit,
      selectedSize,
      selectedSizeStock: selectedSize ? Number(product.size_stock?.[selectedSize] || 0) : undefined
    }, quantity)
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2200)
  }

  const handleBuyNow = () => {
    if (isOutOfStock || !product) return
    if (product.available_sizes?.length && !selectedSize) {
      setSizeError(true)
      return
    }
    if (selectedSize && Number(product.size_stock?.[selectedSize] || 0) < quantity) {
      setSizeError(true)
      return
    }
    cart.add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: currentImage || product.image,
      unit: product.unit,
      selectedSize,
      selectedSizeStock: selectedSize ? Number(product.size_stock?.[selectedSize] || 0) : undefined
    }, quantity)
    navigate(`/store/${storeSlug}/cart`)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on ${store?.name || 'Store'}!`,
          url: window.location.href,
        })
      } catch { }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Product link copied!')
    }
  }

  const checkPincode = (e: React.FormEvent) => {
    e.preventDefault()
    if (pincode.trim().length >= 6) {
      setPincodeChecked(true)
    }
  }

  const storeTheme = getStoreTheme(store)

  return (
    <div className={`min-h-screen ${storeTheme.page_bg_class} font-sans pb-20 lg:pb-12 overflow-x-hidden text-xs sm:text-sm transition-colors duration-300`}>
      
      {/* Toast Notifications */}
      {copiedToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-[11px] font-bold text-white shadow-xl animate-bounce">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Coupon Code Copied!</span>
        </div>
      )}

      {addedToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-indigo-950 px-3.5 py-2 text-[11px] font-bold text-white shadow-xl border border-indigo-500/40 max-w-[90vw]">
          <ShoppingCart className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="truncate">Added {quantity} to Cart!</span>
          <Link to={`/store/${storeSlug}/cart`} className="ml-auto shrink-0 rounded-lg bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
            Cart →
          </Link>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {isZoomed && currentImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3">
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 cursor-pointer z-50"
          >
            <X className="h-5 w-5" />
          </button>
          
          {allImages.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-slate-700 cursor-pointer z-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-slate-700 cursor-pointer z-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <img
            src={currentImage}
            alt={product.name}
            className="max-h-[85vh] max-w-[92vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* HEADER NAVBAR (HIGH DENSITY COMPACT HEADER) */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800/80 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-2.5 py-2 sm:px-5 sm:py-2.5 gap-2">
          
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              to={`/store/${storeSlug}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/store/${storeSlug}`} className="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-400 hover:underline tracking-wider truncate block">
                {store?.name || 'Store'}
              </Link>
              <h1 className="font-semibold text-xs sm:text-sm text-white truncate max-w-[170px] sm:max-w-md">
                {product.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              title="Share"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={toggleWishlist}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 transition-all ${
                isWishlisted ? 'text-rose-500 bg-rose-950/40 border-rose-800/50' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Wishlist"
            >
              <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
            </button>

            <NotificationBellHeader />

            <Link
              to={`/store/${storeSlug}/cart`}
              className="relative flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-2 sm:px-3 text-[11px] font-extrabold text-white shadow-md"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-black text-white ring-1 ring-slate-950">
                  {cart.count}
                </span>
              )}
              <span className="hidden sm:inline font-semibold text-[11px]">₹{cart.total.toFixed(0)}</span>
            </Link>
          </div>
        </div>

        {/* Desktop Breadcrumb */}
        <div className="hidden md:block bg-slate-900 border-t border-slate-800/80 px-5 py-1.5 text-[11px] text-slate-400">
          <div className="mx-auto max-w-7xl flex items-center gap-1.5">
            <Link to={`/store/${storeSlug}`} className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="text-slate-300">{product.category?.name || 'Products'}</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="text-white font-semibold truncate max-w-xs">{product.name}</span>
          </div>
        </div>
      </header>

      {/* Promotional Ticker */}
      {activeCoupon && (
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 px-2.5 py-1.5 text-slate-950 text-[10px] sm:text-xs font-bold shadow-2xs border-b border-amber-300 flex items-center justify-between gap-1.5">
          <div className="mx-auto flex items-center gap-1.5 max-w-7xl w-full justify-between sm:justify-center">
            <div className="flex items-center gap-1 truncate">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-950 animate-bounce" />
              <span className="truncate">
                OFFER: Use code <strong className="font-mono bg-slate-950 text-amber-300 px-1 py-0.5 rounded text-[9px]">{activeCoupon.code}</strong> for{' '}
                {couponEstimate(activeCoupon).benefit}!
              </span>
            </div>
            <button
              onClick={() => copyCoupon(activeCoupon.code)}
              className="inline-flex items-center gap-0.5 rounded bg-slate-950 px-2 py-0.5 text-[9px] font-black text-amber-300 hover:bg-slate-900 shrink-0"
            >
              <Copy className="h-2.5 w-2.5" /> COPY
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl p-2.5 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          
          {/* LEFT COLUMN: GALLERY & ACTIONS */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-md overflow-hidden relative">
              
              {/* Image Showcase */}
              <div className="relative flex aspect-square w-full items-center justify-center bg-slate-50/90 rounded-xl overflow-hidden group cursor-pointer border border-slate-200/60" onClick={() => setIsZoomed(true)}>
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={product.name}
                    className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-6xl sm:text-7xl">🛍️</span>
                )}

                {/* Carousel Controls */}
                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white hover:bg-slate-900 border border-white/20 shadow-md z-20 cursor-pointer"
                      title="Prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white hover:bg-slate-900 border border-white/20 shadow-md z-20 cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white shadow-xs uppercase">
                    <ShieldCheck className="h-3 w-3 text-amber-300" /> Verified
                  </span>
                  {discountPercent > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-lg bg-rose-600 px-2 py-0.5 text-[9px] font-black text-white shadow-xs w-fit">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setIsZoomed(true) }}
                  className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 p-1.5 text-white border border-white/20 shadow-xs cursor-pointer"
                  title="Zoom"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>

                {allImages.length > 1 && (
                  <div className="absolute top-2 right-2 rounded-full bg-slate-950/70 px-2 py-0.5 text-[9px] font-extrabold text-white border border-white/20">
                    {selectedImgIndex + 1} / {allImages.length}
                  </div>
                )}

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center p-3">
                    <span className="bg-rose-600 text-white font-black text-xs uppercase px-4 py-1.5 rounded-full shadow-lg border border-white/20 tracking-wider">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pt-2 pb-0.5 scrollbar-none snap-x">
                  {allImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImgIndex(idx)}
                      style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                      className={`relative shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer snap-start ${
                        selectedImgIndex === idx
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden lg:grid grid-cols-2 gap-2.5">
              <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-3 px-4 text-xs font-black text-slate-950 shadow-md hover:bg-amber-500 disabled:bg-slate-300 disabled:text-slate-500 transition-all cursor-pointer border border-amber-500/40"
              >
                <ShoppingCart className="h-4 w-4 fill-slate-950" />
                <span>ADD TO CART</span>
              </button>

              <button
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 py-3 px-4 text-xs font-black text-white shadow-md hover:from-orange-500 hover:to-rose-500 disabled:bg-slate-300 disabled:text-slate-500 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-white" />
                <span>BUY NOW</span>
              </button>
            </div>


          </div>

          {/* RIGHT COLUMN: PRODUCT INFO */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">
            
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-700 border border-indigo-200/60">
                  <Tag className="h-3 w-3" />
                  {product.category?.name || 'In-Store Item'}
                </span>
                
                {product.views_count > 0 && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <Eye className="h-3 w-3 text-indigo-500" /> {product.views_count} Views
                    </span>
                  </div>
                )}
              </div>

              {/* Product Title (Compact size for Android & Web) */}
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-950 leading-snug break-words">
                {product.name}
              </h2>

              {/* Price Box */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                    Special Price
                  </span>
                  {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                    <span className="text-[9px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded animate-pulse">
                      🔥 Only {product.stock_quantity} left!
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-950">₹{product.price}</span>
                  {product.unit && (
                    <span className="text-xs sm:text-sm font-extrabold text-slate-600">
                      /{formatUnitDisplay(product.unit)}
                    </span>
                  )}
                  {savings > 0 && actualMRP && (
                    <>
                      <span className="text-xs sm:text-sm font-bold text-slate-400 line-through">₹{actualMRP}</span>
                      <span className="text-xs font-black text-emerald-600">{discountPercent}% OFF</span>
                    </>
                  )}
                </div>
                
                {savings > 0 && (
                  <p className="text-[11px] font-bold text-emerald-700">
                    🎉 Save ₹{savings}! (Incl. all taxes)
                  </p>
                )}
              </div>

              {/* Coupons Section (Display All Applicable Coupons) */}
              <div className="space-y-2 pt-0.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="h-3 w-3 text-emerald-600" />
                    <span>Available Offers & Coupons ({applicableCoupons.length})</span>
                  </p>
                  {couponsLoading && <div className="rounded-lg bg-white p-3 text-center text-[10px] font-bold text-slate-500">Checking available offers…</div>}
                  {!couponsLoading && couponLoadError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[10px] font-bold text-rose-700">Offers could not be loaded. Please refresh once.</div>}
                  {!couponsLoading && !couponLoadError && applicableCoupons.length === 0 && <div className="rounded-lg border border-slate-200 bg-white p-3 text-center"><p className="text-[11px] font-bold text-slate-700">No active coupon for this product right now.</p><p className="mt-1 text-[9px] text-slate-500">Store-wide and product-specific offers will appear here automatically.</p></div>}
                  {applicableCoupons.length > 0 && (
                  <div className="space-y-2">
                    {applicableCoupons.map((c: any) => {
                      const estimate = couponEstimate(c)
                      return (
                      <div key={c.id || c.code} className={`rounded-xl border p-3 space-y-2 relative shadow-2xs ${estimate.eligible ? 'bg-emerald-50/80 border-emerald-200/90' : 'bg-amber-50/70 border-amber-200'}`}>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider ${c.product_id ? 'bg-violet-600' : 'bg-emerald-600'}`}>
                            {c.product_id ? 'Only for this product' : c.is_scratch ? 'Scratch reward · Store-wide' : 'Store-wide coupon'}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCoupon(c.code)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-2 py-1 text-[10px] font-black text-white shrink-0 cursor-pointer shadow-2xs transition-colors"
                          >
                            <Copy className="h-2.5 w-2.5" /> Copy Code
                          </button>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <div>{c.offer_name && <p className="text-[10px] font-bold text-amber-700">{c.offer_name}</p>}<p className="text-xs font-black text-slate-950">{c.reward_text || estimate.benefit}</p><p className="mt-0.5 text-[10px] font-medium text-slate-600">Use code <span className="font-mono rounded border bg-white px-1 py-0.5 font-black text-slate-900">{c.code}</span>{Number(c.min_order_amount) > 0 ? ` · Minimum ₹${Number(c.min_order_amount).toFixed(0)}` : ''}</p></div>
                          {estimate.eligible && estimate.saving > 0 && <div className="shrink-0 text-right"><p className="text-[9px] font-bold uppercase text-emerald-700">Est. saving</p><p className="text-base font-black text-emerald-700">₹{estimate.saving.toFixed(0)}</p></div>}
                        </div>
                        {estimate.eligible ? <div className="rounded-lg border border-emerald-200 bg-white/80 px-2.5 py-1.5 text-[10px] font-bold text-emerald-900">On this selection: ₹{lineSubtotal.toFixed(0)} − ₹{estimate.saving.toFixed(0)} = <strong>₹{Math.max(0, lineSubtotal - estimate.saving).toFixed(0)}</strong>{c.discount_type === 'FREE_DELIVERY' ? ' + free delivery benefit' : ''}. Final benefit is verified in cart.</div> : <div className="rounded-lg border border-amber-200 bg-white/80 px-2.5 py-1.5 text-[10px] font-bold text-amber-900">{c.discount_type === 'BOGO' && quantity < 2 ? 'Select quantity 2 or more to unlock Buy 1 Get 1.' : `Add ₹${estimate.shortfall.toFixed(0)} more to unlock this coupon.`}</div>}
                      </div>
                    )})}
                  </div>
                  )}
                </div>

              {/* Delivery & Pincode */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Pincode Delivery Check</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <Zap className="h-2.5 w-2.5 fill-emerald-600" /> Express Dispatch
                  </span>
                </div>

                <form onSubmit={checkPincode} className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => { setPincode(e.target.value); setPincodeChecked(false) }}
                    placeholder="Enter 6-digit Pincode"
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-900 focus:border-indigo-600"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 shrink-0 cursor-pointer"
                  >
                    Check
                  </button>
                </form>

                {pincodeChecked && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-[10px] text-emerald-900 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Delivery to {pincode} available! Express dispatch by tomorrow.</span>
                  </div>
                )}

              <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center text-[10px]">
                  <div className="rounded-lg bg-white p-2 border border-slate-200/80 space-y-0.5">
                    <Truck className="h-3.5 w-3.5 text-indigo-600 mx-auto" />
                    <p className="font-bold text-slate-800">Fast Shipping</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-slate-200/80 space-y-0.5">
                    <RotateCcw className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
                    <p className="font-bold text-slate-800">Verified</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-slate-200/80 space-y-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                    <p className="font-bold text-slate-800">Support</p>
                  </div>
                </div>
              </div>

              {product.available_sizes?.length > 0 && (
                <div className={`rounded-xl border p-3 ${sizeError && !selectedSize ? 'border-rose-400 bg-rose-50' : 'border-indigo-200 bg-indigo-50/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">Select Size <span className="text-rose-600">*</span></span>
                    <span className="text-[10px] font-semibold text-slate-500">Available sizes</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.available_sizes.map((size: string) => {
                      const sizeQuantity = Number(product.size_stock?.[size] || 0)
                      return (
                      <button
                        key={size}
                        type="button"
                        disabled={sizeQuantity <= 0}
                        aria-pressed={selectedSize === size}
                        onClick={() => { setSelectedSize(size); setSizeError(false) }}
                        className={`min-w-11 rounded-lg border px-3 py-2 text-xs font-black transition-all disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:line-through ${selectedSize === size ? 'border-slate-950 bg-slate-950 text-white ring-2 ring-indigo-300' : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-500'}`}
                      >
                        {size}<span className="ml-1 text-[8px] opacity-70">({sizeQuantity})</span>
                      </button>
                    )})}
                  </div>
                  {sizeError && !selectedSize && <p className="mt-2 text-[11px] font-bold text-rose-600">Please select a size before adding this item.</p>}
                </div>
              )}

              {/* Quantity Counter */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-500">Qty:</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-black text-sm w-5 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    disabled={selectedSize ? quantity >= Number(product.size_stock?.[selectedSize] || 0) : quantity >= Number(product.stock_quantity || 0)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Desktop Direct Action Buttons Styled with Store Theme */}
              <div className="hidden lg:flex items-center gap-3 pt-2">
                <button
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-slate-700 bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>ADD TO CART</span>
                </button>

                <button
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${storeTheme.btn_gradient} py-3 text-xs font-black text-white hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shadow-lg`}
                >
                  <Zap className="h-4 w-4 fill-white" />
                  <span>BUY NOW ➔</span>
                </button>
              </div>

            </div>

            {/* Product Details Tabs */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-md space-y-3 overflow-hidden">
              <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-1">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`pb-2 px-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                    activeTab === 'description'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('highlights')}
                  className={`pb-2 px-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                    activeTab === 'highlights'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Specifications
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2 px-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                    activeTab === 'reviews'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => setActiveTab('store')}
                  className={`pb-2 px-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                    activeTab === 'store'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Store Info
                </button>
              </div>

              <div className="pt-1 text-xs leading-relaxed text-slate-700">
                {activeTab === 'description' && (
                  <div className="space-y-3">
                    <div className="whitespace-pre-line break-words bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium text-slate-800">
                      {product.description || product.short_description || 'Product description has not been added by the seller.'}
                    </div>
                    <div className={`rounded-xl border p-3.5 ${store?.exchange_enabled ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-start gap-2.5">
                        <RotateCcw className={`mt-0.5 h-4 w-4 shrink-0 ${store?.exchange_enabled ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <div className="space-y-1.5">
                          <h4 className="font-black text-slate-950">Exchange Policy</h4>
                          {store?.exchange_enabled ? <>
                            <p className="font-bold text-emerald-800">Size exchange available within {store.exchange_window_days || 7} days after delivery.</p>
                            <p className="text-[11px] leading-relaxed text-slate-700">{store.exchange_policy || 'The item must be unused, unwashed and returned with its original tags and packaging.'}</p>
                            <ul className="space-y-1 pt-1 text-[10px] font-medium text-slate-600">
                              <li>• Replacement is subject to the requested size being in stock.</li>
                              <li>• {store.exchange_evidence_required ? 'Photo evidence is required while submitting the request.' : 'Photo evidence is optional.'}</li>
                              <li>• Exchange request becomes available from the delivered-order tracking page.</li>
                            </ul>
                          </> : <p className="text-[11px] font-semibold text-slate-600">This store does not currently offer product exchange.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'highlights' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`rounded-xl p-2.5 border flex items-center justify-between ${store?.exchange_enabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <span className="text-slate-500 font-medium">Size Exchange</span>
                      <span className={`font-bold ${store?.exchange_enabled ? 'text-emerald-800' : 'text-slate-600'}`}>{store?.exchange_enabled ? `${store.exchange_window_days || 7} days` : 'Not available'}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Ordering Unit</span>
                      <span className="font-bold text-slate-900">{formatUnitDisplay(product.unit || 'Pc')}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-medium">Available Sizes</span>
                      <span className="font-bold text-right text-slate-900">{product.available_sizes?.length ? product.available_sizes.join(', ') : 'Standard size'}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Evidence</span>
                      <span className="font-bold text-slate-900">{store?.exchange_enabled ? (store.exchange_evidence_required ? 'Photo required' : 'Optional') : 'Not applicable'}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Fulfilment</span>
                      <span className="font-bold text-slate-900">{store?.allow_home_delivery && store?.allow_store_pickup !== false ? 'Delivery & Store Pickup' : store?.allow_home_delivery ? 'Home Delivery' : 'Store Pickup'}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Category</span>
                      <span className="font-bold text-slate-900 truncate max-w-[130px]">{product.category?.name || 'General'}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Stock</span>
                      <span className="font-bold text-slate-900">{product.stock_quantity ?? 'In Stock'}</span>
                    </div>
                    {product.views_count > 0 && (
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Views</span>
                        <span className="font-bold text-slate-900">{product.views_count}</span>
                      </div>
                    )}
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Type</span>
                      <span className="font-bold text-slate-900">{product.digital_file ? 'Digital' : 'Physical'}</span>
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="text-center shrink-0 pr-3 border-r border-slate-200">
                        <span className="text-2xl font-black text-slate-900">4.8</span>
                        <div className="flex justify-center text-amber-400 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">128 Ratings</span>
                      </div>
                      <div className="space-y-1 flex-1 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 font-bold text-slate-500">5 Star</span>
                          <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[85%]" />
                          </div>
                          <span className="font-bold text-slate-600">85%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 font-bold text-slate-500">4 Star</span>
                          <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-400 h-full w-[10%]" />
                          </div>
                          <span className="font-bold text-slate-600">10%</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3 border border-slate-200/70 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">Rajesh K.</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                          <CheckCircle className="h-2.5 w-2.5 text-emerald-600" /> Verified Buyer
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">Super fast delivery and authentic quality product. 100% recommended!</p>
                    </div>
                  </div>
                )}

                {activeTab === 'store' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <StoreIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">{store?.name}</h4>
                        <p className="text-[10px] text-slate-500">{store?.description || 'Verified Store Merchant'}</p>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Link
                        to={`/store/${storeSlug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800"
                      >
                        Browse Store Items →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* SIMILAR PRODUCTS */}
        {similarItems.length > 0 && (
          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Explore More</p>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Similar Products</h3>
              </div>
              <Link to={`/store/${storeSlug}`} className="text-xs font-bold text-indigo-600 hover:underline">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {similarItems.map((item) => {
                const itemImg = item.image ? mediaUrl(item.image) : null
                return (
                  <Link
                    key={item.id}
                    to={`/store/${storeSlug}/product/${item.slug}`}
                    className="group rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="aspect-square w-full bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200/50">
                        {itemImg ? (
                          <img src={itemImg} alt={item.name} className="h-full w-full object-contain p-1 group-hover:scale-105 transition-all" />
                        ) : (
                          <span className="text-2xl">🛍️</span>
                        )}
                      </div>
                      <h4 className="font-bold text-[11px] text-slate-900 line-clamp-2 leading-tight group-hover:text-indigo-600">
                        {item.name}
                      </h4>
                    </div>

                    <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 mt-1.5">
                      <span className="font-black text-xs text-indigo-700">₹{item.price}</span>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                        View
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </main>

      {/* MOBILE PWA STICKY BOTTOM BAR */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t p-2 sm:p-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.2)] backdrop-blur-md ${
        storeTheme.is_dark_mode ? 'bg-slate-950/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200/90 text-slate-900'
      }`}>
        <div className="mx-auto max-w-md flex items-center gap-2">
          
          <div className="flex flex-col justify-center pr-2 border-r border-slate-700/40 min-w-[75px]">
            <div className="flex items-baseline gap-1">
              <span className={`text-sm font-black ${storeTheme.text_primary_class}`}>₹{product.price}</span>
              {savings > 0 && actualMRP && (
                <span className="text-[9px] font-bold text-slate-400 line-through">₹{actualMRP}</span>
              )}
            </div>
            <span className="text-[9px] font-extrabold text-emerald-400">
              {savings > 0 ? `${discountPercent}% OFF` : 'Best Price'}
            </span>
          </div>

          <div className="flex-1 flex items-center gap-1.5">
            <button
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-slate-800 text-white py-2.5 text-xs font-black shadow-xs hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer border border-slate-700"
            >
              <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">CART</span>
            </button>

            <button
              disabled={isOutOfStock}
              onClick={handleBuyNow}
              className={`flex-1 flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r ${storeTheme.btn_gradient} py-2.5 text-xs font-black text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer`}
            >
              <Zap className="h-3.5 w-3.5 fill-white shrink-0" />
              <span className="truncate">BUY NOW</span>
            </button>
          </div>

        </div>
      </div>

      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
