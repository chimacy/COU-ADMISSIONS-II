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
 * used here - no secret key exists anywhere in this file or anywhere else
 * in the frontend bundle. On success, the result is NOT trusted directly;
 * it's immediately handed to a Supabase Edge Function
 * (supabase/functions/verify-payment) which re-checks the transaction with
 * Flutterwave server-side using the secret key before anything is marked
 * paid in the database.
 *
 * @param {object} params
 * @param {string} params.publicKey - settings.flutterwave_public_key
 * @param {number} params.amount
 * @param {string} params.email
 * @param {string} params.phone
 * @param {string} params.name
 * @param {string} params.requestId - the `requests.id` this payment is for
 * @param {function} params.onVerified - called with the verified payment record
 * @param {function} params.onError
 */
export async function payWithFlutterwave({
  publicKey, amount, email, phone, name, requestId, onVerified, onError,
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

  const txRef = `chimacy-${requestId}-${Date.now()}`

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
            request_id: requestId,
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
