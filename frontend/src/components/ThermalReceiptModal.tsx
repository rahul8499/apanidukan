import React, { useState, useRef } from 'react'
import { Printer, Download, X, Settings2, FileText, Check } from 'lucide-react'

interface ThermalReceiptModalProps {
  order: {
    id: number
    reference: string
    customer_name?: string
    customer_phone?: string
    delivery_address?: string
    order_type?: string
    payment_type?: string
    utr_number?: string
    payment_verified?: boolean
    payment_verified_at?: string
    status?: string
    total: number | string
    delivery_fee?: number | string
    created_at: string
    items?: Array<{
      name?: string
      product_name?: string
      quantity: number
      price: number | string
      unit?: string
    }>
  }
  store: {
    name: string
    phone_number?: string
    tagline?: string
    address?: string
    slug: string
    logo?: string
  }
  onClose: () => void
}

function escapeHtml(str?: string): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function ThermalReceiptModal({ order, store, onClose }: ThermalReceiptModalProps) {
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>('80mm')
  const [includeGst, setIncludeGst] = useState(false)
  const [gstNumber, setGstNumber] = useState('')
  const [footerMessage, setFooterMessage] = useState('Dhanyawad! Phir Padharein 🙏 / Thank you for shopping with us!')
  const [copied, setCopied] = useState(false)

  const receiptRef = useRef<HTMLDivElement>(null)

  const items = Array.isArray(order.items) ? order.items : []
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0)
  const deliveryFee = Number(order.delivery_fee || 0)
  const grandTotal = Number(order.total || (subtotal + deliveryFee))
  
  const gstRate = 0.05 // 5% estimate if GST enabled
  const gstAmount = includeGst ? (subtotal * gstRate) : 0

  const handlePrintReceipt = () => {
    const printWin = window.open('', '', 'left=0,top=0,width=450,height=700,toolbar=0,scrollbars=0,status=0')
    if (!printWin) return

    const is58mm = printerWidth === '58mm'
    const paperWidthCss = is58mm ? '58mm' : '80mm'
    const fontSizeCss = is58mm ? '11px' : '12px'

    let itemsHtml = ''
    items.forEach((it) => {
      const itemName = escapeHtml(it.name || it.product_name || 'Product')
      const qty = Number(it.quantity || 1)
      const price = Number(it.price || 0)
      const itemTotal = qty * price
      const unit = escapeHtml(it.unit || 'pcs')
      itemsHtml += `
        <div style="margin-bottom: 5px;">
          <div style="font-weight: bold; word-break: break-word; color: #000;">${itemName}</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9em; color: #222;">
            <span style="padding-left: 6px;">${qty} ${unit} x ₹${price.toFixed(2)}</span>
            <span style="font-weight: bold; color: #000;">₹${itemTotal.toFixed(2)}</span>
          </div>
        </div>
      `
    })

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${escapeHtml(order.reference)} - ${escapeHtml(store.name)}</title>
          <style>
            @page {
              size: ${paperWidthCss} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${fontSizeCss};
              line-height: 1.3;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 8px;
              width: ${paperWidthCss};
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .dashed-line { border-bottom: 1px dashed #000; margin: 6px 0; }
            .solid-line { border-bottom: 1px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div style="font-size: 1.3em; font-weight: 900; text-transform: uppercase;">${escapeHtml(store.name)}</div>
            ${store.tagline ? `<div style="font-size: 0.85em; font-style: italic; color: #333;">${escapeHtml(store.tagline)}</div>` : ''}
            ${store.phone_number ? `<div style="font-size: 0.9em; font-weight: bold;">Ph: ${escapeHtml(store.phone_number)}</div>` : ''}
            ${includeGst && gstNumber ? `<div style="font-size: 0.85em; font-weight: bold;">GSTIN: ${escapeHtml(gstNumber)}</div>` : ''}
          </div>

          <div class="dashed-line"></div>

          <div style="font-size: 0.9em; font-weight: 600;">
            <div class="row"><span>Receipt #:</span><span class="font-bold">#${escapeHtml(order.reference)}</span></div>
            <div class="row"><span>Date/Time:</span><span>${new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div>
            <div class="row"><span>Customer:</span><span class="font-bold">${escapeHtml(order.customer_name || 'Counter Customer')}</span></div>
            ${order.customer_phone ? `<div class="row"><span>Phone:</span><span>${escapeHtml(order.customer_phone)}</span></div>` : ''}
            <div class="row"><span>Type:</span><span class="font-bold" style="text-transform: uppercase;">${order.order_type === 'STORE_PICKUP' ? 'Store Pickup' : 'Home Delivery'}</span></div>
          </div>

          <div class="dashed-line"></div>

          <div style="font-size: 0.9em; font-weight: bold; display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px;">
            <span>ITEM</span>
            <span>QTY x RATE / AMT</span>
          </div>

          ${itemsHtml}

          <div class="dashed-line"></div>

          <div style="font-size: 0.95em;">
            <div class="row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
            ${deliveryFee > 0 ? `<div class="row"><span>Delivery Charge:</span><span>₹${deliveryFee.toFixed(2)}</span></div>` : ''}
            ${includeGst ? `<div class="row"><span>Est. GST (5%):</span><span>₹${gstAmount.toFixed(2)}</span></div>` : ''}
            <div class="solid-line"></div>
            <div class="row" style="font-size: 1.15em; font-weight: 900;">
              <span>GRAND TOTAL:</span>
              <span>₹${grandTotal.toFixed(2)}</span>
            </div>
            <div class="row" style="font-size: 0.9em; margin-top: 4px;">
              <span>Payment Mode:</span>
              <span style="text-transform: uppercase; font-weight: bold;">${escapeHtml(order.payment_type || 'COD')}</span>
            </div>
            ${order.utr_number ? `<div class="row" style="font-size: 0.85em; margin-top: 2px;"><span>UPI Ref/UTR:</span><span style="font-family: monospace; font-weight: bold;">${escapeHtml(order.utr_number)}</span></div>` : ''}
          </div>

          <div class="dashed-line"></div>

          <div class="text-center" style="font-size: 0.85em; margin-top: 6px;">
            <div style="font-weight: bold;">${escapeHtml(footerMessage)}</div>
            <div style="font-size: 0.75em; font-family: monospace; margin-top: 4px;">Scan to Reorder: apanidukan.com/s/${escapeHtml(store.slug)}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `

    printWin.document.write(htmlContent)
    printWin.document.close()
  }

  const handleCopyReceiptText = () => {
    let text = `==============================\n`
    text += `       ${store.name.toUpperCase()}\n`
    if (store.phone_number) text += `    Tel: ${store.phone_number}\n`
    text += `==============================\n`
    text += `Order #: ${order.reference}\n`
    text += `Date: ${new Date(order.created_at).toLocaleString()}\n`
    text += `Cust: ${order.customer_name || 'Customer'}\n`
    if (order.customer_phone) text += `Phone: ${order.customer_phone}\n`
    text += `------------------------------\n`
    items.forEach(it => {
      const name = it.name || it.product_name || 'Item'
      const itemTotal = Number(it.price || 0) * Number(it.quantity || 1)
      text += `${name}\n  ${it.quantity} x ₹${it.price} = ₹${itemTotal}\n`
    })
    text += `------------------------------\n`
    if (deliveryFee > 0) text += `Delivery Fee: ₹${deliveryFee.toFixed(2)}\n`
    text += `TOTAL: ₹${grandTotal.toFixed(2)}\n`
    text += `Payment: ${order.payment_type || 'COD'}\n`
    text += `==============================\n`
    text += `${footerMessage}\n`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-white my-auto max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">POS Thermal Receipt Printer</h3>
              <p className="text-[11px] text-slate-400">Order #{order.reference} • Bluetooth/USB printer ready</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Configuration Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Controls Bar */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5 text-teal-400" /> Receipt Options
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Width Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Paper Width</label>
                <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPrinterWidth('58mm')}
                    className={`flex-1 py-1 text-[10px] font-extrabold rounded-lg transition-all ${printerWidth === '58mm' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                  >
                    2" (58mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterWidth('80mm')}
                    className={`flex-1 py-1 text-[10px] font-extrabold rounded-lg transition-all ${printerWidth === '80mm' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                  >
                    3" (80mm)
                  </button>
                </div>
              </div>

              {/* GST Toggle */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tax Mode</label>
                <button
                  type="button"
                  onClick={() => setIncludeGst(!includeGst)}
                  className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-extrabold border transition-all flex items-center justify-between ${includeGst ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
                >
                  <span>{includeGst ? 'GST Invoice' : 'Non-GST Bill'}</span>
                  <span>{includeGst ? '✓' : '+'}</span>
                </button>
              </div>

              {/* GSTIN Input */}
              {includeGst && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-2.5 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Footer Message</label>
              <input
                type="text"
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder="Custom thank you message"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* REALISTIC THERMAL RECEIPT PAPER PREVIEW */}
          <div className="flex justify-center">
            <div
              className={`bg-amber-50/95 text-slate-950 p-4 font-mono shadow-2xl rounded-lg border-2 border-slate-300 transition-all ${
                printerWidth === '58mm' ? 'w-[260px] text-[10.5px]' : 'w-[340px] text-[12px]'
              }`}
            >
              <div ref={receiptRef} className="space-y-1.5">
                {/* Store Header */}
                <div className="text-center space-y-0.5">
                  <p className="font-black text-sm uppercase tracking-tight">{store.name}</p>
                  {store.tagline && <p className="text-[9.5px] italic text-slate-700">{store.tagline}</p>}
                  {store.phone_number && <p className="text-[10px] font-bold">Ph: {store.phone_number}</p>}
                  {includeGst && gstNumber && <p className="text-[9.5px] font-bold">GSTIN: {gstNumber}</p>}
                </div>

                <div className="border-b border-dashed border-slate-950 my-1.5" />

                {/* Receipt Details */}
                <div className="text-[10px] space-y-0.5 font-semibold">
                  <div className="flex justify-between">
                    <span>Receipt #:</span>
                    <span className="font-bold">#{order.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date/Time:</span>
                    <span>{new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold truncate max-w-[150px]">{order.customer_name || 'Counter Customer'}</span>
                  </div>
                  {order.customer_phone && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{order.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-bold uppercase">{order.order_type === 'STORE_PICKUP' ? 'Store Pickup' : 'Home Delivery'}</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-950 my-1.5" />

                {/* Items Table */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between font-bold border-b border-slate-400 pb-0.5">
                    <span>ITEM</span>
                    <span>QTY x PRICE</span>
                    <span>AMT</span>
                  </div>

                  {items.map((it, idx) => {
                    const itemName = it.name || it.product_name || 'Product'
                    const qty = Number(it.quantity || 1)
                    const price = Number(it.price || 0)
                    const itemTotal = qty * price

                    return (
                      <div key={idx} className="space-y-0.2">
                        <p className="font-bold truncate">{itemName}</p>
                        <div className="flex justify-between text-slate-700">
                          <span className="pl-2">{qty} {it.unit || 'pcs'} @ ₹{price.toFixed(2)}</span>
                          <span className="font-bold text-slate-950">₹{itemTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="border-b border-dashed border-slate-950 my-1.5" />

                {/* Pricing Summary */}
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>

                  {deliveryFee > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>Delivery Charge:</span>
                      <span>₹{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}

                  {includeGst && (
                    <div className="flex justify-between text-[9.5px] text-slate-700">
                      <span>Est. GST (5%):</span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-b border-slate-950 my-1" />

                  <div className="flex justify-between font-black text-xs text-slate-950">
                    <span>GRAND TOTAL:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-[9.5px] font-bold text-slate-800 pt-0.5">
                    <span>Payment Mode:</span>
                    <span className="uppercase">{order.payment_type || 'COD'}</span>
                  </div>

                  {order.utr_number && (
                    <div className="flex justify-between text-[9px] font-mono font-bold text-indigo-900 pt-0.5">
                      <span>UPI Ref/UTR:</span>
                      <span>{order.utr_number}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-950 my-2" />

                {/* Footer QR Code & Message */}
                <div className="text-center space-y-1">
                  <p className="text-[9.5px] font-bold text-slate-800 leading-tight">{footerMessage}</p>
                  <p className="text-[8px] font-mono text-slate-600">Scan to Reorder Online: apanidukan.com/s/{store.slug}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-800 p-4 sm:p-5 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyReceiptText}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <FileText className="h-4 w-4 text-slate-400" />}
            <span>{copied ? 'Copied Receipt Text!' : 'Copy Bill Text'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReceipt}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:from-teal-500 hover:to-emerald-500 transition-all shadow-md shadow-teal-600/30 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>🖨️ Print Thermal Receipt ({printerWidth})</span>
          </button>
        </div>

      </div>
    </div>
  )
}
