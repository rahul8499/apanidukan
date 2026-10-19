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
    <section className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-3 text-white shadow-lg sm:rounded-3xl sm:p-5">
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
            <h2 className="line-clamp-2 max-w-3xl text-sm font-black leading-tight text-white sm:text-xl">{launchTitle}</h2>
            <p className="mt-1 line-clamp-2 max-w-3xl text-[9px] font-medium leading-snug text-slate-300 sm:text-xs sm:leading-relaxed">{launchSubtext}</p>
          </div>
          {onOpenOnboardingTour && (
            <button type="button" onClick={onOpenOnboardingTour} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 text-[10px] font-extrabold text-white transition hover:bg-white/15 sm:px-3 sm:text-xs">
              <HelpCircle className="h-3.5 w-3.5 text-amber-200" /> Tour
            </button>
          )}
        </div>

        <div className="mt-3 min-w-0 rounded-2xl border border-white/10 bg-black/15 p-2.5 sm:mt-4 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full p-[4px] shadow-[0_0_16px_rgba(45,212,191,0.15)] sm:h-[4.5rem] sm:w-[4.5rem] sm:p-[5px]"
              style={{ background: `conic-gradient(${setupPercent === 100 ? '#34d399' : '#fbbf24'} ${setupPercent}%, rgba(255,255,255,0.14) ${setupPercent}% 100%)` }}
              role="progressbar"
              aria-label="Store setup progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={setupPercent}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-slate-950 text-center">
                <span className={`text-xs font-black leading-none sm:text-sm ${setupPercent === 100 ? 'text-emerald-300' : 'text-amber-200'}`}>{setupPercent}%</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px]">Store launch progress</p>
              <p className="mt-0.5 text-xs font-extrabold leading-snug text-white sm:text-sm">
                {setupPercent === 100 ? '🎉 Store setup is ready' : `${completedCount} of ${totalTasks} launch steps complete`}
              </p>
              <p className="mt-1 text-[9px] font-medium text-slate-400 sm:text-[10px]">{setupPercent === 100 ? 'Your store is ready to receive orders.' : 'Complete the steps below to start receiving orders.'}</p>
            </div>
          </div>

          <div className="mt-3 grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-5 sm:gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex min-h-12 min-w-0 items-center justify-between gap-1 rounded-xl border px-1.5 py-2 transition-all sm:min-h-14 sm:gap-1.5 sm:px-2.5 ${
              task.isCompleted
                ? 'border-emerald-300/20 bg-emerald-400/10'
                : task.optional
                  ? 'border-white/10 bg-white/5'
                  : 'border-amber-300/20 bg-amber-300/10'
            }`}
          >
            <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
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
                className="inline-flex max-w-[5.5rem] shrink-0 items-center gap-0.5 rounded-lg bg-amber-300 px-1.5 py-1 text-[8px] font-black text-slate-950 transition hover:bg-amber-200 active:scale-95 sm:max-w-none sm:px-2 sm:text-[9px]"
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
