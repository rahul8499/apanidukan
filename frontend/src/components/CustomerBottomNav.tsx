import React from 'react'
import { Link } from 'react-router-dom'
import { useStoreCart } from '../context/StoreCartContext'

export default function CustomerBottomNav({ storeSlug, active }: { storeSlug: string; active?: 'home' | 'shop' | 'cart' | 'orders' | 'chat' }){
  const cart = useStoreCart()
  const itemClass = (name: string) => `relative flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1.5 ${active === name ? 'font-bold text-indigo-700' : 'text-slate-500 hover:text-indigo-600'}`
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-slate-200 bg-white/95 px-2 py-2.5 text-xs shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:left-0 lg:right-0 lg:max-w-none lg:-translate-x-0 lg:mx-auto lg:w-full lg:justify-around">
      <Link to={`/store/${storeSlug}`} className={itemClass('home')}>
        <span className="text-lg">⌂</span>
        <span>Home</span>
      </Link>
      <Link to={`/store/${storeSlug}#products`} className={itemClass('shop')}>
        <span className="text-lg">▦</span>
        <span>Shop</span>
      </Link>
      <Link to={`/store/${storeSlug}/cart`} className={itemClass('cart')}>
        <span className="text-lg">🛍</span>
        {cart.count > 0 && (
          <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
            {cart.count}
          </span>
        )}
        <span>Cart</span>
      </Link>
      <Link to={`/store/${storeSlug}/orders`} className={itemClass('orders')}>
        <span className="text-lg">📦</span>
        <span>Orders</span>
      </Link>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('qs-open-chat'))}
        className={itemClass('chat')}
      >
        <span className="text-lg">💬</span>
        <span>Chat</span>
      </button>
    </nav>
  )
}
