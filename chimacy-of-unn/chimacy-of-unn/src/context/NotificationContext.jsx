import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from './AuthContext.jsx'

const NotificationContext = createContext(null)
const SOUND_PREF_KEY = 'chimacy_sound_enabled'
const PUSH_PREF_KEY = 'chimacy_push_enabled'

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_PREF_KEY) === 'true')
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(PUSH_PREF_KEY) === 'true' && typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const audioCtxRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) setNotifications(data)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      return undefined
    }
    fetchNotifications()
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev].slice(0, 30))
        playSound()
        showPushNotification(payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, fetchNotifications])

  function playSound() {
    if (!soundEnabled || !audioCtxRef.current) return
    try {
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    } catch (e) { /* sound is a nice-to-have */ }
  }

  function showPushNotification(notification) {
    if (!pushEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      // eslint-disable-next-line no-new
      new Notification(notification.title || 'New notification', { body: notification.body || '', tag: notification.id })
    } catch (e) { /* some mobile browsers restrict this outside a service worker */ }
  }

  const enableSound = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      audioCtxRef.current = new Ctx()
    }
    audioCtxRef.current.resume?.()
    localStorage.setItem(SOUND_PREF_KEY, 'true')
    setSoundEnabled(true)
  }, [])

  const enablePush = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      alert('Your browser does not support notifications.')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      localStorage.setItem(PUSH_PREF_KEY, 'true')
      setPushEnabled(true)
      new Notification('Notifications enabled', { body: 'You will now see alerts on this device.' })
    } else {
      alert('Notification permission was not granted. You can enable it in your browser settings.')
    }
  }, [])

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }, [notifications])

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, soundEnabled, enableSound, pushEnabled, enablePush, markAsRead, markAllAsRead, refetch: fetchNotifications,
    }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
        }
