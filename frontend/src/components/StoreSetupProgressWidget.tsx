import React from 'react'
import { CheckCircle2, HelpCircle, ArrowUpRight, Sparkles } from 'lucide-react'

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
      completedLabel: '✓ Saved',
      pendingLabel: '+ Phone',
      targetId: 'share',
      icon: '📲'
    },
    {
      id: 'payment',
      title: 'Payment UPI',
      isCompleted: Boolean(store?.upi_id),
      optional: true,
      completedLabel: 'Added',
      pendingLabel: 'Optional',
      icon: '💳'
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

  const requiredTasks = tasks.filter(t => !t.optional)
  const completedCount = requiredTasks.filter(t => t.isCompleted).length
  const totalTasks = requiredTasks.length
  const setupPercent = Math.round((completedCount / totalTasks) * 100)

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-3.5 text-white shadow-lg sm:rounded-3xl sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[9px] font-black uppercase text-amber-200 sm:text-[10px]">
                <Sparkles className="h-3 w-3" /> {launcherLabel}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-extrabold text-slate-200 sm:text-[10px]">1-Min Setup</span>
            </div>
            <h2 className="max-w-3xl text-base font-black leading-tight text-white sm:text-xl">{launchTitle}</h2>
            <p className="mt-1 max-w-3xl text-[10px] font-medium leading-relaxed text-slate-300 sm:text-xs">{launchSubtext}</p>
          </div>
          {onOpenOnboardingTour && (
            <button type="button" onClick={onOpenOnboardingTour} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 text-[10px] font-extrabold text-white transition hover:bg-white/15 sm:px-3 sm:text-xs">
              <HelpCircle className="h-3.5 w-3.5 text-amber-200" /> Tour
            </button>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 sm:text-[10px]">Store launch progress</p>
              <p className="mt-0.5 text-xs font-extrabold text-white sm:text-sm">
                {setupPercent === 100 ? '🎉 Store setup is ready' : `${completedCount} of ${totalTasks} launch steps complete`}
              </p>
            </div>
            <span className={`rounded-xl px-2.5 py-1.5 text-sm font-black sm:px-3 sm:text-base ${setupPercent === 100 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white'}`}>
              {setupPercent}%
            </span>
          </div>

          <div
            className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-white/10 sm:h-3"
            role="progressbar"
            aria-label="Store setup progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={setupPercent}
          >
            <div className={`h-full rounded-full transition-all duration-700 ease-out ${setupPercent === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-orange-400 via-amber-300 to-teal-300'}`} style={{ width: `${setupPercent}%` }} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex min-h-12 items-center justify-between gap-1.5 rounded-xl border px-2 py-2 transition-all sm:min-h-14 sm:px-2.5 ${
              task.isCompleted
                ? 'border-emerald-300/20 bg-emerald-400/10'
                : task.optional
                  ? 'border-white/10 bg-white/5'
                  : 'border-amber-300/20 bg-amber-300/10'
            }`}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-xs sm:text-sm">{task.icon}</span>
              <span className="truncate text-[10px] font-bold text-white sm:text-[11px]">{task.title}</span>
            </div>

            {task.isCompleted ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            ) : task.optional ? (
              <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-slate-300">Optional</span>
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
                className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-amber-300 px-1.5 py-1 text-[9px] font-black text-slate-950 transition hover:bg-amber-200 active:scale-95 sm:px-2"
              >
                {task.pendingLabel}
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
          </div>
          {setupPercent === 100 && <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-200 sm:text-xs"><CheckCircle2 className="h-4 w-4 shrink-0" /> {orderLinkLabel}</p>}
        </div>
      </div>
    </section>
  )
}
