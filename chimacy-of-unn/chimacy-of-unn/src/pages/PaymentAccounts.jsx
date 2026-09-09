import React, { useEffect, useState } from 'react'
import {
  Landmark,
  Plus,
  Trash2,
  Loader2,
  Power,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { Input, Select } from '../components/UI/FormField.jsx'
import { supabase } from '../lib/supabaseClient.js'

const emptyAccount = {
  provider: 'Moniepoint',
  account_name: '',
  account_number: '',
  bank_name: '',
}

export default function PaymentAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('payment_accounts')
        .select('*')
        .order('sort_order', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setAccounts(data || [])
    } catch (err) {
      console.error('Payment accounts fetch error:', err)
      setError(
        err?.message ||
        'Unable to load payment accounts.'
      )
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSave() {
    if (!editing?.account_number?.trim()) {
      alert('Please enter an account number.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        provider: editing.provider?.trim() || 'Other',
        account_name: editing.account_name?.trim() || '',
        account_number: editing.account_number.trim(),
        bank_name: editing.bank_name?.trim() || '',
      }

      let result

      if (editing.id) {
        result = await supabase
          .from('payment_accounts')
          .update(payload)
          .eq('id', editing.id)
      } else {
        result = await supabase
          .from('payment_accounts')
          .insert({
            ...payload,
            is_active: true,
            sort_order: accounts.length,
          })
      }

      if (result.error) {
        throw result.error
      }

      setEditing(null)
      await refresh()
    } catch (err) {
      console.error('Payment account save error:', err)

      alert(
        err?.message ||
        'Failed to save payment account.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(account) {
    try {
      const { error: updateError } = await supabase
        .from('payment_accounts')
        .update({
          is_active: !account.is_active,
        })
        .eq('id', account.id)

      if (updateError) {
        throw updateError
      }

      await refresh()
    } catch (err) {
      console.error('Payment account status error:', err)

      alert(
        err?.message ||
        'Failed to update account status.'
      )
    }
  }

  async function confirmDelete() {
    if (!deleting?.id) return

    try {
      const { error: deleteError } = await supabase
        .from('payment_accounts')
        .delete()
        .eq('id', deleting.id)

      if (deleteError) {
        throw deleteError
      }

      setDeleting(null)
      await refresh()
    } catch (err) {
      console.error('Payment account delete error:', err)

      alert(
        err?.message ||
        'Failed to delete payment account.'
      )
    }
  }

  return (
    <DashboardLayout title="Payment Accounts">
      <div className="space-y-5">

        {/* HEADER */}
        <Card className="!p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Landmark className="h-5 w-5 text-primary-600 shrink-0" />

            <div className="min-w-0">
              <h3 className="font-bold font-display text-slate-800">
                Manual Payment Accounts
              </h3>

              <p className="text-xs text-slate-500">
                Every active account here is visible to Partners
                when they pay for a client.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditing({ ...emptyAccount })}
            className="btn-primary shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </Card>

        {/* ERROR */}
        {error && (
          <Card className="!p-4 border border-red-200 bg-red-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Unable to load payment accounts
                </p>

                <p className="text-xs text-red-600 mt-1">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={refresh}
                className="btn-secondary !px-3 !py-1.5 !text-xs shrink-0"
              >
                Retry
              </button>
            </div>
          </Card>
        )}

        {/* ACCOUNTS */}
        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" />

              <p className="text-xs text-slate-500 mt-3">
                Loading payment accounts...
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Landmark className="h-8 w-8 text-slate-300 mx-auto mb-3" />

              <p className="text-sm font-medium text-slate-600">
                No payment accounts added yet.
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Add an account so Partners can see where to make
                manual payments.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge bg-primary-50 text-primary-700 !text-[10px]">
                        {account.provider}
                      </span>

                      {account.is_active ? (
                        <span className="badge bg-emerald-50 text-emerald-700 !text-[10px]">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-400 !text-[10px]">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {account.account_name || 'Unnamed account'}
                    </p>

                    <p className="text-xs text-slate-500">
                      {account.account_number}

                      {account.bank_name
                        ? ` · ${account.bank_name}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleActive(account)}
                      title={
                        account.is_active
                          ? 'Deactivate'
                          : 'Activate'
                      }
                      className="btn-ghost !p-2 rounded-lg"
                    >
                      <Power
                        className={`h-4 w-4 ${
                          account.is_active
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing({ ...account })}
                      className="btn-secondary !px-3 !py-1.5 !text-xs"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleting(account)}
                      className="btn-ghost !p-2 rounded-lg text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        open={!!editing}
        onClose={() => {
          if (!saving) {
            setEditing(null)
          }
        }}
        title={
          editing?.id
            ? 'Edit Account'
            : 'Add Account'
        }
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              Save
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">

            <Select
              label="Provider"
              value={editing.provider}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  provider: e.target.value,
                })
              }
            >
              <option value="Moniepoint">
                Moniepoint
              </option>

              <option value="Opay">
                Opay
              </option>

              <option value="Bank Transfer">
                Bank Transfer
              </option>

              <option value="Other">
                Other
              </option>
            </Select>

            <Input
              label="Account Name"
              value={editing.account_name}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  account_name: e.target.value,
                })
              }
            />

            <Input
              label="Account Number"
              required
              value={editing.account_number}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  account_number: e.target.value,
                })
              }
            />

            <Input
              label="Bank Name (optional)"
              value={editing.bank_name}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  bank_name: e.target.value,
                })
              }
            />
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Account"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-danger"
              onClick={confirmDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Remove this payment account? Partners will no longer
          see it as an option.
        </p>
      </Modal>
    </DashboardLayout>
  )
}
