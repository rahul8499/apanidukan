import React, { useState } from 'react'
import { CheckCircle2, HelpCircle, ArrowUpRight, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

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

  const [expanded, setExpanded] = useState(true)

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
    <section className="relative w-full min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-2 sm:p-3 text-white shadow-lg sm:rounded-2xl sm:p-4">
      <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl sm:-right-20 sm:-top-24 sm:h-48 sm:w-48" />
      <div className="pointer-events-none absolute -bottom-14 left-1/3 h-32 w-32 rounded-full bg-teal-400/10 blur-3xl sm:-bottom-20 sm:h-40 sm:w-40" />
      <div className="relative">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5"
        >
          <div className="flex items-start justify-between gap-3 w-full">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1 sm:mb-1.5 sm:gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[8px] font-black uppercase text-amber-200 sm:px-2.5 sm:py-0.5 sm:text-[10px]">
                  <Sparkles className="h-3 w-3" /> {launcherLabel}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-extrabold text-slate-200 sm:px-2.5 sm:py-0.5 sm:text-[10px]">1-Min Setup</span>
              </div>
              <h2 className="line-clamp-1 max-w-3xl text-xs font-black leading-tight text-white sm:text-sm sm:leading-snug">{launchTitle}</h2>
              <p className="mt-0.5 line-clamp-1 max-w-3xl text-[8px] font-medium leading-snug text-slate-300 sm:mt-1 sm:text-[9px]">{launchSubtext}</p>
            </div>
            {onOpenOnboardingTour && (
              <button type="button" onClick={onOpenOnboardingTour} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[8px] font-extrabold text-white transition hover:bg-white/15 sm:px-2.5 sm:py-1.5 sm:text-[9px]">
                <HelpCircle className="h-3 w-3 text-amber-200 sm:h-3.5 sm:w-3.5" /> Tour
              </button>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${!expanded ? 'rotate-180' : ''}`} strokeWidth={2} />
        </button>

        {expanded && (
          <div className="mt-2 min-w-0 rounded-xl border border-white/10 bg-black/15 p-2 sm:mt-3 sm:rounded-2xl sm:p-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full p-[3px] shadow-[0_0_12px_rgba(45,212,191,0.15)] sm:h-[4rem] sm:w-[4rem] sm:p-[4px]"
                style={{ background: `conic-gradient(${setupPercent === 100 ? '#34d399' : '#fbbf24'} ${setupPercent}%, rgba(255,255,255,0.14) ${setupPercent}% 100%)` }}
                role="progressbar"
                aria-label="Store setup progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={setupPercent}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-slate-950 text-center">
                  <span className={`text-[10px] font-black leading-none sm:text-xs ${setupPercent === 100 ? 'text-emerald-300' : 'text-amber-200'}`}>{setupPercent}%</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-wide text-slate-400 sm:text-[9px]">Store launch progress</p>
                <p className="mt-0.5 text-[9px] font-extrabold leading-snug text-white sm:text-[10px]">
                  {setupPercent === 100 ? '🎉 Store setup is ready' : `${completedCount} of ${totalTasks} launch steps complete`}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[8px] font-medium text-slate-400 sm:mt-1 sm:text-[9px]">{setupPercent === 100 ? 'Your store is ready to receive orders.' : 'Complete the steps below to start receiving orders.'}</p>
              </div>
            </div>

            <div className="mt-2 grid min-w-0 grid-cols-2 gap-1 sm:mt-2.5 sm:grid-cols-4 sm:gap-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex min-h-9 min-w-0 items-center justify-between gap-1 rounded-lg border px-1 py-1 transition-all sm:min-h-12 sm:gap-1.5 sm:rounded-xl sm:px-2 sm:py-1.5 ${
                    task.isCompleted
                      ? 'border-emerald-300/20 bg-emerald-400/10'
                      : 'border-amber-300/20 bg-amber-300/10'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1 sm:gap-1">
                    <span className="shrink-0 text-[9px] sm:text-sm">{task.icon}</span>
                    <span className="truncate text-[8px] font-bold text-white sm:text-[9px]">{task.title}</span>
                  </div>

                  {task.isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-300 sm:h-3.5 sm:w-3.5" />
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
                      className="inline-flex max-w-[5rem] shrink-0 items-center gap-0.5 rounded-lg bg-amber-300 px-1 py-0.5 text-[7px] font-black text-slate-950 transition hover:bg-amber-200 active:scale-95 sm:max-w-none sm:px-1.5 sm:py-1 sm:text-[8px]"
                    >
                      {task.pendingLabel}
                      <ArrowUpRight className="h-2 w-2" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {setupPercent === 100 && <p className="mt-1 flex items-center gap-1 text-[8px] font-bold text-emerald-200 sm:mt-1.5 sm:gap-1 sm:text-[9px]"><CheckCircle2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> <span className="line-clamp-1">{orderLinkLabel}</span></p>}
          </div>
        )}
      </div>
    </section>
  )
}
