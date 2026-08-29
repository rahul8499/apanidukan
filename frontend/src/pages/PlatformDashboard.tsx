import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  Store,
  Users,
  Eye,
  ShoppingBag,
  IndianRupee,
  Package,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Building2,
  Sparkles,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  X,
  TrendingUp,
  User as UserIcon,
  MapPin
} from 'lucide-react'
import { BUSINESS_TYPES, getBusinessType, getBusinessTypeTitle } from '../utils/businessTypes'
import toast from 'react-hot-toast'

export default function PlatformDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBTypeFilter, setSelectedBTypeFilter] = useState('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')
  const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState<'today' | 'month' | 'all'>('month')

  // Deleted Sellers Admin Tab
  const [activeTab, setActiveTab] = useState<'stores' | 'analytics' | 'deleted_sellers'>('stores')
  const [deletedSellers, setDeletedSellers] = useState<any[]>([])
  const [loadingDeletedSellers, setLoadingDeletedSellers] = useState(false)

  // Broadcast Announcement State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [announcementMsg, setAnnouncementMsg] = useState('')
  const [announcementLevel, setAnnouncementLevel] = useState<'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT'>('INFO')
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false)

  const handleSaveAnnouncement = async (isDeactivate: boolean = false) => {
    setIsPublishingAnnouncement(true)
    const tid = toast.loading(isDeactivate ? 'Clearing active announcement...' : 'Publishing platform announcement...')
    try {
      const res = await api.post('/auth/admin/announcement/', {
        message: isDeactivate ? '' : announcementMsg,
        level: announcementLevel,
        is_active: !isDeactivate
      })
      toast.success(res.data.message || 'Announcement updated!', { id: tid })
      setShowAnnouncementModal(false)
      loadPlatformData()
    } catch {
      toast.error('Failed to update platform announcement.', { id: tid })
    } finally {
      setIsPublishingAnnouncement(false)
    }
  }

  const handleExportCSV = async () => {
    const tid = toast.loading('Preparing store data CSV report...')
    try {
      const response = await api.get('/auth/admin/export-stores-csv/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `apani_dukan_stores_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('✓ CSV report downloaded successfully!', { id: tid })
    } catch {
      toast.error('Failed to download CSV report', { id: tid })
    }
  }

  // Store Inspection Modal State
  const [selectedInspectStore, setSelectedInspectStore] = useState<any>(null)
  const [inspectTab, setInspectTab] = useState<'overview' | 'customers'>('overview')
  const [storeCustomers, setStoreCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')

  const fetchStoreCustomers = async (storeId: number) => {
    setLoadingCustomers(true)
    try {
      const res = await api.get(`/auth/admin/stores/${storeId}/customers/`)
      setStoreCustomers(res.data.customers || [])
    } catch {
      setStoreCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  useEffect(() => {
    if (selectedInspectStore) {
      setInspectTab('overview')
      setCustomerSearchQuery('')
      fetchStoreCustomers(selectedInspectStore.id)
    } else {
      setStoreCustomers([])
    }
  }, [selectedInspectStore])

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'primary' | 'success'
    onConfirm: () => void | Promise<void>
  } | null>(null)

  const auth = useAuth()
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  const [loadError, setLoadError] = useState<string | null>(null)

  const loadPlatformData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.get('/auth/platform/dashboard/')
      setData(res.data)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load admin dashboard.'
      setLoadError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const loadDeletedSellers = async () => {
    setLoadingDeletedSellers(true)
    try {
      const res = await api.get('/auth/admin/deleted-sellers/')
      setDeletedSellers(res.data.results || [])
    } catch (err: any) {
      toast.error('Failed to load deleted sellers.')
    } finally {
      setLoadingDeletedSellers(false)
    }
  }

  const isSuperAdmin = Boolean(auth.user?.is_staff)

  useEffect(() => {
    if (!auth.user) return
    if (isSuperAdmin) {
      loadPlatformData()
    } else {
      setLoading(false)
    }
  }, [auth.user, isSuperAdmin])

  useEffect(() => {
    if (activeTab === 'deleted_sellers') {
      loadDeletedSellers()
    }
  }, [activeTab])

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
          <p className="text-xs text-slate-400 font-bold">Verifying Superadmin Access...</p>
        </div>
      </div>
    )
  }

  if (!auth.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans p-4">
        <div className="text-center space-y-4 max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black">Admin Login Required</h2>
          <p className="text-xs text-slate-400 font-medium">Please log in with your Superadmin account to access the control panel.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-500 cursor-pointer shadow-md"
          >
            🔑 Log In as Admin
          </button>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans p-4">
        <div className="text-center space-y-4 max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
            <XCircle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">Admin Privileges Required</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Your logged-in account (<strong className="text-slate-200">{auth.user.email || auth.user.phone_number}</strong>) is a Seller Account, not a Superadmin Account.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => {
                auth.logout()
                navigate('/login')
              }}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-500 cursor-pointer shadow-md"
            >
              🔄 Switch to Superadmin Account
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full rounded-xl border border-slate-800 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              🏪 Go to Seller Store Workspace
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans p-4">
        <div className="text-center space-y-4 max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
            <XCircle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">Platform Dashboard Error</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {loadError}
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={loadPlatformData}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-500 cursor-pointer shadow-md"
            >
              🔄 Retry Loading Data
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full rounded-xl border border-slate-800 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              🏪 Go to Seller Store Workspace
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleToggleStoreStatus = (store: any) => {
    const newStatusText = store.is_published ? 'DRAFT (Hide from public)' : 'LIVE (Publish to public)'
    setConfirmModal({
      isOpen: true,
      title: `Change Status for "${store.name}"?`,
      message: `Do you want to change store status to ${newStatusText}?`,
      confirmText: store.is_published ? 'Unpublish Store' : 'Publish Store LIVE',
      cancelText: 'Cancel',
      variant: store.is_published ? 'warning' : 'success',
      onConfirm: async () => {
        const tid = toast.loading(`Updating store status...`)
        try {
          const res = await api.post(`/auth/admin/stores/${store.id}/toggle-status/`)
          toast.success(res.data.message || 'Status updated successfully!', { id: tid })
          await loadPlatformData()
        } catch (err: any) {
          toast.error(err?.response?.data?.detail || 'Failed to update store status', { id: tid })
        }
      }
    })
  }

  const handleDeactivateStore = (store: any) => {
    setConfirmModal({
      isOpen: true,
      title: `Deactivate & Suspend Store?`,
      message: `Are you sure you want to deactivate '${store.name}' and suspend seller (${store.owner_email || store.owner_phone})? The store will be unpublished and seller access revoked.`,
      confirmText: 'Deactivate Store & Suspend Seller',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        const tid = toast.loading('Deactivating store...')
        try {
          await api.post(`/auth/admin/stores/${store.id}/deactivate/`)
          toast.success(`Store '${store.name}' deactivated successfully!`, { id: tid })
          setSelectedInspectStore(null)
          await loadPlatformData()
        } catch (err: any) {
          toast.error(err?.response?.data?.detail || 'Failed to deactivate store', { id: tid })
        }
      }
    })
  }

  const handleRestoreSeller = (seller: any) => {
    setConfirmModal({
      isOpen: true,
      title: `Restore Seller Account?`,
      message: `Restore account for ${seller.email || seller.phone_number}? The seller will be able to log in again.`,
      confirmText: 'Restore Account',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        const tid = toast.loading('Restoring seller account...')
        try {
          await api.post(`/auth/admin/deleted-sellers/${seller.id}/restore/`)
          toast.success('Seller account restored successfully!', { id: tid })
          await loadDeletedSellers()
          await loadPlatformData()
        } catch (err: any) {
          toast.error(err?.response?.data?.detail || 'Failed to restore seller', { id: tid })
        }
      }
    })
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-bold tracking-wide text-slate-300">Loading Platform Admin Control Panel...</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats || {}
  const allStores: any[] = data?.stores || []

  // Filter stores
  const filteredStores = allStores.filter((st: any) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      st.name.toLowerCase().includes(q) ||
      st.slug.toLowerCase().includes(q) ||
      st.owner_email.toLowerCase().includes(q) ||
      st.owner_name.toLowerCase().includes(q) ||
      st.owner_phone.includes(q)

    const matchesBType = selectedBTypeFilter === 'ALL' || st.business_type === selectedBTypeFilter
    const matchesStatus =
      selectedStatusFilter === 'ALL' ||
      (selectedStatusFilter === 'PUBLISHED' && st.is_published) ||
      (selectedStatusFilter === 'DRAFT' && !st.is_published)

    return matchesQuery && matchesBType && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-16">
      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md px-3 sm:px-8 py-3.5">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Header Title & Branding */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white shadow-lg shadow-indigo-500/20 shrink-0">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-xl font-black tracking-tight text-white leading-tight">
                    Apani Dukan Platform Admin
                  </h1>
                  <span className="rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                    Superadmin
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">
                  Real-time Store Performance, Seller Link Visits & Platform Metrics
                </p>
              </div>
            </div>

            {/* Mobile Logout Button */}
            <button
              onClick={() => {
                auth.logout()
                navigate('/login')
              }}
              className="flex sm:hidden items-center justify-center h-9 w-9 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer shrink-0"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Actions Grid / Row */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2 py-2 text-xs font-black text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer shadow-md text-center"
              title="Broadcast announcement banner to all seller dashboards"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Broadcast 📢</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-md text-center"
              title="Download 1-Click CSV Report of all stores & seller metrics"
            >
              <span className="truncate">CSV 📥</span>
            </button>

            <button
              onClick={() => {
                loadPlatformData()
                toast.success('Real-time database metrics updated!')
              }}
              disabled={loading}
              title="Click to fetch latest real-time PostgreSQL database metrics"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-2 py-2 text-xs font-black text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-md text-center"
            >
              <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${loading ? 'animate-spin text-white' : 'text-indigo-400'}`} />
              <span className="truncate">Live Refresh 🔄</span>
            </button>

            {/* Desktop Logout Button */}
            <button
              onClick={() => {
                auth.logout()
                navigate('/login')
              }}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="mx-auto max-w-7xl px-3 sm:px-8 pt-4 sm:pt-6 space-y-5 sm:space-y-6">
        {/* Active Broadcast Announcement Banner */}
        {data?.announcement && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-xl">📢</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-300">
                    Active Broadcast ({data.announcement.level})
                  </span>
                </div>
                <p className="text-xs font-bold text-white mt-0.5">{data.announcement.message}</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveAnnouncement(true)}
              className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
            >
              Stop Announcement 🛑
            </button>
          </div>
        )}

        {/* Navigation Tabs (Scrollable on Android Mobile Screens) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-3 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'stores'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <Store className="h-4 w-4" />
            <span>Active Seller Stores ({allStores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>📈 Sales & Revenue Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('deleted_sellers')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'deleted_sellers'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <Trash2 className="h-4 w-4" />
            <span>Deactivated / Deleted Sellers</span>
          </button>
        </div>

        {activeTab === 'stores' && (
          <>
            {/* KPI Metric Cards (Compact High-Density Grid for Android Phones) */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              {/* Total Stores */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-sm space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-indigo-400">
                  <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">🏪 Stores</span>
                  <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-white">{stats.total_stores || 0}</div>
                <div className="flex flex-wrap items-center gap-1 text-[8.5px] sm:text-[10px] font-bold">
                  <span className="text-emerald-400">● {stats.published_stores || 0} Live</span>
                  <span className="text-slate-500 hidden sm:inline">|</span>
                  <span className="text-amber-400">● {stats.draft_stores || 0} Draft</span>
                </div>
              </div>

              {/* Total Sellers */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-sm space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-teal-400">
                  <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">👤 Sellers</span>
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-white">{stats.total_sellers || 0}</div>
                <p className="text-[8.5px] sm:text-[10px] text-slate-400 font-medium truncate">Registered Accounts</p>
              </div>

              {/* Total Store Visits & Link Clicks */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-sm space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">🔗 Link Visits</span>
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-sky-300">{stats.total_visits || 0}</div>
                <p className="text-[8.5px] sm:text-[10px] text-slate-400 font-medium truncate">Store Link Clicks</p>
              </div>

              {/* Total Orders Placed */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-sm space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">🛍️ Orders</span>
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-emerald-400">{stats.total_orders || 0}</div>
                <p className="text-[8.5px] sm:text-[10px] text-slate-400 font-medium truncate">Customer Orders</p>
              </div>

              {/* Platform Gross Revenue */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-sm space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">💰 Total Sales</span>
                  <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
                <div className="text-base sm:text-2xl font-black text-amber-300 truncate">
                  ₹{Number(stats.total_revenue || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[8.5px] sm:text-[10px] text-slate-400 font-medium truncate">Platform Revenue</p>
              </div>

              {/* Total Listed Products */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-sm space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-purple-400">
                  <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">📦 Products</span>
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-purple-300">{stats.total_products || 0}</div>
                <p className="text-[8.5px] sm:text-[10px] text-slate-400 font-medium truncate">Listed Catalog Items</p>
              </div>
            </div>

            {/* Filter & Search Bar Controls (Compact for Mobile) */}
            <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 shadow-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Store Name, Owner, Phone or Email..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-8 text-xs font-medium text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category & Status Filter Dropdowns Side-by-Side on Mobile */}
                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  <select
                    value={selectedBTypeFilter}
                    onChange={(e) => setSelectedBTypeFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-bold text-white shadow-inner focus:border-indigo-500 focus:outline-none cursor-pointer truncate"
                  >
                    <option value="ALL">All Categories</option>
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.icon} {getBusinessTypeTitle(bt, i18n.language)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-bold text-white shadow-inner focus:border-indigo-500 focus:outline-none cursor-pointer truncate"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="LIVE">🟢 LIVE Only</option>
                    <option value="DRAFT">⚪ DRAFT Only</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Counter Tag */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
                <span>
                  Showing <strong className="text-white">{filteredStores.length}</strong> of{' '}
                  <strong className="text-slate-300">{allStores.length}</strong> seller stores
                </span>
                {(searchQuery || selectedBTypeFilter !== 'ALL' || selectedStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedBTypeFilter('ALL')
                      setSelectedStatusFilter('ALL')
                    }}
                    className="text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Stores List: Mobile Native Card View (for Android Phones) & Desktop Table View */}
            <div className="space-y-4">
              {/* 1. MOBILE NATIVE CARDS (VISIBLE ON PHONES & TABLETS < 1024px) */}
              <div className="space-y-3.5 block lg:hidden">
                {filteredStores.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center text-slate-500">
                    <Store className="mx-auto h-8 w-8 text-slate-600" />
                    <p className="mt-2 text-sm font-bold">No seller stores match your search query.</p>
                  </div>
                ) : (
                  filteredStores.map((st: any) => {
                    const bType = getBusinessType(st.business_type)
                    const bTitle = getBusinessTypeTitle(bType, i18n.language)

                    return (
                      <div key={st.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3 shadow-lg hover:border-slate-700 transition-all">
                        {/* Card Header: Icon + Name + Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg border border-slate-700">
                              {bType.icon}
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => setSelectedInspectStore(st)}
                                className="font-black text-white hover:text-indigo-400 text-sm text-left truncate block cursor-pointer"
                              >
                                {st.name}
                              </button>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-bold text-slate-300">
                                  {bTitle}
                                </span>
                                <span className="rounded bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 font-black uppercase">
                                  {st.subscription?.plan || 'PRO_TRIAL'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleStoreStatus(st)}
                            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider ${st.is_published
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${st.is_published ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                            <span>{st.is_published ? '🟢 LIVE' : '⚪ DRAFT'}</span>
                          </button>
                        </div>

                        {/* Seller Owner Info & WhatsApp Contact */}
                        <div className="flex items-center justify-between gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 truncate">{st.owner_name}</div>
                            <div className="text-[11px] text-slate-400 truncate">{st.owner_phone || st.owner_email}</div>
                          </div>
                          {st.owner_phone && (
                            <a
                              href={`https://wa.me/${st.owner_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2 py-1 text-[10.5px] font-black text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all"
                            >
                              <span>💬 WhatsApp</span>
                            </a>
                          )}
                        </div>

                        {/* Quick Metrics Bar */}
                        <div className="grid grid-cols-3 gap-2 text-center py-0.5">
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                            <div className="text-[9px] text-slate-400 font-bold uppercase">Visits</div>
                            <div className="text-xs font-black text-sky-400">{st.visits_count || 0}</div>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                            <div className="text-[9px] text-slate-400 font-bold uppercase">Products</div>
                            <div className="text-xs font-black text-indigo-400">{st.products_count || 0}</div>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                            <div className="text-[9px] text-slate-400 font-bold uppercase">Buyers</div>
                            <div className="text-xs font-black text-teal-400">{st.unique_buyers || 0}</div>
                          </div>
                        </div>

                        {/* Revenue Breakdown */}
                        <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-400 font-bold">Total Sales (GMV):</span>
                            <span className="font-black text-amber-300 text-sm">
                              ₹{Number(st.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                            <div className="bg-amber-950/60 border border-amber-800/40 text-amber-300 font-bold p-1.5 rounded-lg flex justify-between">
                              <span>Today:</span>
                              <span>₹{Number(st.today_revenue || 0).toLocaleString('en-IN')} ({st.today_orders || 0})</span>
                            </div>
                            <div className="bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-bold p-1.5 rounded-lg flex justify-between">
                              <span>Month:</span>
                              <span>₹{Number(st.monthly_revenue || 0).toLocaleString('en-IN')} ({st.monthly_orders || 0})</span>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Actions Grid */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            onClick={() => setSelectedInspectStore(st)}
                            className="rounded-xl border border-indigo-500/40 bg-indigo-600/20 py-2 text-center text-xs font-black text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                          >
                            Inspect 📊
                          </button>
                          <button
                            onClick={() => navigate(`/stores/${st.id}/manage`)}
                            className="rounded-xl border border-slate-700 bg-slate-800 py-2 text-center text-xs font-black text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            Manage ⚙️
                          </button>
                          <a
                            href={`/store/${st.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-sky-500/40 bg-sky-500/10 py-2 text-center text-xs font-black text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition-all flex items-center justify-center gap-1"
                          >
                            <span>Store</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 2. DESKTOP HIGH-DENSITY TABLE VIEW (VISIBLE ON LARGE SCREENS >= 1024px) */}
              <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="p-4">🏪 Store</th>
                        <th className="p-4">👤 Owner</th>
                        <th className="p-4">🔗 Store Visits</th>
                        <th className="p-4">📦 Products</th>
                        <th className="p-4">💰 Sales & Orders</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredStores.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-500">
                            <Store className="mx-auto h-8 w-8 text-slate-600" />
                            <p className="mt-2 text-sm font-bold">No seller stores match your search query.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredStores.map((st: any) => {
                          const bType = getBusinessType(st.business_type)
                          const bTitle = getBusinessTypeTitle(bType, i18n.language)

                          return (
                            <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                              {/* Store & Category */}
                              <td className="p-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{bType.icon}</span>
                                    <button
                                      onClick={() => setSelectedInspectStore(st)}
                                      className="font-black text-white hover:text-indigo-400 transition-colors text-sm text-left cursor-pointer"
                                    >
                                      {st.name}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-bold text-slate-300">
                                      {bTitle}
                                    </span>
                                    <span className="rounded bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 font-black uppercase">
                                      {st.subscription?.plan || 'PRO_TRIAL'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Seller Details & Joined Date */}
                              <td className="p-4">
                                <div className="space-y-0.5 text-xs">
                                  <div className="font-bold text-slate-200">{st.owner_name}</div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <Mail className="h-3 w-3 text-slate-500" />
                                    <span>{st.owner_email}</span>
                                  </div>
                                  {st.owner_phone && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                      <Phone className="h-3 w-3 text-slate-500" />
                                      <span>{st.owner_phone}</span>
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-500 font-medium pt-0.5">
                                    📅 Joined: {st.created_at ? new Date(st.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                  </div>
                                </div>
                              </td>

                              {/* Link Visits & Buyers */}
                              <td className="p-4">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-black text-sky-400">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>{st.visits_count || 0} visits</span>
                                  </div>
                                  <div className="text-[10px] text-teal-400 font-bold">
                                    👥 {st.unique_buyers || 0} {st.unique_buyers === 1 ? 'Customer' : 'Customers'}
                                  </div>
                                </div>
                              </td>

                              {/* Product Count */}
                              <td className="p-4">
                                <div className="space-y-0.5 text-xs">
                                  <div className="font-bold text-slate-200">{st.products_count || 0} Listed Items</div>
                                  <div className="text-[10px] text-emerald-400 font-bold">{st.active_products_count || 0} Active</div>
                                </div>
                              </td>

                              {/* Sales & Orders Breakdown */}
                              <td className="p-4">
                                <div className="space-y-1">
                                  <div className="text-xs font-black text-amber-300">
                                    ₹{Number(st.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Total GMV
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[9.5px]">
                                    <span className="bg-amber-950/80 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-800/50">
                                      Today: ₹{Number(st.today_revenue || 0).toLocaleString('en-IN')} ({st.today_orders || 0})
                                    </span>
                                    <span className="bg-indigo-950/80 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-800/50">
                                      Month: ₹{Number(st.monthly_revenue || 0).toLocaleString('en-IN')} ({st.monthly_orders || 0})
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-400">
                                    🛍️ {st.orders_count || 0} Orders ({st.wa_orders_count || 0} WA / {st.web_orders_count || 0} Web)
                                  </div>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="p-4">
                                <button
                                  onClick={() => handleToggleStoreStatus(st)}
                                  title="Click to toggle Live / Draft status"
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${st.is_published
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                                    }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${st.is_published ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                                  <span>{st.is_published ? '🟢 LIVE' : '⚪ DRAFT'}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setSelectedInspectStore(st)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-600/20 px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                                    title="Inspect Store Metrics & Reality Data"
                                  >
                                    <span>Inspect 📊</span>
                                  </button>

                                  <a
                                    href={`/store/${st.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
                                    title="View Public Storefront"
                                  >
                                    <ExternalLink className="h-3 w-3 text-sky-400" />
                                    <span>View</span>
                                  </a>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Date Range Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  📅 Analytics Time Filter / तारीख फिल्टर:
                </span>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setLeaderboardTimeFilter('today')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${leaderboardTimeFilter === 'today'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    Today (आज)
                  </button>
                  <button
                    onClick={() => setLeaderboardTimeFilter('month')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${leaderboardTimeFilter === 'month'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    This Month (या महिन्यात)
                  </button>
                  <button
                    onClick={() => setLeaderboardTimeFilter('all')}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${leaderboardTimeFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    All Time (एकूण सर्व)
                  </button>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-400">
                Active View: <span className="text-emerald-400 font-black">
                  {leaderboardTimeFilter === 'today' ? "Today's Live Sales & Today's Top Stores" : leaderboardTimeFilter === 'month' ? "This Month's Sales (Monthly GMV)" : "All-Time Lifetime Platform GMV"}
                </span>
              </div>
            </div>

            {/* Sales Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Today's Sales */}
              <div className={`rounded-2xl border p-5 shadow-xl space-y-2 transition-all ${leaderboardTimeFilter === 'today' ? 'border-amber-500/60 bg-amber-950/20 ring-1 ring-amber-500/40' : 'border-slate-800 bg-slate-900'
                }`}>
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-black uppercase text-slate-400">Today's Revenue</span>
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div className="text-3xl font-black text-white">
                  ₹{(data?.analytics?.today_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-amber-400 font-bold">
                  🛍️ {data?.analytics?.today_orders || 0} Orders Today
                </p>
              </div>

              {/* Monthly Sales */}
              <div className={`rounded-2xl border p-5 shadow-xl space-y-2 transition-all ${leaderboardTimeFilter === 'month' ? 'border-indigo-500/60 bg-indigo-950/20 ring-1 ring-indigo-500/40' : 'border-slate-800 bg-slate-900'
                }`}>
                <div className="flex items-center justify-between text-indigo-400">
                  <span className="text-xs font-black uppercase text-slate-400">This Month's GMV</span>
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div className="text-3xl font-black text-white">
                  ₹{(data?.analytics?.monthly_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-indigo-400 font-bold">
                  🛍️ {data?.analytics?.monthly_orders || 0} Orders This Month
                </p>
              </div>

              {/* WhatsApp Orders Sales */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-black uppercase text-slate-400">WhatsApp Sales</span>
                  <Phone className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black text-white">
                  ₹{(data?.analytics?.wa_sales_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 font-medium">Direct Seller WhatsApp Checkout</p>
              </div>

              {/* Web Online Orders Sales */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-xs font-black uppercase text-slate-400">Web Online Sales</span>
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black text-white">
                  ₹{(data?.analytics?.web_sales_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 font-medium">Integrated Online Cart Orders</p>
              </div>
            </div>

            {/* Top Stores Leaderboard Table Dynamic by Time Filter */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>🏆</span>
                    <span>
                      Top Selling Stores Leaderboard ({leaderboardTimeFilter === 'today' ? "Today" : leaderboardTimeFilter === 'month' ? "This Month" : "All Time"})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Stores generating maximum sales during selected time period ({leaderboardTimeFilter.toUpperCase()})
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer"
                >
                  <span>Download Full CSV 📥</span>
                </button>
              </div>

              {/* Leaderboard Content: Mobile Cards (<1024px) & Desktop Table (>=1024px) */}
              {(() => {
                const sortedStores = [...allStores].sort((a, b) => {
                  if (leaderboardTimeFilter === 'today') return (b.today_revenue || 0) - (a.today_revenue || 0)
                  if (leaderboardTimeFilter === 'month') return (b.monthly_revenue || 0) - (a.monthly_revenue || 0)
                  return (b.revenue || 0) - (a.revenue || 0)
                })

                return (
                  <>
                    {/* 1. Mobile Leaderboard Cards */}
                    <div className="space-y-3 block lg:hidden p-3.5 sm:p-4">
                      {sortedStores.slice(0, 5).map((st: any, idx: number) => {
                        const salesAmt = leaderboardTimeFilter === 'today' ? (st.today_revenue || 0)
                          : leaderboardTimeFilter === 'month' ? (st.monthly_revenue || 0)
                            : (st.revenue || 0)

                        const ordersCount = leaderboardTimeFilter === 'today' ? (st.today_orders || 0)
                          : leaderboardTimeFilter === 'month' ? (st.monthly_orders || 0)
                            : (st.orders_count || 0)

                        return (
                          <div key={st.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-black text-xs shrink-0">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-white text-sm truncate">{st.name}</span>
                              </div>
                              <button
                                onClick={() => setSelectedInspectStore(st)}
                                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10.5px] font-bold text-slate-200 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                              >
                                Inspect 📊
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                              <div className="text-[11px] text-slate-400">
                                <span className="font-bold text-indigo-400">{ordersCount} Orders</span> • {st.owner_name}
                              </div>
                              <span className="font-black text-emerald-400 text-sm">
                                ₹{Number(salesAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* 2. Desktop Leaderboard Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Rank</th>
                            <th className="px-4 py-3">Store Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Owner</th>
                            <th className="px-4 py-3">Selected Period Orders</th>
                            <th className="px-4 py-3">Sales ({leaderboardTimeFilter.toUpperCase()})</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-medium">
                          {sortedStores.slice(0, 5).map((st: any, idx: number) => {
                            const salesAmt = leaderboardTimeFilter === 'today' ? (st.today_revenue || 0)
                              : leaderboardTimeFilter === 'month' ? (st.monthly_revenue || 0)
                                : (st.revenue || 0)

                            const ordersCount = leaderboardTimeFilter === 'today' ? (st.today_orders || 0)
                              : leaderboardTimeFilter === 'month' ? (st.monthly_orders || 0)
                                : (st.orders_count || 0)

                            return (
                              <tr key={st.id} className="hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-black text-amber-400 text-sm">#{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-white text-sm">{st.name}</td>
                                <td className="px-4 py-3">{st.business_type}</td>
                                <td className="px-4 py-3">{st.owner_name} ({st.owner_phone})</td>
                                <td className="px-4 py-3 font-bold text-indigo-400">{ordersCount} Orders</td>
                                <td className="px-4 py-3 font-black text-emerald-400 text-sm">
                                  ₹{Number(salesAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => setSelectedInspectStore(st)}
                                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                                  >
                                    Inspect 📊
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Deleted Sellers Tab */}
        {activeTab === 'deleted_sellers' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-400" />
                <span>Deactivated & Deleted Seller Accounts</span>
              </h2>
              <p className="text-xs text-slate-400">
                Sellers who requested account deletion or deactivation. You can restore their accounts if needed.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-4">Seller ID</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Deleted At</th>
                    <th className="p-4 text-right">Restore Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingDeletedSellers ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Loading deactivated sellers list...
                      </td>
                    </tr>
                  ) : deletedSellers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                        <p className="mt-2 text-sm font-bold">No deleted or deactivated sellers found.</p>
                      </td>
                    </tr>
                  ) : (
                    deletedSellers.map((seller: any) => (
                      <tr key={seller.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-bold text-slate-400">#{seller.id}</td>
                        <td className="p-4 font-bold text-white">{seller.email}</td>
                        <td className="p-4 text-slate-300">{seller.phone_number || 'N/A'}</td>
                        <td className="p-4 text-slate-400">
                          {seller.deleted_at ? new Date(seller.deleted_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleRestoreSeller(seller)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Restore Seller</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-2xl border border-slate-800 text-center space-y-4">
            <button
              onClick={() => setConfirmModal(null)}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-md ${confirmModal.variant === 'danger' ? 'bg-rose-500/20 text-rose-400' :
                confirmModal.variant === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                  confirmModal.variant === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-indigo-500/20 text-indigo-400'
              }`}>
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
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
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${confirmModal.variant === 'danger' ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500' :
                    confirmModal.variant === 'success' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500' :
                      confirmModal.variant === 'warning' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black hover:brightness-110' :
                        'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Reality Inspection Modal */}
      {selectedInspectStore && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedInspectStore(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 text-2xl shrink-0 border border-indigo-500/30">
                {getBusinessType(selectedInspectStore.business_type).icon}
              </div>
              <div className="space-y-1 pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-white">{selectedInspectStore.name}</h2>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${selectedInspectStore.is_published
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                    {selectedInspectStore.is_published ? '🟢 LIVE' : '⚪ DRAFT'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="font-bold text-indigo-400">
                    {getBusinessTypeTitle(getBusinessType(selectedInspectStore.business_type), i18n.language)}
                  </span>
                  <span>•</span>
                  <span>slug: /{selectedInspectStore.slug}</span>
                  <span>•</span>
                  <span className="text-slate-300 font-bold">
                    📅 Joined: {selectedInspectStore.created_at ? new Date(selectedInspectStore.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setInspectTab('overview')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${inspectTab === 'overview'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Store className="h-4 w-4" />
                <span>Store Overview & Stats</span>
              </button>

              <button
                onClick={() => setInspectTab('customers')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${inspectTab === 'customers'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Users className="h-4 w-4 text-teal-400" />
                <span>Customer Directory ({storeCustomers.length})</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {inspectTab === 'overview' && (
              <div className="space-y-6">
                {/* High-Density Performance Reality Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Link Visits */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                      <Eye className="h-4 w-4" />
                      <span>Link Visits</span>
                    </div>
                    <div className="text-xl font-black text-white">
                      {selectedInspectStore.visits_count || 0}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Customer Link Clicks</p>
                  </div>

                  {/* Unique Customers */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                      <Users className="h-4 w-4" />
                      <span>Active Customers</span>
                    </div>
                    <div className="text-xl font-black text-white">
                      {selectedInspectStore.unique_buyers || 0}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Unique Customer Buyers</p>
                  </div>

                  {/* Listed Products */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                      <Package className="h-4 w-4" />
                      <span>Products</span>
                    </div>
                    <div className="text-xl font-black text-white">
                      {selectedInspectStore.products_count || 0}
                    </div>
                    <p className="text-[10px] text-emerald-400 font-bold">
                      {selectedInspectStore.active_products_count || 0} Active Items
                    </p>
                  </div>

                  {/* Orders */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Total Orders</span>
                    </div>
                    <div className="text-xl font-black text-white">
                      {selectedInspectStore.orders_count || 0}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {selectedInspectStore.wa_orders_count || 0} WA / {selectedInspectStore.web_orders_count || 0} Web
                    </p>
                  </div>

                  {/* GMV Revenue */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <TrendingUp className="h-4 w-4" />
                      <span>GMV Revenue</span>
                    </div>
                    <div className="text-xl font-black text-amber-300">
                      ₹{Number(selectedInspectStore.revenue || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Total Store Turnover</p>
                  </div>

                  {/* Subscription Status */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Subscription</span>
                    </div>
                    <div className="text-sm font-black text-indigo-400">
                      {selectedInspectStore.subscription?.plan || 'PRO_TRIAL'}
                    </div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase">
                      Status: {selectedInspectStore.subscription?.status || 'ACTIVE'}
                    </p>
                  </div>
                </div>

                {/* Seller Contact Info Box */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs">
                  <h4 className="font-black text-slate-300 uppercase tracking-wider text-[11px]">Seller Account Owner</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-slate-500" />
                      <span><strong>Owner:</strong> {selectedInspectStore.owner_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span><strong>Email:</strong> {selectedInspectStore.owner_email}</span>
                    </div>
                    {selectedInspectStore.owner_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-500" />
                        <span><strong>Phone:</strong> {selectedInspectStore.owner_phone}</span>
                        <a
                          href={`https://wa.me/${selectedInspectStore.owner_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-500/30"
                        >
                          WhatsApp 💬
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOMER DIRECTORY & ADDRESS REALITY */}
            {inspectTab === 'customers' && (
              <div className="space-y-4">
                {/* Search & Refresh Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Search by customer name, mobile, or address..."
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (selectedInspectStore) fetchStoreCustomers(selectedInspectStore.id)
                    }}
                    disabled={loadingCustomers}
                    title="Refresh Customer Directory"
                    className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingCustomers ? 'animate-spin text-teal-400' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingCustomers ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" />
                    <p>Fetching complete customer directory & delivery addresses...</p>
                  </div>
                ) : storeCustomers.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-center space-y-2">
                    <Users className="h-8 w-8 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-300">No Customers Found Yet</h4>
                    <p className="text-xs text-slate-500">This store has not received customer orders with contact addresses yet.</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                    {storeCustomers
                      .filter((c: any) => {
                        if (!customerSearchQuery) return true
                        const q = customerSearchQuery.toLowerCase()
                        return (
                          (c.name || '').toLowerCase().includes(q) ||
                          (c.phone || '').toLowerCase().includes(q) ||
                          (c.address || '').toLowerCase().includes(q)
                        )
                      })
                      .map((cust: any, idx: number) => (
                        <div
                          key={cust.phone || idx}
                          className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 hover:border-slate-700 transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs">
                                {(cust.name || 'C')[0].toUpperCase()}
                              </div>
                              <div>
                                <h5 className="font-bold text-white text-xs">{cust.name}</h5>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <Phone className="h-3 w-3 text-slate-500" />
                                  <span>{cust.phone}</span>
                                  <a
                                    href={`https://wa.me/${cust.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-500/30"
                                  >
                                    WhatsApp 💬
                                  </a>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-black text-amber-300">
                                ₹{Number(cust.total_spent || 0).toLocaleString('en-IN')} Spent
                              </div>
                              <div className="text-[10px] font-bold text-emerald-400">
                                🛍️ {cust.total_orders || 0} Orders
                              </div>
                            </div>
                          </div>

                          {/* Address & Joined Dates */}
                          <div className="space-y-1.5 text-xs text-slate-300">
                            <div className="flex items-start gap-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                              <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span className="text-[11px] text-slate-300 leading-relaxed">
                                {cust.address || 'No specific delivery address recorded.'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1">
                              <span>📅 First Order: {cust.first_order_at ? new Date(cust.first_order_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                              <span>🕒 Latest Activity: {cust.last_order_at ? new Date(cust.last_order_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  const st = selectedInspectStore
                  setSelectedInspectStore(null)
                  handleToggleStoreStatus(st)
                }}
                className={`rounded-xl px-4 py-3 text-xs font-black transition-all cursor-pointer border ${selectedInspectStore.is_published
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
              >
                {selectedInspectStore.is_published ? '⚪ Unpublish Store' : '🟢 Publish LIVE'}
              </button>

              <button
                onClick={() => handleDeactivateStore(selectedInspectStore)}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-black text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                title="Deactivate Store & Suspend Seller Account"
              >
                <Trash2 className="h-4 w-4" />
                <span>Deactivate & Suspend</span>
              </button>

              <a
                href={`/store/${selectedInspectStore.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-black text-slate-200 hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-4 w-4 text-sky-400" />
                <span>Public Link</span>
              </a>

              <button
                onClick={() => {
                  const st = selectedInspectStore
                  setSelectedInspectStore(null)
                  navigate(`/stores/${st.id}/manage`)
                }}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2 min-w-[160px]"
              >
                <Building2 className="h-4 w-4" />
                <span>Inspect Workspace ⚙️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-lg font-black text-white">Broadcast Platform Announcement</h3>
              </div>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="rounded-xl bg-slate-800 p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400">Announcement Message (Visible to all Sellers)</label>
                <textarea
                  value={announcementMsg}
                  onChange={e => setAnnouncementMsg(e.target.value)}
                  placeholder="e.g. Scheduled platform maintenance tonight at 12 AM. New UPI feature launched!"
                  rows={3}
                  className="mt-1.5 w-full rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Alert Level / Type</label>
                <select
                  value={announcementLevel}
                  onChange={e => setAnnouncementLevel(e.target.value as any)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-bold text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="INFO">Information ℹ️ (Blue Banner)</option>
                  <option value="WARNING">Warning / Maintenance ⚠️ (Amber Banner)</option>
                  <option value="SUCCESS">New Feature Launch 🚀 (Green Banner)</option>
                  <option value="URGENT">Urgent Alert 🚨 (Red Banner)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleSaveAnnouncement(false)}
                  disabled={isPublishingAnnouncement || !announcementMsg.trim()}
                  className="w-full rounded-xl bg-amber-500 py-3 text-xs font-black text-slate-950 hover:bg-amber-400 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  🚀 Publish Announcement Live
                </button>

                {data?.announcement && (
                  <button
                    onClick={() => handleSaveAnnouncement(true)}
                    disabled={isPublishingAnnouncement}
                    className="w-full rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-black text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    🗑️ Clear / Turn Off Active Announcement
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
