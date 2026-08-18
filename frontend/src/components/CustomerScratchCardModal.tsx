import React, { useRef, useEffect, useState } from 'react'
import { Sparkles, Gift, Check, X, Tag } from 'lucide-react'

export interface ScratchCardConfig {
  enabled: boolean
  title: string
  rewardText: string
  couponCode: string
  discountType: 'fixed' | 'percentage'
  discountValue: number
  minOrder: number
}

interface CustomerScratchCardModalProps {
  config: ScratchCardConfig
  storeName: string
  onClaimCoupon: (code: string, discountValue: number, discountType: 'fixed' | 'percentage') => void
  onClose: () => void
}

export default function CustomerScratchCardModal({ config, storeName, onClaimCoupon, onClose }: CustomerScratchCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isScratching, setIsScratching] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth || 300
    canvas.height = canvas.offsetHeight || 160

    // Fill canvas with silver scratch layer
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#94a3b8')
    gradient.addColorStop(0.5, '#cbd5e1')
    gradient.addColorStop(1, '#64748b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add pattern / text over scratch layer
    ctx.fillStyle = '#475569'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✨ Scratch Here to Reveal Your Gift! ✨', canvas.width / 2, canvas.height / 2 + 5)
  }, [])

  const checkScratchPercentage = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data
      let clearPixels = 0
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) clearPixels++
      }
      const percentage = (clearPixels / (pixels.length / 4)) * 100
      if (percentage > 35 && !isRevealed) {
        setIsRevealed(true)
        // Clear remaining canvas completely
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    } catch {}
  }

  const handleScratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || isRevealed) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, Math.PI * 2)
    ctx.fill()

    checkScratchPercentage(ctx, canvas)
  }

  const handleMouseDown = () => setIsScratching(true)
  const handleMouseUp = () => setIsScratching(false)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) handleScratch(e.clientX, e.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleScratch(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleClaim = () => {
    setClaimed(true)
    onClaimCoupon(config.couponCode, config.discountValue, config.discountType)
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-white my-auto p-6 text-center space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top Icon Badge */}
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 ring-4 ring-amber-500/10 shadow-lg mx-auto">
          <Gift className="h-7 w-7 animate-bounce" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            SPECIAL WELCOME OFFER
          </span>
          <h2 className="text-xl font-black tracking-tight text-white mt-2">{config.title || 'Scratch & Win Gift!'}</h2>
          <p className="text-xs text-slate-300 font-medium mt-1">Exclusive offer for shopping at <span className="text-indigo-400 font-bold">{storeName}</span></p>
        </div>

        {/* SCRATCH CARD CONTAINER */}
        <div className="relative mx-auto w-full h-44 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-4 border-2 border-indigo-500/30 flex flex-col items-center justify-center shadow-inner overflow-hidden">
          
          {/* UNDERNEATH PRIZE LAYER */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 text-amber-300 font-black text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> YOU UNLOCKED A COUPON!
            </div>
            <h3 className="text-xl font-black text-emerald-400">{config.rewardText}</h3>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
              <Tag className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-mono font-black text-amber-300 text-sm tracking-wider">{config.couponCode}</span>
            </div>
            <p className="text-[10px] text-slate-400">Min Order: ₹{config.minOrder}</p>
          </div>

          {/* OVERLAY CANVAS SCRATCH LAYER */}
          {!isRevealed && (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchMove}
              onTouchMove={handleTouchMove}
              className="absolute inset-0 w-full h-full rounded-2xl cursor-pointer touch-none z-10"
            />
          )}
        </div>

        {/* ACTION BUTTON */}
        {isRevealed ? (
          <button
            type="button"
            onClick={handleClaim}
            disabled={claimed}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-black text-white hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/30 cursor-pointer disabled:opacity-75"
          >
            {claimed ? (
              <>
                <Check className="h-4 w-4" />
                <span>Coupon Applied to Cart! 🎉</span>
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                <span>Claim & Apply Coupon to Cart</span>
              </>
            )}
          </button>
        ) : (
          <p className="text-xs text-slate-400 font-bold flex items-center justify-center gap-1">
            <span>👆 Scratch the card above to unlock your gift!</span>
          </p>
        )}

      </div>
    </div>
  )
}
