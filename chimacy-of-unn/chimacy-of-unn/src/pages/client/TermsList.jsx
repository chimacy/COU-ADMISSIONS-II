import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'

export default function TermsList({ compact = false }) {
  const [rules, setRules] = useState(null)

  useEffect(() => {
    supabase.from('rules').select('*').order('sort_order').then(({ data }) => setRules(data || []))
  }, [])

  if (rules === null) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary-500" /></div>
  }

  if (rules.length === 0) {
    return <p className="text-sm text-slate-400">No terms have been published yet.</p>
  }

  return (
    <ol className={`space-y-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      {rules.map((r, idx) => (
        <li key={r.id} className="text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-white">{idx + 1}. {r.title ? `${r.title} — ` : ''}</span>
          {r.body}
        </li>
      ))}
    </ol>
  )
}
