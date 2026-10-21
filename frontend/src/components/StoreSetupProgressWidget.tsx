import React, { useState } from 'react'
import { CheckCircle2, HelpCircle, ArrowUpRight, Sparkles, ChevronDown } from 'lucide-react'

interface StoreSetupProgressWidgetProps {
  store: any
  categoriesCount: number
  productsCount: number
  launcherLabel: string
  launchTitle: string
  launchSubtext: string
  orderLinkLabel: string
  onRequestPublish: () => void
  onOpenOnboardingTour?: () => void
}

export default function StoreSetupProgressWidget({
  store,
  categoriesCount,
  productsCount,
  launcherLabel,
  launchTitle,
  launchSubtext,
  orderLinkLabel,
  onRequestPublish,
  onOpenOnboardingTour
}: StoreSetupProgressWidgetProps) {
  const hasPhone = Boolean(store?.phone_number || store?.whatsapp_phone)
  const hasCategory = categoriesCount > 0
  const hasProduct = productsCount > 0
  const isLive = Boolean(store?.is_published)

  const tasks = [
    {
      id: 'phone',
      title: 'WhatsApp',
      isCompleted: hasPhone,
      label: hasPhone ? 'Saved' : '+ Phone',
      count: null,
      targetId: 'share',
      icon: '📲'
    },
    {
      id: 'category',
      title: 'Category',
      isCompleted: hasCategory,
      label: hasCategory ? `${categoriesCount}` : '+ Add',
      count: categoriesCount,
      targetId: 'categories',
      icon: '📦'
    },
    {
      id: 'product',
      title: 'Product',
      isCompleted: hasProduct,
      label: hasProduct ? `${productsCount}` : '+ Add',
      count: productsCount,
      targetId: 'products',
      icon: '⚡'
    },
    {
      id: 'live',
      title: 'Store Live',
      isCompleted: isLive,
      label: isLive ? 'Live' : 'Go Live',
      count: null,
      onClick: onRequestPublish,
      targetId: 'share',
      icon: '🟢'
    }
  ]

  const completedCount = tasks.filter(t => t.isCompleted).length
  const totalTasks = tasks.length
  const setupPercent = Math.round((completedCount / totalTasks) * 100)
  const isAllComplete = setupPercent === 100

  // Collapsible guidance drawer (compact by default)
  const [showDetails, setShowDetails] = useState(false)

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <section className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-seller-100 bg-gradient-to-r from-seller-50 via-white to-seller-50 text-slate-900 shadow-sm transition-all">
      {/* Subtle background glow */}
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition-all ${
          isAllComplete ? 'bg-emerald-500/10' : 'bg-seller-500/10'
        }`}
      />

      {/* Main Streamlined Row (Height ~56px) */}
      <div className="relative px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        {/* Left: Micro Progress Dial + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Micro Progress Dial (36px) */}
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full p-[2.5px] shadow-sm transition-transform hover:scale-105"
            style={{
              background: `conic-gradient(${isAllComplete ? '#10b981' : '#f97316'} ${setupPercent}%, rgba(148,163,184,0.22) ${setupPercent}% 100%)`
            }}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
              <span className={`text-[10px] font-black leading-none ${isAllComplete ? 'text-emerald-600' : 'text-seller-600'}`}>
                {setupPercent}%
              </span>
            </div>
          </div>

          {/* Title & Status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full border border-seller-200 bg-seller-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-seller-800">
                <Sparkles className="h-2.5 w-2.5" /> {launcherLabel || '1-Sec Launcher'}
              </span>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {isAllComplete ? '🎉 Express Setup 100% Ready!' : launchTitle}
              </h2>
            </div>
            <p className="text-[10px] text-slate-600 font-medium truncate mt-0.5">
              {isAllComplete
                ? 'Store live hai aur customer orders lene ke liye ready hai.'
                : `${completedCount} of ${totalTasks} setup steps complete`}
            </p>
          </div>
        </div>

        {/* Right: Inline Chips + Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          {/* 4 Compact Interactive Checklist Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {tasks.map(task => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  if (task.onClick) task.onClick()
                  else if (task.targetId) scrollToElement(task.targetId)
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  task.isCompleted
                    ? 'border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100'
                    : 'border border-seller-200 bg-seller-50 text-seller-800 hover:bg-seller-100'
                }`}
                title={`Go to ${task.title}`}
              >
                <span className="text-[10px]">{task.icon}</span>
                <span>{task.title}</span>
                {task.isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 text-sky-600 shrink-0" />
                ) : (
                  <ArrowUpRight className="h-2.5 w-2.5 text-seller-600 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Quick Tour Button */}
          {onOpenOnboardingTour && (
            <button
              type="button"
              onClick={onOpenOnboardingTour}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-seller-50 transition-colors cursor-pointer"
            >
              <HelpCircle className="h-3 w-3 text-seller-600" />
              <span className="hidden sm:inline">Tour</span>
            </button>
          )}

          {/* Expand Details Toggle */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 rounded-lg text-slate-500 hover:text-seller-700 hover:bg-seller-50 transition-colors cursor-pointer"
            title={showDetails ? 'Compress' : 'Show details'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Optional Details Drawer (Collapsible) */}
      {showDetails && (
        <div className="border-t border-seller-100 bg-white/80 px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-slate-600 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-600 leading-relaxed max-w-2xl">
              {launchSubtext}
            </p>
            {isAllComplete && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {orderLinkLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
