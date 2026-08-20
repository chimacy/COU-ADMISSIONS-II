import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Check, Volume2, VolumeX, Inbox,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import { formatDateTime } from '../utils/format.js'

const TYPE_LABELS = {
  new_request: 'New Request',
  payment_confirmed: 'Payment Confirmed',
  status_update: 'Status Update',
}

export default function Notifications() {
  const {
    notifications, unreadCount, soundEnabled, enableSound, markAsRead, markAllAsRead,
  } = useNotifications()
  const navigate = useNavigate()

  function open(n) {
    markAsRead(n.id)
    if (n.request_id) navigate(`/admin/requests?open=${n.request_id}`)
  }

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-5">
        <Card className="!p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="font-bold font-display text-slate-800 dark:text-white">All Notifications</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!soundEnabled && (
              <button onClick={enableSound} className="btn-secondary !text-xs"><VolumeX className="h-3.5 w-3.5" /> Enable Sound</button>
            )}
            {soundEnabled && (
              <span className="btn-secondary !text-xs !cursor-default"><Volume2 className="h-3.5 w-3.5 text-primary-600" /> Sound On</span>
            )}
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="btn-secondary !text-xs"><Check className="h-3.5 w-3.5" /> Mark All Read</button>
            )}
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className={`w-full text-left px-5 py-4 flex items-start gap-3 ${!n.read ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''}`}
                >
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary-600 mt-1.5 shrink-0" />}
                  <div className={n.read ? 'pl-5' : ''}>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-primary-50 dark:bg-slate-800 text-primary-700 dark:text-primary-400 !text-[10px]">{TYPE_LABELS[n.type] || n.type}</span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{n.title}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{n.body}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
