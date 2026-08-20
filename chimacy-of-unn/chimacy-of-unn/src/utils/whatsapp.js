/**
 * WhatsApp is the communication channel - this app only ever generates a
 * wa.me deep link with a prefilled message; it never implements chat itself.
 */

/**
 * Normalizes a phone number to the digits-only format wa.me expects.
 * Assumes Nigerian numbers by default (adds 234 country code if a local
 * "0..." number is given), but leaves already-international numbers as-is.
 */
export function normalizePhoneForWhatsApp(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/[^\d]/g, '')
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  if (digits.startsWith('234')) return digits
  if (digits.length === 10) return `234${digits}` // e.g. 803... without leading 0
  return digits
}

export function buildWhatsAppLink(phone, message) {
  const number = normalizePhoneForWhatsApp(phone)
  const text = encodeURIComponent(message || '')
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`
}

/**
 * The message a client gets after completing their assessment, to hand
 * straight to the business's WhatsApp.
 */
export function buildClientAssessmentMessage({
  requestNumber, programmeName, jambScore, aggregate, status,
}) {
  return [
    'Hello, I have completed my admission assessment on your portal.',
    '',
    requestNumber ? `Request ID: ${requestNumber}` : null,
    `Programme: ${programmeName || '-'}`,
    `JAMB Score: ${jambScore ?? '-'}`,
    aggregate ? `Aggregate: ${aggregate}` : null,
    `Assessment Status: ${status || '-'}`,
    '',
    requestNumber
      ? 'I would like to proceed with the admission assistance process.'
      : 'I would like to discuss this before submitting a formal request.',
  ].filter(Boolean).join('\n')
}

/**
 * The message an admin sends when reaching out about a specific request.
 */
export function buildAdminOutreachMessage({ clientFirstName, requestNumber, programmeName }) {
  return `Hello ${clientFirstName || ''}, this is regarding your admission assistance request ${requestNumber || ''} for ${programmeName || 'your programme'}. We have reviewed your assessment and would like to discuss the next steps with you.`
}
