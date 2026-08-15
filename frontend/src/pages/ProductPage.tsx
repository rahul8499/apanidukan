import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'

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
  const [product, setProduct] = useState<any>(null)
  const [selectedImgIndex, setSelectedImgIndex] = useState(0)
  const cart = useStoreCart()

  useEffect(() => {
    if (!storeSlug || !productSlug) return
    api.get(`/public/stores/${storeSlug}/products/${productSlug}/`).then((res) => {
      setProduct(res.data)
      setSelectedImgIndex(0)
    }).catch(() => { })
  }, [storeSlug, productSlug])

  if (!product) return <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 p-5 lg:max-w-none lg:w-full">Loading product...</div>

  // Collect all product images into unified array
  const allImages: string[] = []
  if (product.image) {
    allImages.push(product.image.startsWith('http') ? product.image : `${window.location.protocol}//${window.location.hostname}:8000${product.image}`)
  }
  if (Array.isArray(product.images)) {
    product.images.forEach((imgObj: any) => {
      const url = imgObj.image?.startsWith('http') ? imgObj.image : `${window.location.protocol}//${window.location.hostname}:8000${imgObj.image}`
      if (url && !allImages.includes(url)) {
        allImages.push(url)
      }
    })
  }

  const currentImage = allImages[selectedImgIndex] || null

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32 lg:max-w-none lg:w-full">
      <header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <Link to={`/store/${storeSlug}`} className="text-xl font-bold hover:text-indigo-300">←</Link>
          <div>
            <p className="text-xs font-semibold text-indigo-300">Product details</p>
            <h1 className="font-bold text-base truncate">{product.name}</h1>
          </div>
        </div>
        <NotificationBellHeader />
      </header>

      <main className="p-4 space-y-4">
        <article className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Main Selected Image Display */}
          <div className="relative flex h-80 items-center justify-center bg-slate-900/95 overflow-hidden group">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                className="h-full w-full object-contain transition-all duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="text-7xl">🛍️</span>
            )}

            {allImages.length > 1 && (
              <div className="absolute top-3 right-3 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold text-white border border-white/20">
                {selectedImgIndex + 1} / {allImages.length}
              </div>
            )}
          </div>

          {/* Interactive Multi-Image Gallery Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto p-4 bg-slate-100/80 border-b border-slate-200">
              {allImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImgIndex(idx)}
                  className={`relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-xs ${
                    selectedImgIndex === idx
                      ? 'border-indigo-600 ring-2 ring-indigo-400 scale-105'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase text-indigo-600 border border-indigo-200">
                {product.category?.name || 'In Store Product'}
              </span>
              <p className="text-2xl font-black text-indigo-700">₹{product.price}</p>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 leading-snug">{product.name}</h2>
            
            <p className="text-sm leading-relaxed text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {product.description || product.short_description || 'High quality item verified by seller.'}
            </p>

            <button
              onClick={() => cart.add({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: currentImage || product.image })}
              className="w-full rounded-2xl bg-indigo-600 py-4 text-base font-extrabold text-white shadow-lg hover:bg-indigo-700 active:scale-98 transition-all cursor-pointer"
            >
              Add to Cart →
            </button>
          </div>
        </article>
      </main>

      <CustomerBottomNav storeSlug={storeSlug!} active="shop" />
      <CustomerChatWidget storeSlug={storeSlug!} />
    </div>
  )
}
