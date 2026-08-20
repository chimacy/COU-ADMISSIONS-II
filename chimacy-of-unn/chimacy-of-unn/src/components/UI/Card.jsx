import React, { memo } from 'react'

function Card({ children, className = '', glass = true, ...props }) {
  return (
    <div
      className={`${glass ? 'glass-card' : 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800'} p-5 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// Plain-content cards (the vast majority) re-render only when their own
// props change, not when a sibling/parent updates.
export default memo(Card)
