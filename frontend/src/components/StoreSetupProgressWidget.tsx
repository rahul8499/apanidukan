import React from 'react'
import { CheckCircle2, Clock, HelpCircle, ChevronRight } from 'lucide-react'

interface StoreSetupProgressWidgetProps {
  store: any
  categoriesCount: number
  productsCount: number
  onRequestPublish: () => void
  onOpenOnboardingTour?: () => void
}

export default function StoreSetupProgressWidget({
  store,
  categoriesCount,
  productsCount,
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
      completedLabel: '✓ Saved',
      pendingLabel: '+ Phone',
      targetId: 'share',
      icon: '📲'
    },
    {
      id: 'category',
      title: 'Category',
      isCompleted: hasCategory,
      completedLabel: `✓ ${categoriesCount} Added`,
      pendingLabel: '+ Category',
      targetId: 'categories',
      icon: '📦'
    },
    {
      id: 'product',
      title: 'Product',
      isCompleted: hasProduct,
      completedLabel: `✓ ${productsCount} Added`,
      pendingLabel: '+ Product',
      targetId: 'products',
      icon: '⚡'
    },
    {
      id: 'live',
      title: 'Store Live',
      isCompleted: isLive,
      completedLabel: '✓ Live',
      pendingLabel: '🚀 Go Live',
      onClick: onRequestPublish,
      icon: '🟢'
    }
  ]

  const completedCount = tasks.filter(t => t.isCompleted).length
  const totalTasks = tasks.length
  const setupPercent = Math.round((completedCount / totalTasks) * 100)

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-2 sm:p-3 shadow-2xs space-y-1.5 sm:space-y-2.5 transition-all">
      {/* Ultra-Slim Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`px-2 py-0.5 rounded-md font-black text-[10px] sm:text-xs text-white shadow-2xs ${
            setupPercent === 100 ? 'bg-emerald-600' : 'bg-indigo-600'
          }`}>
            {setupPercent}%
          </span>
          <h3 className="text-[11px] sm:text-xs font-black text-slate-900 truncate">
            Setup Progress {setupPercent === 100 ? '🎉 100% Ready' : `(${completedCount}/${totalTasks})`}
          </h3>
        </div>

        {onOpenOnboardingTour && (
          <button
            type="button"
            onClick={onOpenOnboardingTour}
            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-900 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <HelpCircle className="h-3 w-3 text-indigo-600" />
            <span>Tour</span>
          </button>
        )}
      </div>

      {/* 1-Pixel Progress Bar */}
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            setupPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-600 to-emerald-500'
          }`}
          style={{ width: `${setupPercent}%` }}
        />
      </div>

      {/* Ultra-Compact 4-Pill Grid (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center justify-between rounded-lg px-2 py-1 border transition-all ${
              task.isCompleted
                ? 'bg-emerald-50/40 border-emerald-200/80'
                : 'bg-amber-50/40 border-amber-200/80'
            }`}
          >
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] shrink-0">{task.icon}</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 truncate">{task.title}</span>
            </div>

            {task.isCompleted ? (
              <span className="text-[9px] font-extrabold text-emerald-700 shrink-0 ml-1">
                ✓
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (task.onClick) {
                    task.onClick()
                  } else if (task.targetId) {
                    scrollToElement(task.targetId)
                  }
                }}
                className="rounded bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-slate-950 hover:bg-amber-600 transition-all cursor-pointer shrink-0 ml-1 active:scale-95"
              >
                {task.pendingLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
