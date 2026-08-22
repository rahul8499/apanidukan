import React from 'react'
import { AlertTriangle, X, ShieldAlert, Store, ArrowRight, Loader2, ShoppingBag } from 'lucide-react'

interface SellerDeactivateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeactivating: boolean
  storeName?: string
  errorMessage?: string | null
  onClearError?: () => void
  onGoToOrders?: () => void
}

export default function SellerDeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  isDeactivating,
  storeName,
  errorMessage,
  onClearError,
  onGoToOrders
}: SellerDeactivateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={() => !isDeactivating && onClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-red-100 shadow-2xl transition-all z-10">
        
        {/* Top Danger Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeactivating}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-7 text-center">
          
          {/* Danger Warning Icon Badge */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100/80 text-red-600 border border-red-200 shadow-sm animate-pulse">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Deactivate your account?
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your store <span className="font-bold text-slate-900">{storeName || 'store'}</span> will be unpublished immediately. Active customer orders must be resolved first.
          </p>

          {/* ⚠️ Dynamic Error Response Card (Replaces Browser alert Popup) */}
          {errorMessage ? (
            <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-left space-y-3 shadow-xs animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide">
                    Action Blocked
                  </h4>
                  <p className="text-xs text-rose-800 font-bold leading-snug">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {/* Resolution Action Button */}
              <div className="flex items-center gap-2 pt-1 border-t border-rose-200/80">
                {onGoToOrders && (
                  <button
                    type="button"
                    onClick={onGoToOrders}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>View Pending Orders</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClearError}
                  className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            /* Impact Checklist */
            <div className="mt-5 rounded-2xl bg-red-50/70 border border-red-100 p-3.5 text-left space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 font-medium">
                  Store link & public storefront will go offline (Draft mode).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Store className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 font-medium">
                  Pending WhatsApp / Store orders will remain in records for completion.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeactivating}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-slate-200 bg-white font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeactivating}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-red-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deactivating...</span>
                </>
              ) : (
                <>
                  <span>Yes, Deactivate</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
