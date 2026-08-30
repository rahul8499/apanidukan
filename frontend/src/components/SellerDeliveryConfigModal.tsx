import React, { useState } from 'react'
import {
  Truck,
  Store as StoreIcon,
  Save,
  X,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react'
import api from '../services/api'

interface SellerDeliveryConfigModalProps {
  store: any
  onSaveSuccess?: () => void
  onClose: () => void
}

export default function SellerDeliveryConfigModal({
  store,
  onSaveSuccess,
  onClose
}: SellerDeliveryConfigModalProps) {
  const [allowHomeDelivery, setAllowHomeDelivery] = useState<boolean>(store?.allow_home_delivery ?? true)
  const [allowStorePickup, setAllowStorePickup] = useState<boolean>(store?.allow_store_pickup ?? true)

  const [minDeliveryOrder, setMinDeliveryOrder] = useState<number | string>(
    store?.min_delivery_order ?? 0
  )
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number | string>(
    store?.delivery_radius_km ?? 10
  )
  const [deliveryChargeType, setDeliveryChargeType] = useState<string>(
    store?.delivery_charge_type || 'FIXED'
  )
  const [deliveryFlatFee, setDeliveryFlatFee] = useState<number | string>(
    store?.delivery_flat_fee ?? 30
  )
  const [deliveryPerKmFee, setDeliveryPerKmFee] = useState<number | string>(
    store?.delivery_per_km_fee ?? 5
  )
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState<number | string>(
    store?.free_delivery_above ?? 499
  )
  const [deliveryEstimatedTime, setDeliveryEstimatedTime] = useState<string>(
    store?.delivery_estimated_time || '30-45 mins'
  )
  const [pickupInstructions, setPickupInstructions] = useState<string>(
    store?.pickup_instructions || 'Collect at store counter • 10:00 AM to 09:00 PM'
  )

  // Dynamic Customer Loyalty & Cashback Wallet Configuration
  const [enableLoyaltyCashback, setEnableLoyaltyCashback] = useState<boolean>(store?.enable_loyalty_cashback ?? true)
  const [loyaltyCashbackPercent, setLoyaltyCashbackPercent] = useState<number | string>(store?.loyalty_cashback_percent ?? 5)
  const [loyaltyMinOrderAmount, setLoyaltyMinOrderAmount] = useState<number | string>(store?.loyalty_min_order_amount ?? 0)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!allowHomeDelivery && !allowStorePickup) {
      setErrorMsg('At least one fulfillment mode (Home Delivery or Store Pickup) must be enabled!')
      return
    }

    const minOrder = Number(minDeliveryOrder) || 0
    const radius = Number(deliveryRadiusKm) || 0
    const flatFee = Number(deliveryFlatFee) || 0
    const perKmFee = Number(deliveryPerKmFee) || 0
    const freeAbove = Number(freeDeliveryAbove) || 0

    if (allowHomeDelivery) {
      if (radius <= 0) {
        setErrorMsg('Please specify a valid delivery radius (greater than 0 KM).')
        return
      }
      if (minOrder < 0) {
        setErrorMsg('Minimum order amount cannot be negative.')
        return
      }
    }

    try {
      setSaving(true)
      const payload = {
        allow_home_delivery: allowHomeDelivery,
        allow_store_pickup: allowStorePickup,
        min_delivery_order: minOrder,
        delivery_radius_km: radius,
        delivery_charge_type: deliveryChargeType,
        delivery_flat_fee: flatFee,
        delivery_per_km_fee: perKmFee,
        free_delivery_above: freeAbove,
        delivery_estimated_time: deliveryEstimatedTime.trim() || '30-45 mins',
        pickup_instructions: pickupInstructions.trim(),
        enable_loyalty_cashback: enableLoyaltyCashback,
        loyalty_cashback_percent: Number(loyaltyCashbackPercent) || 0,
        loyalty_min_order_amount: Number(loyaltyMinOrderAmount) || 0,
      }

      await api.patch(`/stores/${store.id}/`, payload)
      setSuccessMsg('Fulfillment & Loyalty cashback settings updated successfully!')

      if (onSaveSuccess) {
        onSaveSuccess()
      }

      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to save store settings.')
    } finally {
      setSaving(false)
    }
  }

  // Calculate sample delivery fee for preview (e.g. for a 4 KM sample distance with ₹350 cart)
  const sampleDistanceKm = 4
  const sampleCartAmount = 350
  let sampleFee = 0
  const freeThresh = Number(freeDeliveryAbove) || 0
  if (freeThresh > 0 && sampleCartAmount >= freeThresh) {
    sampleFee = 0
  } else if (deliveryChargeType === 'FREE') {
    sampleFee = 0
  } else if (deliveryChargeType === 'FIXED') {
    sampleFee = Number(deliveryFlatFee) || 0
  } else if (deliveryChargeType === 'PER_KM') {
    sampleFee = (Number(deliveryPerKmFee) || 0) * sampleDistanceKm
  } else if (deliveryChargeType === 'HYBRID') {
    sampleFee = (Number(deliveryFlatFee) || 0) + (Number(deliveryPerKmFee) || 0) * sampleDistanceKm
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 my-auto flex flex-col custom-scrollbar">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-inner">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <span>Fulfillment & Delivery Settings</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                  Seller Rules
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Configure Home Delivery rates, minimum order limit & Pickup rules</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 flex-1 bg-slate-50/50">
          
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SECTION 1: HOME DELIVERY CONFIGURATION */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-base shadow-inner">
                  🚚
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Home Delivery Mode</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Deliver directly to customer's doorsteps</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowHomeDelivery}
                  onChange={(e) => setAllowHomeDelivery(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {allowHomeDelivery ? (
              <div className="space-y-4 pt-1">
                
                {/* Min Order & Max Radius */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Minimum Order Amount (₹)</span>
                      <span className="text-[10px] text-slate-400 font-medium">0 = No minimum</span>
                    </label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={minDeliveryOrder}
                        onChange={(e) => setMinDeliveryOrder(e.target.value)}
                        placeholder="e.g. 100"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-7 pr-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Customers must add at least this cart value to choose home delivery.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Maximum Delivery Radius</span>
                      <span className="text-[10px] text-indigo-600 font-extrabold">KM</span>
                    </label>
                    <div className="relative mt-1.5">
                      <Navigation className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={deliveryRadiusKm}
                        onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Orders beyond this distance won't be eligible for delivery.
                    </p>
                  </div>
                </div>

                {/* Delivery Pricing Model Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Delivery Charge Model
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'FIXED', label: 'Flat Fee', icon: '📦', desc: 'Fixed delivery charge' },
                      { id: 'PER_KM', label: 'Per KM', icon: '📍', desc: 'Charge based on KM' },
                      { id: 'HYBRID', label: 'Base + Per KM', icon: '⚡', desc: 'Base fee + per km' },
                      { id: 'FREE', label: 'Free Delivery', icon: '🟢', desc: 'Always ₹0 charge' }
                    ].map((model) => (
                      <button
                        type="button"
                        key={model.id}
                        onClick={() => setDeliveryChargeType(model.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          deliveryChargeType === model.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm block">{model.icon}</span>
                        <p className="text-[11px] font-black mt-1 leading-tight">{model.label}</p>
                        <p className={`text-[9px] mt-0.5 font-medium ${
                          deliveryChargeType === model.id ? 'text-indigo-100' : 'text-slate-400'
                        }`}>
                          {model.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate inputs depending on selected model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {deliveryChargeType === 'FIXED' && (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Flat Delivery Fee (₹)</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={deliveryFlatFee}
                          onChange={(e) => setDeliveryFlatFee(e.target.value)}
                          placeholder="30"
                          className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {deliveryChargeType === 'PER_KM' && (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Rate Per KM (₹/KM)</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={deliveryPerKmFee}
                          onChange={(e) => setDeliveryPerKmFee(e.target.value)}
                          placeholder="5"
                          className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {deliveryChargeType === 'HYBRID' && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Base Delivery Fee (₹)</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={deliveryFlatFee}
                            onChange={(e) => setDeliveryFlatFee(e.target.value)}
                            placeholder="20"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Additional Fee Per KM (₹/KM)</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={deliveryPerKmFee}
                            onChange={(e) => setDeliveryPerKmFee(e.target.value)}
                            placeholder="5"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {deliveryChargeType === 'FREE' && (
                    <div className="sm:col-span-2 text-center py-2 text-emerald-700 text-xs font-black flex items-center justify-center gap-2 bg-emerald-50 rounded-lg border border-emerald-200">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span>Free Delivery will be offered to all customers within {deliveryRadiusKm} KM!</span>
                    </div>
                  )}

                  {/* Free Delivery Threshold */}
                  {deliveryChargeType !== 'FREE' && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Free Delivery Threshold (₹)</span>
                        <span className="text-[10px] text-slate-400 font-medium">0 = Disabled</span>
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={freeDeliveryAbove}
                          onChange={(e) => setFreeDeliveryAbove(e.target.value)}
                          placeholder="e.g. 499"
                          className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        Orders above this amount get 100% FREE Delivery automatically!
                      </p>
                    </div>
                  )}
                </div>

                {/* Estimated Delivery Time */}
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Estimated Delivery Time</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryEstimatedTime}
                    onChange={(e) => setDeliveryEstimatedTime(e.target.value)}
                    placeholder="e.g. 30-45 mins or 1-2 hours"
                    className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 border border-slate-200 font-medium">
                Home Delivery is currently <strong className="text-rose-600 font-bold">Disabled</strong>. Customers will only be able to choose Walk-in Store Pickup.
              </div>
            )}
          </div>

          {/* SECTION 2: WALK-IN STORE PICKUP */}
          <div className="rounded-2xl border border-amber-200/80 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 text-base shadow-inner">
                  🏪
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Walk-in / Store Pickup Mode</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Customer collects order directly from your shop</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowStorePickup}
                  onChange={(e) => setAllowStorePickup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {allowStorePickup && (
              <div>
                <label className="text-xs font-bold text-slate-700">Pickup Instructions / Timings</label>
                <input
                  type="text"
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  placeholder="e.g. Ready in 15 mins • Counter Pickup 10 AM - 9 PM"
                  className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* LIVE SUMMARY / CUSTOMER PREVIEW CARD */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white border border-indigo-200 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Customer Checkout Preview</span>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-3 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>🚚 Home Delivery:</span>
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                    allowHomeDelivery ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {allowHomeDelivery ? 'Available' : 'Disabled'}
                  </span>
                </span>
                {allowHomeDelivery && (
                  <ul className="text-slate-600 mt-1.5 space-y-0.5 text-[10px] font-medium">
                    <li>• Min Cart: <strong className="text-slate-900">₹{Number(minDeliveryOrder) || 0}</strong></li>
                    <li>• Radius: <strong className="text-slate-900">{deliveryRadiusKm} KM</strong></li>
                    <li>
                      • Delivery Fee: <strong className="text-slate-900">{deliveryChargeType === 'FREE' ? 'FREE' : `₹${sampleFee} (for ~${sampleDistanceKm}km)`}</strong>
                    </li>
                    {Number(freeDeliveryAbove) > 0 && (
                      <li>• Free Delivery: <strong className="text-emerald-700">Orders above ₹{freeDeliveryAbove}</strong></li>
                    )}
                    <li>• Est. Time: <strong className="text-slate-900">{deliveryEstimatedTime}</strong></li>
                  </ul>
                )}
              </div>

              <div className="p-3 rounded-xl bg-white border border-amber-100 shadow-2xs">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>🏪 Store Pickup:</span>
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                    allowStorePickup ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {allowStorePickup ? 'Available' : 'Disabled'}
                  </span>
                </span>
                {allowStorePickup && (
                  <ul className="text-slate-600 mt-1.5 space-y-0.5 text-[10px] font-medium">
                    <li>• Cost: <strong className="text-emerald-700">₹0 (FREE)</strong></li>
                    <li>• Min Cart: <strong className="text-slate-900">None</strong></li>
                    <li>• Address: <strong className="text-slate-900">{store?.address || store?.name}</strong></li>
                    <li>• Instructions: <strong className="text-slate-900">{pickupInstructions}</strong></li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black shadow-md shadow-indigo-200 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving Settings...' : 'Save Fulfillment Rules'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
