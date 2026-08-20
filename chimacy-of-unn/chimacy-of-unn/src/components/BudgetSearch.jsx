import React, { useState, useMemo } from 'react'
import { Wallet, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from './UI/FormField.jsx'
import { filterProgrammesByBudget } from '../utils/budget.js'
import { formatCurrency } from '../utils/format.js'

/**
 * @param {Array} programmes - { id, name, grade, price, doublePrice }
 * @param {string} currencySymbol
 * @param {function} onSelect - called with the programme when the user picks one
 * @param {boolean} startOpen
 */
export default function BudgetSearch({
  programmes, currencySymbol, onSelect, startOpen = false,
}) {
  const [open, setOpen] = useState(startOpen)
  const [budget, setBudget] = useState('')

  const matches = useMemo(() => filterProgrammesByBudget(programmes, budget), [programmes, budget])
  const hasSearched = Number(budget) > 0

  return (
    <div className="glass-panel p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <Wallet className="h-4 w-4 text-primary-600" />
          Not sure which programme? Search by the amount you have
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="mt-4">
          <Input
            label="How much do you have available?"
            type="number"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 800000"
          />

          {hasSearched && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No programmes fit that amount under Normal Working right now. You may still qualify for Double Working on some programmes — enter a JAMB score to check.
                </p>
              ) : (
                matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelect(p)}
                    className="w-full text-left bg-white dark:bg-slate-900 border border-primary-100 dark:border-slate-700 rounded-xl p-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{p.name}</p>
                      <p className="text-sm font-bold text-primary-700 dark:text-primary-400">{formatCurrency(p.price, currencySymbol)}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.grade}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
