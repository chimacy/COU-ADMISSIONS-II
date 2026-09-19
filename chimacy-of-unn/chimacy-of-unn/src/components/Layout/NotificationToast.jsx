import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, X, ArrowRight, CheckCircle2, XCircle, Info,
} from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext.jsx'

const VARIANT_STYLE = {
  success: { icon: CheckCircle2, iconBg: 'bg-emerald-500' },
  error: { icon: XCircle, iconBg: 'bg-red-500' },
  info: { icon: Info, iconBg: 'bg-blue-500' },
}

export default function NotificationToastContainer() {
  const { toasts, dismissToast } = useNotifications()
  const navigate = useNavigate()

  if (toasts.length === 0) return null

  function handleView(toast) {
    dismissToast(toast.id)
    if (toast.action_route) navigate(toast.action_route)
  }

  return (
    <div className="fixed top-3 right-3 left-3 sm:left-auto sm:w-96 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const variant = t.local ? VARIANT_STYLE[t.variant] || VARIANT_STYLE.success : null
        const Icon = variant ? variant.icon : Bell

        return (
          <div
            key={t.id}
            className="pointer-events-auto bg-white border border-primary-100 shadow-xl rounded-2xl p-4 flex gap-3 animate-fade-in"
          >
            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${variant ? variant.iconBg : 'brand-surface'}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{t.title}</p>
              {t.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.body}</p>}
              {t.action_route && (
                <button onClick={() => handleView(t)} className="text-xs font-semibold text-primary-700 mt-1.5 flex items-center gap-1">
                  View <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <button onClick={() => dismissToast(t.id)} className="btn-ghost !p-1 rounded-full shrink-0 self-start">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
