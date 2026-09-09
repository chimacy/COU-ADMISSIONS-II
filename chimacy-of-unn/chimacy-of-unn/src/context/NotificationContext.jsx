const showPushNotification = useCallback(
  async (notification) => {
    if (!pushEnabled) return

    if (typeof Notification === 'undefined') return

    if (Notification.permission !== 'granted') return

    try {
      /*
       * Full page to open when the notification is clicked.
       *
       * Change this route if your actual request detail route
       * is different.
       */
      const targetUrl = notification.request_id
        ? `/admin/requests/${notification.request_id}`
        : '/admin/requests'

      /*
       * Use the service worker when available.
       * This is much more reliable on mobile browsers.
       */
      if ('serviceWorker' in navigator) {
        const registration =
          await navigator.serviceWorker.ready

        await registration.showNotification(
          notification.title || 'COU Admission Service',
          {
            body:
              notification.body ||
              'You have a new notification.',

            icon: '/favicon.ico',
            badge: '/favicon.ico',

            tag: notification.id
              ? `notification-${notification.id}`
              : 'chimacy-notification',

            renotify: true,

            data: {
              url: targetUrl,
              notificationId: notification.id,
              requestId: notification.request_id || null,
            },
          }
        )

        return
      }

      /*
       * Fallback for browsers without Service Worker support.
       */
      const browserNotification = new Notification(
        notification.title || 'COU Admission Service',
        {
          body:
            notification.body ||
            'You have a new notification.',

          icon: '/favicon.ico',

          tag: notification.id
            ? `notification-${notification.id}`
            : 'chimacy-notification',

          data: {
            url: targetUrl,
          },
        }
      )

      browserNotification.onclick = () => {
        window.focus()

        window.location.href = targetUrl

        browserNotification.close()
      }
    } catch (error) {
      console.warn(
        'Unable to display notification:',
        error
      )
    }
  },
  [pushEnabled]
)
