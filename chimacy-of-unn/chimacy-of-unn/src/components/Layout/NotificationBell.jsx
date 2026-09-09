import React, { useState, useRef, useEffect, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellRing,
  Check,
  Volume2,
  SmartphoneNfc,
} from 'lucide-react'
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
    notifications,
    unreadCount,
    soundEnabled,
    enableSound,
    pushEnabled,
    enablePush,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  /*
   * Automatically attempt to enable notifications when the component loads.
   * Browser permissions may still require user interaction.
   */
  useEffect(() => {
    if (!soundEnabled) {
      try {
        enableSound()
      } catch (error) {
        console.warn('Automatic sound activation was blocked:', error)
      }
    }

    if (!pushEnabled) {
      try {
        enablePush()
      } catch (error) {
        console.warn('Automatic push activation was blocked:', error)
      }
    }
  }, [])

  /*
   * Enable sound and push after the first user interaction.
   * This helps browsers that block automatic audio playback.
   */
  useEffect(() => {
    const activateNotifications = () => {
      if (!soundEnabled) {
        try {
          enableSound()
        } catch (error) {
          console.warn('Sound activation failed:', error)
        }
      }

      if (!pushEnabled) {
        try {
          enablePush()
        } catch (error) {
          console.warn('Push notification activation failed:', error)
        }
      }
    }

    window.addEventListener('click', activateNotifications, { once: true })
    window.addEventListener('touchstart', activateNotifications, { once: true })

    return () => {
      window.removeEventListener('click', activateNotifications)
      window.removeEventListener('touchstart', activateNotifications)
    }
  }, [soundEnabled, pushEnabled, enableSound, enablePush])

  /*
   * Close notification panel when clicking outside.
   */
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  function openNotification(n) {
    markAsRead(n.id)
    setOpen(false)

    if (n.request_id) {
      navigate(`/admin/requests?open=${n.request_id}`)
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Notification Bell */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost !p-2.5 rounded-full relative"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-primary-100 shadow-xl rounded-2xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary-100">
            <div>
              <p className="font-bold text-sm text-slate-800">
                Notifications
              </p>

              <p className="text-[10px] text-slate-400 mt-0.5">
                Alerts are always enabled
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="btn-ghost !p-1.5 rounded-full"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Notification Controls */}
          {(!soundEnabled || !pushEnabled) && (
            <div className="px-4 py-3 border-b border-primary-100 bg-primary-50/60">
              <p className="text-[11px] text-slate-500 mb-2">
                Your browser requires permission to activate some notification features.
              </p>

              <div className="flex gap-2">
                {!soundEnabled && (
                  <button
                    onClick={enableSound}
                    className="btn-secondary !text-[11px] !py-1.5 flex-1"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Enable Sound
                  </button>
                )}

                {!pushEnabled && (
                  <button
                    onClick={enablePush}
                    className="btn-primary !text-[11px] !py-1.5 flex-1"
                  >
                    <SmartphoneNfc className="h-3.5 w-3.5" />
                    Enable Phone Alerts
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 ${
                    !n.read ? 'bg-primary-50/60' : ''
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {n.title}
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {n.body}
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1">
                    {timeAgo(n.created_at)}
                  </p>
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
