import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from './AuthContext.jsx'

const NotificationContext = createContext(null)

const SOUND_PREF_KEY = 'chimacy_sound_enabled'
const PUSH_PREF_KEY = 'chimacy_push_enabled'

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth()

  const [notifications, setNotifications] = useState([])

  /*
   * SOUND IS ON BY DEFAULT.
   *
   * If the user has never configured sound before, it is enabled.
   * Only an explicitly stored "false" disables it.
   */
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem(SOUND_PREF_KEY)

    return saved !== 'false'
  })

  /*
   * Push notifications are enabled by default from the application's
   * perspective.
   *
   * The browser itself may still require notification permission.
   */
  const [pushEnabled, setPushEnabled] = useState(() => {
    if (typeof Notification === 'undefined') return true

    const permission = Notification.permission

    if (permission === 'denied') return false

    const saved = localStorage.getItem(PUSH_PREF_KEY)

    return saved !== 'false'
  })

  const audioCtxRef = useRef(null)
  const audioReadyRef = useRef(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  /*
   * ---------------------------------------------------------
   * AUDIO INITIALIZATION
   * ---------------------------------------------------------
   */

  const initializeAudio = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return

      const AudioContext =
        window.AudioContext || window.webkitAudioContext

      if (!AudioContext) {
        console.warn('Web Audio API is not supported by this browser.')
        return
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }

      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume()
      }

      audioReadyRef.current = true
    } catch (error) {
      console.warn('Unable to initialize notification audio:', error)
    }
  }, [])

  /*
   * Prepare sound automatically after the first interaction.
   *
   * Browsers generally do not allow a website to start audio before
   * the user has interacted with the page.
   */
  useEffect(() => {
    const activateAudio = () => {
      initializeAudio()
    }

    window.addEventListener('click', activateAudio)
    window.addEventListener('touchstart', activateAudio)
    window.addEventListener('keydown', activateAudio)

    return () => {
      window.removeEventListener('click', activateAudio)
      window.removeEventListener('touchstart', activateAudio)
      window.removeEventListener('keydown', activateAudio)
    }
  }, [initializeAudio])

  /*
   * Initialize audio immediately as well.
   * This works on browsers that allow it.
   */
  useEffect(() => {
    if (soundEnabled) {
      initializeAudio()
    }
  }, [soundEnabled, initializeAudio])

  /*
   * ---------------------------------------------------------
   * CUSTOM NOTIFICATION SOUND
   * ---------------------------------------------------------
   */

  const playSound = useCallback(async () => {
    if (!soundEnabled) return

    try {
      /*
       * Make sure the audio context exists.
       */
      await initializeAudio()

      const ctx = audioCtxRef.current

      if (!ctx) return

      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const now = ctx.currentTime

      /*
       * First tone
       */
      const oscillator1 = ctx.createOscillator()
      const gain1 = ctx.createGain()

      oscillator1.type = 'sine'
      oscillator1.frequency.setValueAtTime(880, now)

      gain1.gain.setValueAtTime(0.0001, now)
      gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

      oscillator1.connect(gain1)
      gain1.connect(ctx.destination)

      oscillator1.start(now)
      oscillator1.stop(now + 0.2)

      /*
       * Second tone.
       *
       * This creates a more recognizable notification sound.
       */
      const oscillator2 = ctx.createOscillator()
      const gain2 = ctx.createGain()

      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(660, now + 0.12)

      gain2.gain.setValueAtTime(0.0001, now + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.16, now + 0.13)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)

      oscillator2.connect(gain2)
      gain2.connect(ctx.destination)

      oscillator2.start(now + 0.12)
      oscillator2.stop(now + 0.4)
    } catch (error) {
      console.warn('Notification sound could not be played:', error)
    }
  }, [soundEnabled, initializeAudio])

  /*
   * ---------------------------------------------------------
   * BROWSER PUSH NOTIFICATION
   * ---------------------------------------------------------
   */

  const showPushNotification = useCallback(
    (notification) => {
      if (!pushEnabled) return

      if (typeof Notification === 'undefined') return

      /*
       * The browser must have granted permission.
       */
      if (Notification.permission !== 'granted') return

      try {
        const browserNotification = new Notification(
          notification.title || 'COU Admission Service',
          {
            body: notification.body || 'You have a new notification.',
            tag: notification.id
              ? `notification-${notification.id}`
              : 'chimacy-notification',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            renotify: true,
          }
        )

        /*
         * Clicking the browser notification focuses the website.
         */
        browserNotification.onclick = () => {
          window.focus()

          if (notification.request_id) {
            window.location.href =
              `/admin/requests?open=${notification.request_id}`
          }

          browserNotification.close()
        }
      } catch (error) {
        console.warn(
          'Browser notification could not be displayed:',
          error
        )
      }
    },
    [pushEnabled]
  )

  /*
   * ---------------------------------------------------------
   * FETCH EXISTING NOTIFICATIONS
   * ---------------------------------------------------------
   */

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) {
        console.error(
          'Unable to fetch notifications:',
          error
        )
        return
      }

      if (data) {
        setNotifications(data)
      }
    } catch (error) {
      console.error(
        'Notification fetch error:',
        error
      )
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * REAL-TIME NOTIFICATIONS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      return undefined
    }

    fetchNotifications()

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          const newNotification = payload.new

          /*
           * Add notification to the list immediately.
           */
          setNotifications((prev) => {
            const alreadyExists = prev.some(
              (n) => n.id === newNotification.id
            )

            if (alreadyExists) {
              return prev
            }

            return [newNotification, ...prev].slice(0, 30)
          })

          /*
           * Play custom notification sound.
           */
          await playSound()

          /*
           * Show browser notification.
           */
          showPushNotification(newNotification)
        }
      )
      .subscribe((status) => {
        console.log(
          'Notification realtime status:',
          status
        )
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    isAuthenticated,
    fetchNotifications,
    playSound,
    showPushNotification,
  ])

  /*
   * ---------------------------------------------------------
   * ENABLE SOUND
   * ---------------------------------------------------------
   *
   * Sound is already enabled by default.
   *
   * This function mainly exists so the UI can manually activate
   * the AudioContext if the browser blocked automatic audio.
   */

  const enableSound = useCallback(async () => {
    try {
      await initializeAudio()

      localStorage.setItem(SOUND_PREF_KEY, 'true')
      setSoundEnabled(true)

      /*
       * Small confirmation sound.
       */
      const ctx = audioCtxRef.current

      if (ctx) {
        const now = ctx.currentTime

        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, now)

        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(
          0.15,
          now + 0.01
        )
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + 0.2
        )

        oscillator.connect(gain)
        gain.connect(ctx.destination)

        oscillator.start(now)
        oscillator.stop(now + 0.22)
      }
    } catch (error) {
      console.warn(
        'Unable to enable notification sound:',
        error
      )
    }
  }, [initializeAudio])

  /*
   * ---------------------------------------------------------
   * ENABLE PUSH
   * ---------------------------------------------------------
   */

  const enablePush = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      console.warn(
        'This browser does not support notifications.'
      )
      return
    }

    try {
      /*
       * Already granted.
       */
      if (Notification.permission === 'granted') {
        localStorage.setItem(PUSH_PREF_KEY, 'true')
        setPushEnabled(true)
        return true
      }

      /*
       * Browser has permanently denied permission.
       */
      if (Notification.permission === 'denied') {
        setPushEnabled(false)

        console.warn(
          'Browser notifications are blocked. Enable them from browser settings.'
        )

        return false
      }

      /*
       * Request browser permission.
       */
      const permission =
        await Notification.requestPermission()

      if (permission === 'granted') {
        localStorage.setItem(PUSH_PREF_KEY, 'true')
        setPushEnabled(true)

        try {
          new Notification(
            'COU Admission Service',
            {
              body: 'Notifications are now active on this device.',
              icon: '/favicon.ico',
              badge: '/favicon.ico',
            }
          )
        } catch (error) {
          console.warn(
            'Confirmation notification failed:',
            error
          )
        }

        return true
      }

      setPushEnabled(false)

      return false
    } catch (error) {
      console.warn(
        'Unable to enable browser notifications:',
        error
      )

      return false
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * MARK ONE AS READ
   * ---------------------------------------------------------
   */

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, read: true }
          : n
      )
    )

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    if (error) {
      console.error(
        'Unable to mark notification as read:',
        error
      )
    }
  }, [])

  /*
   * ---------------------------------------------------------
   * MARK ALL AS READ
   * ---------------------------------------------------------
   */

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((n) => !n.read)
      .map((n) => n.id)

    if (unreadIds.length === 0) return

    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
      }))
    )

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds)

    if (error) {
      console.error(
        'Unable to mark notifications as read:',
        error
      )
    }
  }, [notifications])

  /*
   * ---------------------------------------------------------
   * CONTEXT
   * ---------------------------------------------------------
   */

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,

        /*
         * Notification sound
         */
        soundEnabled,
        enableSound,

        /*
         * Browser notifications
         */
        pushEnabled,
        enablePush,

        /*
         * Notification management
         */
        markAsRead,
        markAllAsRead,

        /*
         * Refresh notifications manually
         */
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)

  if (!ctx) {
    throw new Error(
      'useNotifications must be used within NotificationProvider'
    )
  }

  return ctx
}
```

Then use this updated `NotificationBell.jsx`. It removes the old "turn these on" setup banner as the normal experience. The enable buttons only appear when the browser has actually prevented a feature from working.

```jsx
import React, {
  useState,
  useRef,
  useEffect,
  memo,
} from 'react'

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
  const diff =
    (Date.now() - new Date(iso).getTime()) / 1000

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
   * Close when clicking outside.
   */
  useEffect(() => {
    function handleClick(e) {
      if (
        ref.current &&
        !ref.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener(
        'mousedown',
        handleClick
      )
    }

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClick
      )
    }
  }, [open])

  /*
   * Open individual notification.
   */
  function openNotification(notification) {
    markAsRead(notification.id)

    setOpen(false)

    if (notification.request_id) {
      navigate(
        `/admin/requests?open=${notification.request_id}`
      )
    }
  }

  return (
    <div
      className="relative"
      ref={ref}
    >
      {/* Bell */}
      <button
        onClick={() =>
          setOpen((current) => !current)
        }
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
            {unreadCount > 9
              ? '9+'
              : unreadCount}
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
                Real-time alerts are active
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

          {/* Browser fallback controls */}
          {(!soundEnabled || !pushEnabled) && (
            <div className="px-4 py-3 border-b border-primary-100 bg-primary-50/60">
              <p className="text-[11px] text-slate-500 mb-2">
                Your browser requires a quick permission or
                interaction to activate all alerts.
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

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() =>
                    openNotification(notification)
                  }
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50 ${
                    !notification.read
                      ? 'bg-primary-50/60'
                      : ''
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {notification.title}
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1">
                    {timeAgo(
                      notification.created_at
                    )}
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
```

### What this changes

Your notification flow will now be:

**Supabase INSERT**

→ notification instantly enters the notification list

→ unread count increases

→ bell changes to `BellRing`

→ custom notification sound plays

→ browser notification appears if browser permission is available

→ clicking the notification can take the admin directly to the request

The important change is that **sound no longer starts as `false` on a fresh installation**. It starts as `true`.

Also, if an old version of your app previously saved:

```text
chimacy_sound_enabled = false
```

the code respects that explicit setting. If you want to completely eliminate the old preference system and make sound **unconditionally ON**, even for users who previously disabled it, change:

```js
const saved = localStorage.getItem(SOUND_PREF_KEY)

return saved !== 'false'
```

to simply:

```js
const [soundEnabled, setSoundEnabled] = useState(true)
```

I recommend the first approach because it gives you **ON by default** without unexpectedly overriding an existing user's browser preference.

**One more thing:** this gives you automatic in-app + sound + browser notifications while the web app is running. If you want **true phone notifications even when the admin has closed the website/browser**, the next step is adding a **Firebase Cloud Messaging or Web Push service worker**. Your current `new Notification()` implementation cannot reliably do that when the page is completely closed.
