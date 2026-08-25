import React, { useState } from 'react'
import { XCircle, AlertTriangle, CheckCircle2, X, RefreshCw } from 'lucide-react'
import api from '../services/api'

interface CustomerOrderCancelModalProps {
  isOpen: boolean
  onClose: () => void
  storeSlug: string
  order: any
  trackingToken?: string
  customerPhone?: string
  onSuccess: (updatedOrder: any) => void
}

const CANCELLATION_REASONS = [
  { id: 'mistake', label: 'Ordered by mistake / Galti se order hua' },
  { id: 'address_change', label: 'Need to change delivery address or items' },
  { id: 'delayed', label: 'Delivery is taking too long' },
  { id: 'better_price', label: 'Found better price elsewhere' },
  { id: 'Other', label: 'Other reason (Specify below)' },
]

export default function CustomerOrderCancelModal({
  isOpen,
  onClose,
  storeSlug,
  order,
  trackingToken = '',
  customerPhone = '',
  onSuccess,
}: CustomerOrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0].label)
  const [customReason, setCustomReason] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !order) return null

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalReason = selectedReason.includes('Other') ? customReason.trim() : selectedReason
    if (!finalReason) {
      setError('Please select or write a reason for cancellation.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post(`/public/stores/${storeSlug}/orders/${order.reference}/cancel/`, {
        tracking_token: order.tracking_token || trackingToken,
        phone: order.customer_phone || customerPhone,
        cancellation_reason: finalReason,
      })

      const updated = response.data.order || response.data
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not cancel order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const redeemedCoins = Number(order.wallet_points_redeemed || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-white animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Cancel Order #{order.reference}
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Are you sure you want to cancel this order?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning / Notice Box */}
        {redeemedCoins > 0 && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium text-[11.5px] leading-relaxed">
              🪙 <strong>Store Coins Refund:</strong> <span className="font-bold">₹{redeemedCoins.toFixed(2)}</span> used on this order will be automatically credited back to your store wallet balance.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Reason Selector Form */}
        <form onSubmit={handleCancelSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
              Select Reason for Cancellation
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((r) => {
                const isSelected = selectedReason === r.label
                return (
                  <label
                    key={r.id}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="cancel_reason"
                        checked={isSelected}
                        onChange={() => setSelectedReason(r.label)}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                      />
                      <span>{r.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-rose-600 shrink-0" />}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Custom text field if "Other" is chosen */}
          {selectedReason.includes('Other') && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Specify reason</label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Tell us why you are cancelling..."
                rows={2}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer text-center"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 font-extrabold text-xs text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span>Cancel Order</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
