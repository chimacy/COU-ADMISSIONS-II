// Supabase Edge Function: verify-payment
// ----------------------------------------
// Runs on Supabase's servers, NOT in the browser. This is the only place
// FLUTTERWAVE_SECRET_KEY and the Supabase SERVICE_ROLE key are ever used -
// both are set as Edge Function secrets, never as VITE_ variables, so they
// never ship to the browser.
//
// Two call shapes:
//   1. request_id set   -> Client Portal self-service payment (public flow)
//   2. quotation_id set -> a Partner paying on behalf of a client they
//      registered. This NEVER marks the quotation `paid`, and NEVER lets a
//      Partner confirm a payment - it only records a verified payment row
//      and notifies the Super Admin, who confirms manually from Checkout.
//
// Deploy with:
//   supabase functions deploy verify-payment
//   supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!FLUTTERWAVE_SECRET_KEY) {
      throw new Error('FLUTTERWAVE_SECRET_KEY is not configured on the server.')
    }

    const {
      transaction_id, tx_ref, expected_amount, request_id, quotation_id, partner_id,
    } = await req.json()
    if (!transaction_id) throw new Error('Missing transaction_id')

    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } },
    )
    const verifyData = await verifyRes.json()
    const tx = verifyData?.data

    const isGenuinelySuccessful = (
      verifyData.status === 'success'
      && tx?.status === 'successful'
      && tx?.currency === 'NGN'
      && Number(tx?.amount) >= Number(expected_amount)
      && tx?.tx_ref === tx_ref
    )

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    if (!isGenuinelySuccessful) {
      await supabase.from('payments').insert({
        request_id: request_id || null,
        quotation_id: quotation_id || null,
        partner_id: partner_id || null,
        amount: expected_amount,
        currency: 'NGN',
        flutterwave_tx_id: String(transaction_id),
        tx_ref,
        status: 'FAILED',
        verified: false,
      })
      return json({ verified: false, reason: 'Transaction could not be verified as successful.' })
    }

    // Record the verified payment (service role bypasses RLS - this is the
    // only code path allowed to write a SUCCESSFUL payment row).
    const { data: payment, error } = await supabase
      .from('payments')
      .upsert({
        request_id: request_id || null,
        quotation_id: quotation_id || null,
        partner_id: partner_id || null,
        client_name: tx?.customer?.name || '',
        amount: tx.amount,
        currency: tx.currency,
        flutterwave_tx_id: String(transaction_id),
        tx_ref,
        status: 'SUCCESSFUL',
        verified: true,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'tx_ref' })
      .select()
      .single()

    if (error) throw error

    if (request_id) {
      // Client Portal self-service flow: this IS the confirmation step,
      // since there is no separate admin in that flow reviewing it.
      await supabase.from('requests').update({ payment_status: 'SUCCESSFUL', status: 'PAYMENT_CONFIRMED' }).eq('id', request_id)
    }

    if (quotation_id) {
      // Partner-initiated flow: deliberately do NOT touch quotations.paid
      // here - a Super Admin must still confirm it manually. Just notify
      // every super admin (recipient_id null = broadcast) that a payment
      // is ready for review.
      await supabase.from('notifications').insert({
        type: 'payment_confirmed',
        title: 'Payment awaiting confirmation',
        body: `A Partner-initiated payment of ${tx.amount} ${tx.currency} was verified and is awaiting your confirmation in Checkout & Invoices.`,
        recipient_id: null,
      })
    }

    return json({ verified: true, payment })
  } catch (err) {
    return json({ verified: false, error: String(err?.message || err) }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
