import React, { useEffect } from 'react'
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth, AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { resetGenericPlatformPwa } from './pwa/pwaManager'
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
import DownloadApp from './pages/DownloadApp'
import CustomerHome from './pages/CustomerHome'
import CustomerOrdersHome from './pages/CustomerOrdersHome'
import PrivacyPolicy from './pages/PrivacyPolicy'
import DeleteAccount from './pages/DeleteAccount'

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught application error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 text-3xl border border-rose-500/30">
              ⚠️
            </div>
            <h2 className="text-lg font-black text-white">Session Refresh Required</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Your session timed out or a temporary network issue occurred. Please refresh or log in again to continue.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-500 cursor-pointer shadow-md"
              >
                🔄 Refresh Page
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('access_token')
                  localStorage.removeItem('refresh_token')
                  window.location.href = '/login'
                }}
                className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                🔑 Re-login to Account
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const auth = useAuth()
  const location = useLocation()

  // Do not render protected pages (including any locally cached store data)
  // until the saved token has been validated by /auth/me/.
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" aria-label="Checking session" />
      </div>
    )
  }

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

function AdminRoute({ children }: { children: React.ReactElement }) {
  const auth = useAuth()

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-400" aria-label="Checking administrator session" />
      </div>
    )
  }

  if (!auth.user) return <Navigate to="/login" replace />
  if (!auth.user.is_staff) return <Navigate to="/dashboard" replace />
  return children
}

function AppContent() {
  const auth = useAuth()
  const location = useLocation()
  const hideHeader = location.pathname.startsWith('/store/') ||
    location.pathname.startsWith('/s/') ||
    location.pathname.startsWith('/stores/') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname === '/dashboard' ||
    location.pathname === '/customer-home' ||
    location.pathname === '/customer-orders' ||
    location.pathname === '/platform' ||
    location.pathname === '/admin' ||
    location.pathname === '/login' ||
    location.pathname === '/start' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password'

  useEffect(() => {
    const isCustomerOrSellerStore = location.pathname.startsWith('/s/') || location.pathname.startsWith('/store/') || location.pathname.startsWith('/stores/')
    if (!isCustomerOrSellerStore) {
      resetGenericPlatformPwa()
    }
  }, [location.pathname])

  return (
    <div className="app-shell">
      {!hideHeader && (
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-slate-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-sm text-white">Q</span>
              QuickStore
            </Link>
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
      )}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/stores/create" element={<ProtectedRoute><CreateStore /></ProtectedRoute>} />
          <Route path="/stores/:storeId/manage" element={<ProtectedRoute><StoreManager /></ProtectedRoute>} />
          <Route path="/stores/:storeId/catalog" element={<ProtectedRoute><SellerCatalog /></ProtectedRoute>} />
          <Route path="/stores/:storeId/payments" element={<ProtectedRoute><SellerPayments /></ProtectedRoute>} />
          <Route path="/stores/:storeId/orders" element={<ProtectedRoute><SellerOrders /></ProtectedRoute>} />
          <Route path="/stores/:storeId/chat" element={<ProtectedRoute><SellerChat /></ProtectedRoute>} />
          <Route path="/stores/:storeId/requests" element={<ProtectedRoute><SellerRequests /></ProtectedRoute>} />
          <Route path="/stores/:storeId/analytics" element={<ProtectedRoute><SellerAnalytics /></ProtectedRoute>} />
          <Route path="/stores/:storeId/subscription" element={<ProtectedRoute><SellerSubscription /></ProtectedRoute>} />
          <Route path="/stores/:storeId/coupons" element={<ProtectedRoute><SellerCoupons /></ProtectedRoute>} />
          <Route path="/start" element={<StartStore />} />
          <Route path="/platform" element={<AdminRoute><PlatformDashboard /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><PlatformDashboard /></AdminRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
          <Route path="/download" element={<DownloadApp />} />
          <Route path="/seller" element={<Navigate to="/dashboard" replace />} />
          <Route path="/customer-home" element={<CustomerHome />} />
          <Route path="/customer-orders" element={<CustomerOrdersHome />} />

          {/* Customer Store Front Routes (/store/:slug and /s/:slug) */}
          <Route path="/store/:storeSlug" element={<StoreHome />} />
          <Route path="/s/:storeSlug" element={<StoreHome />} />
          <Route path="/store/:storeSlug/cart" element={<StoreCart />} />
          <Route path="/s/:storeSlug/cart" element={<StoreCart />} />
          <Route path="/store/:storeSlug/order/:reference" element={<CustomerOrderTracking />} />
          <Route path="/s/:storeSlug/order/:reference" element={<CustomerOrderTracking />} />
          <Route path="/store/:storeSlug/orders" element={<CustomerOrders />} />
          <Route path="/s/:storeSlug/orders" element={<CustomerOrders />} />
          <Route path="/store/:storeSlug/product/:productSlug" element={<ProductPage />} />
          <Route path="/s/:storeSlug/product/:productSlug" element={<ProductPage />} />

          <Route path="/" element={<PwaLaunch />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/delete-account" element={<DeleteAccount />} />
        </Routes>
      </main>
    </div>
  )
}

import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
          <Toaster 
            position="top-center" 
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e293b',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 999999
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#fff',
                },
              },
            }} 
          />
        </NotificationProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  )
}
