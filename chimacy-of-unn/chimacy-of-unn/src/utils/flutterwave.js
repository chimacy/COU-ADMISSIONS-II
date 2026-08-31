import { supabase } from '../lib/supabaseClient.js'

let sdkPromise = null

function loadFlutterwaveSdk() {
  if (window.FlutterwaveCheckout) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.flutterwave.com/v3.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load the payment provider. Please check your connection and try again.'))
    document.body.appendChild(script)
  })
  return sdkPromise
}

/**
 * Opens Flutterwave's hosted checkout modal. Only the PUBLIC key is ever
 * used here - the actual verification happens server-side in a Supabase
 * Edge Function using the secret key, which never touches the browser.
 *
 * Supports two ownership modes:
 *   - requestId: a Client Portal self-service payment (existing flow)
 *   - quotationId + partnerId: a Partner paying on behalf of a client they
 *     registered (new flow) - this NEVER marks the quotation as paid by
 *     itself; it only records a verified payment for a Super Admin to
 *     review and confirm.
 */
export async function payWithFlutterwave({
  publicKey, amount, email, phone, name, requestId, quotationId, partnerId, onVerified, onError,
}) {
  if (!publicKey) {
    onError?.(new Error('Online payment is not configured yet. Please contact us to arrange payment.'))
    return
  }

  try {
    await loadFlutterwaveSdk()
  } catch (err) {
    onError?.(err)
    return
  }

  const ownerId = requestId || quotationId || 'unknown'
  const txRef = `chimacy-${ownerId}-${Date.now()}`

  window.FlutterwaveCheckout({
    public_key: publicKey,
    tx_ref: txRef,
    amount,
    currency: 'NGN',
    payment_options: 'card,banktransfer,ussd',
    customer: { email: email || 'client@example.com', phone_number: phone, name },
    customizations: { title: 'Admission Assistance Payment', description: 'Admission assistance service fee' },
    callback: async (response) => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: {
            transaction_id: response.transaction_id,
            tx_ref: response.tx_ref,
            expected_amount: amount,
            request_id: requestId || null,
            quotation_id: quotationId || null,
            partner_id: partnerId || null,
          },
        })
        if (error) throw error
        if (!data?.verified) throw new Error('Payment could not be verified. Please contact us with your reference: ' + txRef)
        onVerified?.(data)
      } catch (err) {
        onError?.(err)
      }
    },
    onclose: () => {},
  })
}
