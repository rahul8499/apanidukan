/**
 * Formats a phone number for WhatsApp wa.me links.
 * Automatically prepends country code 91 for 10-digit Indian numbers
 * and handles leading zeros.
 */
export function formatPhoneForWhatsApp(phone: string | number | null | undefined): string {
  if (!phone) return ''
  let cleaned = String(phone).replace(/\D/g, '')
  if (!cleaned) return ''

  // If 10 digits, default to India country code 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`
  }
  // If 11 digits starting with 0, drop 0 and prepend 91
  else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = `91${cleaned.slice(1)}`
  }

  return cleaned
}
