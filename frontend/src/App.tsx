import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import StoreHome from './pages/StoreHome'
import ProductPage from './pages/ProductPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateStore from './pages/CreateStore'
import StoreManager from './pages/StoreManager'
import StartStore from './pages/StartStore'
import PlatformDashboard from './pages/PlatformDashboard'
import SellerPayments from './pages/SellerPayments'
import StoreCart from './pages/StoreCart'
import SellerOrders from './pages/SellerOrders'
import PwaLaunch from './pages/PwaLaunch'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import Downloads from './pages/Downloads'
import OrderDetail from './pages/OrderDetail'
import CustomerOrderTracking from './pages/CustomerOrderTracking'
import CustomerOrders from './pages/CustomerOrders'
import SellerChat from './pages/SellerChat'
import SellerRequests from './pages/SellerRequests'
import SellerAnalytics from './pages/SellerAnalytics'
import SellerCatalog from './pages/SellerCatalog'
import SellerSubscription from './pages/SellerSubscription'
import SellerCoupons from './pages/SellerCoupons'
import { AuthProvider } from './context/AuthContext'

import { NotificationProvider } from './context/NotificationContext'
import NotificationBellHeader from './components/NotificationBellHeader'

export default function App(){
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  )
}

function AppContent(){
  const auth = useAuth()
  const location = useLocation()
  const isSellerArea = location.pathname.startsWith('/store/') || location.pathname.startsWith('/stores/') || location.pathname === '/dashboard' || location.pathname === '/platform'
  return (
    <div className="app-shell">
      {!isSellerArea && <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-950"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-sm text-white">M</span>MultiStore</Link>
          <nav className="flex items-center gap-4">
            <Link to="/start" className="text-sm font-semibold text-indigo-700">Create your store</Link>
            {auth.user ? (
              <>
                <Link to="/dashboard" className="text-sm">Dashboard</Link>
                <button onClick={auth.logout} className="secondary-button text-sm">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm">Login</Link>
                <Link to="/register" className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      }
      <main>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/forgot-password" element={<ForgotPassword/>} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/stores/create" element={<CreateStore/>} />
        <Route path="/stores/:storeId/manage" element={<StoreManager/>} />
        <Route path="/stores/:storeId/catalog" element={<SellerCatalog/>} />
        <Route path="/stores/:storeId/payments" element={<SellerPayments/>} />
        <Route path="/stores/:storeId/orders" element={<SellerOrders/>} />
        <Route path="/stores/:storeId/chat" element={<SellerChat/>} />
        <Route path="/stores/:storeId/requests" element={<SellerRequests/>} />
        <Route path="/stores/:storeId/analytics" element={<SellerAnalytics/>} />
        <Route path="/stores/:storeId/subscription" element={<SellerSubscription/>} />
        <Route path="/stores/:storeId/coupons" element={<SellerCoupons/>} />
        <Route path="/start" element={<StartStore/>} />
        <Route path="/platform" element={<PlatformDashboard/>} />
        <Route path="/cart" element={<Cart/>} />
        <Route path="/checkout" element={<Checkout/>} />
        <Route path="/orders" element={<Orders/>} />
        <Route path="/orders/:id" element={<OrderDetail/>} />
        <Route path="/downloads" element={<Downloads/>} />
        <Route path="/store/:storeSlug" element={<StoreHome/>} />
        <Route path="/store/:storeSlug/cart" element={<StoreCart/>} />
        <Route path="/store/:storeSlug/order/:reference" element={<CustomerOrderTracking/>} />
        <Route path="/store/:storeSlug/orders" element={<CustomerOrders/>} />
        <Route path="/store/:storeSlug/product/:productSlug" element={<ProductPage/>} />
        <Route path="/" element={<PwaLaunch/>} />
      </Routes>
      </main>
    </div>
  )
}
