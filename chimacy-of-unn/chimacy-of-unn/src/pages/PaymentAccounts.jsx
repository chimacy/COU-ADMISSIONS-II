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
      setError(err?.message || 'Unable to load payment accounts.')
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
      alert(err?.message || 'Failed to save payment account.')
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
      alert(err?.message || 'Failed to update account status.')
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
      alert(err?.message || 'Failed to delete payment account.')
    }
  }

  return (
    // your existing JSX starts here
  )
}
