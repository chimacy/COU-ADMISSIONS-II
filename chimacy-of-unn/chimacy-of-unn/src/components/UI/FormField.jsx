import React from 'react'

export function Input({ label, error, required, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="label-field">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input className="input-field" {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Select({ label, error, required, children, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="label-field">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select className="input-field cursor-pointer" {...props}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, required, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="label-field">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea className="input-field resize-none" rows={4} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
