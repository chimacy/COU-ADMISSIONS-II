import React, { useEffect, useMemo, useState } from 'react'
import {
  CreditCard, Loader2, Search, CheckCircle2, Landmark, Copy, Upload, X,
} from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import Modal from '../../components/UI/Modal.jsx'
import { Select } from '../../components/UI/FormField.jsx'
import { getMyClients } from '../../utils/db.js'
import { formatCurrency } from '../../utils/format.js'
import { STATUS, statusBadgeStyle } from '../../utils/evaluation.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'

export default function PayForClient() {
  const { settings } = useSettings()
  const { user } = useAuth()
  const { showToast } = useNotifications()
  const [clients, setClients] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [paying, setPaying] = useState(null)
  const [declaring, setDeclaring] = useState(false)
  const [declaredIds, setDeclaredIds] = useState([])
  const [paymentType, setPaymentType] = useState('FULL')
  const [amount, setAmount] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const refresh = () => {
    setLoading(true)
    Promise.all([
      getMyClients(),
      supabase.from('payment_accounts').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([c, acc]) => { setClients(c); setAccounts(acc.data || []) })
      .catch(() => showToast('Unable to load your clients', 'Please check your connection and try again.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const eligibleUnpaid = useMemo(() => {
    let list = clients.filter((c) => (c.status === STATUS.ELIGIBLE || c.status === STATUS.ELIGIBLE_DOUBLE) && !c.paid)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((c) => [c.clientName, c.quotationNumber].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
    return list
  }, [clients, query])

  function openPayModal(client) {
    setPaying(client)
    setPaymentType('FULL')
    setAmount(Math.max(0, client.price - client.paidAmount))
    setReceiptFile(null)
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text)
    showToast('Account number copied')
  }

 async function handleDeclarePayment(account) {
  if (!paying) return

  if (!amount || Number(amount) <= 0) {
    showToast('Enter the amount you are paying', '', 'error')
    return
  }

  const paymentAmount = Number(amount)
  const outstandingBalance =
    Number(paying.price || 0) - Number(paying.paidAmount || 0)

  if (paymentAmount > outstandingBalance) {
    showToast(
      'Invalid payment amount',
      `Maximum outstanding balance is ${formatCurrency(outstandingBalance, settings.currency_symbol)}.`,
      'error'
    )
    return
  }

  if (!user?.id) {
    showToast('Session error', 'Please log in again and try.', 'error')
    return
  }

  setDeclaring(true)

  try {
    let receiptPath = null

    if (receiptFile) {
      setUploadingReceipt(true)

      const extension =
        receiptFile.name.split('.').pop()?.toLowerCase() || 'jpg'

      receiptPath =
        user.id + '/' + paying.id + '-' + Date.now() + '.' + extension

      const storage = supabase.storage
      const bucket = storage.from('payment-receipts')

      const uploadResult = await bucket.upload(
        receiptPath,
        receiptFile,
        {
          cacheControl: '3600',
          upsert: false,
        }
      )

      setUploadingReceipt(false)

      if (uploadResult.error) {
        throw uploadResult.error
      }
    }

    const txRef = 'manual-' + paying.id + '-' + Date.now()

    const paymentData = {
      quotation_id: paying.id,
      partner_id: user.id,
      client_name: paying.clientName,
      amount: paymentAmount,
      currency: 'NGN',
      tx_ref: txRef,
      status: 'PENDING',
      verified: false,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_type: paymentType,
      payment_method: account.provider,
      receipt_url: receiptPath,
      recorded_by: user.id,
    }

    const paymentResult = await supabase
      .from('payments')
      .insert(paymentData)

    if (paymentResult.error) {
      throw paymentResult.error
    }

    setDeclaredIds((ids) => [...ids, paying.id])
    setPaying(null)
    setReceiptFile(null)
    setAmount('')
    setUploadingReceipt(false)

    showToast(
      'Payment submitted successfully',
      'Your payment is now awaiting Super Admin confirmation.'
    )
  } catch (err) {
    setUploadingReceipt(false)

    showToast(
      'Payment submission failed',
      err?.message || 'Please try again.',
      'error'
    )
  } finally {
    setDeclaring(false)
  }
}
    const txRef = `manual-${paying.id}-${Date.now()}`

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        quotation_id: paying.id,
        partner_id: user.id,
        client_name: paying.clientName,
        amount: paymentAmount,
        currency: 'NGN',
        tx_ref: txRef,
        status: 'PENDING',
        verified: false,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_type: paymentType,
        payment_method: account.provider,
        receipt_url: receiptPath,
        recorded_by: user.id,
      })

    if (paymentError) {
      throw paymentError
    }

    setDeclaredIds((ids) => [...ids, paying.id])
    setPaying(null)
    setReceiptFile(null)
    setAmount('')
    setUploadingReceipt(false)

    showToast(
      'Payment submitted successfully',
      'Your payment is now awaiting Super Admin confirmation.'
    )
  } catch (err) {
    setUploadingReceipt(false)

    showToast(
      'Payment submission failed',
      err?.message || 'Please try again.',
      'error'
    )
  } finally {
    setDeclaring(false)
  }
}
  if (!paying) return

  const paymentAmount = Number(amount)
  const remainingAmount = Math.max(
    0,
    Number(paying.price || 0) - Number(paying.paidAmount || 0)
  )

  if (paymentAmount > remainingAmount) {
    showToast(
      'Invalid payment amount',
      `The maximum outstanding balance is ${formatCurrency(remainingAmount, settings.currency_symbol)}.`,
      'error'
    )
    return
  }

  setDeclaring(true)

  try {
    let receiptPath = null

    if (receiptFile) {
      setUploadingReceipt(true)

      const ext = receiptFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      receiptPath = `${user.id}/${paying.id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase
        .storage
        .from('payment-receipts')
        .upload(receiptPath, receiptFile, {
          cacheControl: '3600',
          upsert: false,
        })

      setUploadingReceipt(false)

      if (uploadError) throw uploadError
      
    }

    const txRef = `manual-${paying.id}-${Date.now()}`

    const { error } = await supabase
      .from('payments')
      .insert({
        quotation_id: paying.id,
        partner_id: user.id,
        client_name: paying.clientName,
        amount: paymentAmount,
        currency: 'NGN',
        tx_ref: txRef,
        status: 'PENDING',
        verified: false,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_type: paymentType,
        payment_method: account.provider,
        receipt_url: receiptPath,
        recorded_by: user.id,
      })

    if (error) throw error

    setDeclaredIds((ids) => [...ids, paying.id])
    setPaying(null)
    setReceiptFile(null)

    showToast(
      'Payment submitted successfully',
      'Your payment is now awaiting Super Admin confirmation.'
    )
  } catch (err) {
    setUploadingReceipt(false)

    showToast(
      'Payment submission failed',
      err.message || 'Please try again.',
      'error'
    )
  } finally {
    setDeclaring(false)
  }
}

      const txRef = `manual-${paying.id}-${Date.now()}`
      const { error } = await supabase.from('payments').insert({
        quotation_id: paying.id,
        partner_id: user?.id,
        client_name: paying.clientName,
        amount: Number(amount),
        currency: 'NGN',
        tx_ref: txRef,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_type: paymentType,
        payment_method: account.provider,
        receipt_url: receiptPath,
        recorded_by: user?.id,
      })
      if (error) throw error
      setDeclaredIds((ids) => [...ids, paying.id])
      setPaying(null)
      showToast('Payment submitted successfully', 'Your Super Admin will review and confirm it.')
    } catch (err) {
      showToast('Payment submission failed', err.message || 'Please try again.', 'error')
    } finally {
      setDeclaring(false)
    }
  }

  return (
    <DashboardLayout title="Payment for Client">
      <div className="space-y-5">
        <Card className="!p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your clients..." className="input-field !pl-10" />
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : eligibleUnpaid.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No clients awaiting payment right now.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Programme</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleUnpaid.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.clientName}</td>
                      <td className="px-4 py-3 text-slate-600">{c.programme}</td>
                      <td className="px-4 py-3"><span className={`badge ${statusBadgeStyle(c.status)}`}>{c.status}</span></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatCurrency(c.price, settings.currency_symbol)}</td>
                      <td className="px-4 py-3 text-right">
                        {declaredIds.includes(c.id) ? (
                          <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Awaiting confirmation</span>
                        ) : (
                          <button onClick={() => openPayModal(c)} className="btn-primary !px-3 !py-1.5 !text-xs">
                            <Landmark className="h-3.5 w-3.5" /> Pay for Client
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-xs text-slate-400 px-1">
          After you send a payment, your Super Admin reviews and confirms it before it counts as complete - you'll get a notification once that happens.
        </p>
      </div>

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Pay for Client"
      >
        {paying && (
          <div className="space-y-4">
            <div className="glass-panel p-3">
              <p className="text-sm font-semibold text-slate-800">{paying.clientName}</p>
              <p className="text-xs text-slate-500">Total Fee: <strong>{formatCurrency(paying.price, settings.currency_symbol)}</strong></p>
            </div>

            <Select label="Payment Type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
              <option value="FULL">Full Payment</option>
              <option value="INSTALLMENT">Installment Payment</option>
            </Select>

            <div>
              <p className="label-field">Amount You're Paying (₦)</p>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                placeholder="e.g. 500000"
              />
            </div>

            <div>
              <p className="label-field">Payment Receipt (optional, JPG/PNG)</p>
              {receiptFile ? (
                <div className="glass-panel p-2.5 flex items-center justify-between">
                  <span className="text-xs text-slate-600 truncate">{receiptFile.name}</span>
                  <button onClick={() => setReceiptFile(null)} className="btn-ghost !p-1 rounded"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <label className="btn-secondary w-full !text-xs cursor-pointer">
                  <Upload className="h-3.5 w-3.5" /> Upload Receipt Image
                  <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>

            {accounts.length === 0 ? (
              <p className="text-sm text-slate-500">No payment accounts have been configured yet. Contact your Super Admin.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Send the payment to any account below, then confirm you've sent it.</p>
                {accounts.map((acc) => (
                  <div key={acc.id} className="glass-panel p-4">
                    <span className="badge bg-primary-50 text-primary-700 !text-[10px] mb-2 inline-block">{acc.provider}</span>

                    <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Account Number</p>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-2xl font-bold font-display text-slate-800 tracking-wide">{acc.account_number}</p>
                      <button onClick={() => copyToClipboard(acc.account_number)} className="btn-ghost !p-1.5 rounded-lg shrink-0"><Copy className="h-4 w-4" /></button>
                    </div>

                    <p className="text-xs text-slate-500">Account Name</p>
                    <p className="text-sm font-medium text-slate-700 mb-1">{acc.account_name}</p>
                    {acc.bank_name && (
                      <>
                        <p className="text-xs text-slate-500">Bank Name</p>
                        <p className="text-sm font-medium text-slate-700">{acc.bank_name}</p>
                      </>
                    )}

                    <button
                      onClick={() => handleDeclarePayment(acc)}
                      disabled={declaring}
                      className="btn-secondary w-full mt-3 !text-xs"
                    >
                      {declaring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {uploadingReceipt ? 'Uploading receipt...' : `I've Sent This Payment via ${acc.provider}`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
