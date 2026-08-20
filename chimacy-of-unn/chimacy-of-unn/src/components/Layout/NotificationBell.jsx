import React, { useState, useRef, useEffect, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, Check, Volume2, VolumeX } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext.jsx'

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotificationBell() {
  const {
    notifications, unreadCount, soundEnabled, enableSound, markAsRead, markAllAsRead,
  } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openNotification(n) {
    markAsRead(n.id)
    setOpen(false)
    if (n.request_id) navigate(`/admin/requests?open=${n.request_id}`)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost !p-2.5 rounded-full relative" aria-label="Notifications">
        {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-slate-900 border border-primary-100 dark:border-slate-700 shadow-xl rounded-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary-100 dark:border-slate-700">
            <p className="font-bold text-sm text-slate-800 dark:text-white">Notifications</p>
            <div className="flex items-center gap-1">
              {!soundEnabled && (
                <button onClick={enableSound} title="Enable sound notifications" className="btn-ghost !p-1.5 rounded-full">
                  <VolumeX className="h-4 w-4" />
                </button>
              )}
              {soundEnabled && <Volume2 className="h-4 w-4 text-primary-600 mx-1.5" title="Sound enabled" />}
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} title="Mark all as read" className="btn-ghost !p-1.5 rounded-full">
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 ${!n.read ? 'bg-primary-50/60 dark:bg-primary-950/20' : ''}`}
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(NotificationBell)
