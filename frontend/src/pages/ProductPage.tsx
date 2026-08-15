import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { StoreCartProvider, useStoreCart } from '../context/StoreCartContext'
import CustomerBottomNav from '../components/CustomerBottomNav'
import CustomerChatWidget from '../components/CustomerChatWidget'
import NotificationBellHeader from '../components/NotificationBellHeader'

export default function ProductPage(){
  const { storeSlug } = useParams()
  if (!storeSlug) return null
  return <StoreCartProvider storeSlug={storeSlug}><ProductContent /></StoreCartProvider>
}

function ProductContent(){
  const { storeSlug, productSlug } = useParams()
  const [product, setProduct] = useState<any>(null)
  const cart = useStoreCart()

  useEffect(()=>{
    if(!storeSlug || !productSlug) return
    api.get(`/public/stores/${storeSlug}/products/${productSlug}/`).then(res=> setProduct(res.data)).catch(()=>{})
  },[storeSlug, productSlug])

  if(!product) return <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 p-5 lg:max-w-none lg:w-full">Loading product...</div>
  const imageUrl = product.image?.startsWith('http') ? product.image : `${window.location.protocol}//${window.location.hostname}:8000${product.image}`

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32 lg:max-w-none lg:w-full"><header className="flex items-center justify-between bg-slate-950 px-5 py-5 text-white"><div className="flex items-center gap-4"><Link to={`/store/${storeSlug}`} className="text-xl">←</Link><div><p className="text-xs text-indigo-200">Product details</p><h1 className="font-bold">{product.name}</h1></div></div><NotificationBellHeader /></header><main className="p-4"><article className="premium-card overflow-hidden"><div className="flex h-72 items-center justify-center bg-slate-50">{product.image ? <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <span className="text-7xl">🛍️</span>}</div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Digital product</p><h2 className="mt-2 text-2xl font-bold">{product.name}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{product.description || product.short_description || 'A premium product from this store.'}</p><p className="mt-5 text-2xl font-bold text-indigo-700">₹{product.price}</p><button onClick={() => cart.add({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image })} className="primary-button mt-5 w-full">Add to cart</button></div></article></main><CustomerBottomNav storeSlug={storeSlug!} active="shop" /><CustomerChatWidget storeSlug={storeSlug!} /></div>
  )
}
