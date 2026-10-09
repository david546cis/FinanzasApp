
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

// Mantener los archivos de la PWA disponibles sin conexión
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Activar nuevas versiones del Service Worker
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Recibir notificaciones push desde el servidor
self.addEventListener('push', (event) => {
  let datos = {}

  try {
    datos = event.data?.json() || {}
  } catch {
    datos = {
      title: 'FinanzasApp',
      body: event.data?.text() || 'Tienes una notificación nueva.',
    }
  }

  const titulo = datos.title || 'FinanzasApp'

  const opciones = {
    body: datos.body || 'Tienes un recordatorio pendiente.',
    icon: '/FinanzasApp/pwa-192x192.png',
    badge: '/FinanzasApp/pwa-192x192.png',
    tag: datos.tag || 'finanzas-notificacion',
    data: {
      url: datos.url || '/FinanzasApp/',
    },
  }

  event.waitUntil(
    self.registration.showNotification(titulo, opciones)
  )
})

// Abrir FinanzasApp al tocar la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = new URL(
    event.notification.data?.url || '/FinanzasApp/',
    self.location.origin
  )

  // Evitar redirecciones fuera de FinanzasApp
  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith('/FinanzasApp/')
  ) {
    return
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then(async (ventanas) => {
      for (const ventana of ventanas) {
        if (ventana.url === url.href && 'focus' in ventana) {
          return ventana.focus()
        }
      }

      return clients.openWindow(url.href)
    })
  )
})
