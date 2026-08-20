/**
 * Formats a number as Nigerian Naira currency, e.g. 2800000 -> "₦2,800,000"
 * @param {number} value
 * @param {string} symbol
 * @returns {string}
 */
export function formatCurrency(value, symbol = '\u20a6') {
  const num = Number(value) || 0
  return `${symbol}${num.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

/**
 * Formats an ISO date string / Date into a readable format e.g. "06 Aug 2026"
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = date ? new Date(date) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Formats a Date into a readable date+time string.
 */
export function formatDateTime(date) {
  const d = date ? new Date(date) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Generates a sequential-looking quotation number, e.g. ABMS-2026-0001
 * @param {number} sequence
 */
export function generateQuotationNumber(sequence) {
  const year = new Date().getFullYear()
  const padded = String(sequence).padStart(4, '0')
  return `ABMS-${year}-${padded}`
}
