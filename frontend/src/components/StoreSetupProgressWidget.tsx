import React from 'react'
import { CheckCircle2, Clock, Sparkles, ChevronRight, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react'

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
      title: 'WhatsApp Order Phone',
      subtitle: 'गिऱ्हाईकाचे ऑर्डर्स व्हॉट्सॲपवर मिळण्यासाठी नंबर सेव्ह करा',
      isCompleted: hasPhone,
      completedLabel: '✓ Phone Saved',
      pendingLabel: 'Save Number',
      targetId: 'share',
      icon: '📲'
    },
    {
      id: 'category',
      title: 'Product Category',
      subtitle: 'वस्तूंचे वर्गीकरण करण्यासाठी कॅटेगरी तयार करा',
      isCompleted: hasCategory,
      completedLabel: `✓ ${categoriesCount} Categories`,
      pendingLabel: '+ Add Category',
      targetId: 'categories',
      icon: '📦'
    },
    {
      id: 'product',
      title: 'Publish Product',
      subtitle: 'वस्तूची किंमत टाकून प्रॉडक्ट पब्लिश करा (फोटो ऐच्छिक)',
      isCompleted: hasProduct,
      completedLabel: `✓ ${productsCount} Products`,
      pendingLabel: '+ Add Product',
      targetId: 'products',
      icon: '⚡'
    },
    {
      id: 'live',
      title: 'Store Online (LIVE)',
      subtitle: 'दुकान ऑनलाईन गिऱ्हाईकांसाठी लाईव्ह चालू करा',
      isCompleted: isLive,
      completedLabel: '✓ LIVE Online',
      pendingLabel: '🚀 Make Live',
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
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs space-y-3.5 transition-all">
      {/* Header Bar with Progress Percentage */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm text-white shadow-xs ${
            setupPercent === 100 ? 'bg-emerald-600' : 'bg-indigo-600'
          }`}>
            {setupPercent}%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                Store Setup Checklist (दुकान सेटअप प्रगती)
              </h3>
              {setupPercent === 100 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                  🎉 100% Ready
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {completedCount} of {totalTasks} steps completed. {setupPercent < 100 ? 'Baki rahilele steps purna kara.' : 'Aapki dukaan fully ready hai!'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenOnboardingTour && (
            <button
              type="button"
              onClick={onOpenOnboardingTour}
              className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-extrabold text-indigo-900 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
            >
              <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
              <span>Tour Guide</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            setupPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-600 to-emerald-500'
          }`}
          style={{ width: `${setupPercent}%` }}
        />
      </div>

      {/* Task Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex flex-col justify-between rounded-xl p-3 border transition-all ${
              task.isCompleted
                ? 'bg-emerald-50/40 border-emerald-200/80'
                : 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>{task.icon}</span>
                  <span className="truncate">{task.title}</span>
                </span>
                {task.isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-tight line-clamp-2">
                {task.subtitle}
              </p>
            </div>

            <div className="mt-2.5">
              {task.isCompleted ? (
                <span className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-100/80 py-1 px-2 text-[10px] font-extrabold text-emerald-800 border border-emerald-200/80">
                  {task.completedLabel}
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
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 py-1 px-2 text-[10px] font-black text-slate-950 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>{task.pendingLabel}</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
