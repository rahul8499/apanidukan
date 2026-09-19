/**
 * Utility for generating professional, beautiful WhatsApp Invoices & Order Alerts
 * for both Customers and Store Owners (Sellers).
 */

export function formatPhoneForWhatsApp(rawPhone: string): string {
  if (!rawPhone) return ''
  const digits = String(rawPhone).replace(/\D/g, '')
  if (digits.length === 10) {
    return `91${digits}` // Default to India country code
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits
  }
  return digits
}

export function generateOrderInvoiceWhatsAppMessage(order: any, store: any): string {
  const storeName = store?.name || 'Apani Dukan Store'
  const storePhone = store?.phone_number || ''
  const storeAddress = store?.address || ''
  const orderRef = order?.reference || order?.id || 'N/A'
  
  // Format items list
  const items = Array.isArray(order?.items) ? order.items : []
  const itemLines = items.map((it: any) => {
    const name = it.name || it.product_name || 'Item'
    const qty = Number(it.quantity || 1)
    const price = Number(it.price || 0)
    const unit = it.unit ? ` ${it.unit}` : ''
    const lineTotal = (qty * price).toFixed(2)
    return `• *${name}* × ${qty}${unit} — ₹${lineTotal}`
  })

  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0)
  const discount = Number(order?.discount_amount || 0)
  const deliveryFee = Number(order?.delivery_fee || 0)
  const totalPayable = Number(order?.total || (subtotal - discount + deliveryFee)).toFixed(2)
  const paymentType = order?.payment_type === 'ONLINE' ? 'ONLINE (Paid/UPI)' : 'CASH ON DELIVERY (COD)'
  const fulfillment = order?.order_type === 'STORE_PICKUP' ? 'Store Pickup (दुकानदाराकडून घेणे)' : 'Home Delivery (घरपोच)'

  // Live order tracking URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://apanidukan.com'
  const trackingUrl = order?.tracking_token 
    ? `${origin}/store/${store?.slug || 'store'}/order/${orderRef}?token=${order.tracking_token}`
    : `${origin}/store/${store?.slug || 'store'}/order/${orderRef}`

  const lines = [
    `🧾 *ORDER INVOICE / बिल* 🧾`,
    `🏪 *${storeName}*`,
    `Order ID: *#${orderRef}*`,
    `Customer: *${order?.customer_name || 'Valued Customer'}*`,
    `Mobile: ${order?.customer_phone || 'N/A'}`,
    `----------------------------------`,
    `📦 *Order Items:*`,
    ...itemLines,
    `----------------------------------`,
    `💰 *Bill Breakdown:*`,
    `Items Subtotal: ₹${subtotal.toFixed(2)}`,
    ...(discount > 0 ? [`Coupon Discount: -₹${discount.toFixed(2)}`] : []),
    ...(deliveryFee > 0 ? [`Delivery Fee: ₹${deliveryFee.toFixed(2)}`] : [`Delivery: FREE ₹0.00`]),
    `*TOTAL PAYABLE: ₹${totalPayable}*`,
    `----------------------------------`,
    `💳 Payment: *${paymentType}*`,
    `🚚 Fulfilment: *${fulfillment}*`,
    ...(order?.delivery_address ? [`📍 Address: ${order.delivery_address}`] : []),
    ...(storeAddress && order?.order_type === 'STORE_PICKUP' ? [`🏪 Pickup Location: ${storeAddress}`] : []),
    ...(order?.location_url ? [`🗺️ Map Location: ${order.location_url}`] : []),
    '',
    `📍 *Live Order Tracking / थेट ट्रॅकिंग लिंक:*`,
    `${trackingUrl}`,
    '',
    ...(store?.upi_id ? [`📲 Store UPI ID: *${store.upi_id}* (${store.upi_name || storeName})`] : []),
    ...(storePhone ? [`📞 Store Support: ${storePhone}`] : []),
    '',
    `🙏 *Thank you for shopping with ${storeName}!*`,
    `आम्हाला सेवा करण्याची संधी दिल्याबद्दल धन्यवाद!`
  ]

  return lines.join('\n')
}

export function generateOrderStatusUpdateWhatsAppMessage(order: any, store: any, newStatus: string): string {
  const storeName = store?.name || 'Store'
  const orderRef = order?.reference || order?.id || 'N/A'
  const custName = order?.customer_name || 'Customer'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://apanidukan.com'
  const trackingUrl = order?.tracking_token 
    ? `${origin}/store/${store?.slug || 'store'}/order/${orderRef}?token=${order.tracking_token}`
    : `${origin}/store/${store?.slug || 'store'}/order/${orderRef}`

  let statusText = ''
  let statusEmoji = '📦'

  switch (newStatus?.toUpperCase()) {
    case 'CONFIRMED':
      statusEmoji = '✅'
      statusText = 'CONFIRMED (कन्फर्म झालेली आहे & पॅकिंग सुरू आहे)'
      break
    case 'PAID':
      statusEmoji = '💳'
      statusText = 'PAYMENT VERIFIED (पेमेंट जमा झाले आहे)'
      break
    case 'DELIVERED':
      statusEmoji = '🎉'
      statusText = 'DELIVERED (यशस्वीरीत्या पोहोचवण्यात आलेली आहे)'
      break
    case 'CANCELLED':
      statusEmoji = '❌'
      statusText = 'CANCELLED (रद्द करण्यात आलेली आहे)'
      break
    default:
      statusEmoji = '🔄'
      statusText = newStatus
  }

  const lines = [
    `${statusEmoji} *ORDER STATUS UPDATE* ${statusEmoji}`,
    `🏪 *${storeName}*`,
    `Namaste *${custName}*,`,
    '',
    `Your order *#${orderRef}* status is now:`,
    `👉 *${statusText}*`,
    '',
    `Total Amount: *₹${Number(order?.total || 0).toFixed(2)}*`,
    '',
    `📍 *Live Order Tracking:*`,
    `${trackingUrl}`,
    '',
    `Have questions? Message us back on this WhatsApp chat!`,
    `🙏 *${storeName}*`
  ]

  return lines.join('\n')
}

export function openWhatsAppInvoice(phone: string, order: any, store: any): void {
  const formattedPhone = formatPhoneForWhatsApp(phone)
  const message = generateOrderInvoiceWhatsAppMessage(order, store)
  const url = formattedPhone 
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function openWhatsAppStatusUpdate(phone: string, order: any, store: any, status: string): void {
  const formattedPhone = formatPhoneForWhatsApp(phone)
  const message = generateOrderStatusUpdateWhatsAppMessage(order, store, status)
  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
