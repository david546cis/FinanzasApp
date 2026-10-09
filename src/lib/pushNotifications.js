
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function convertirClavePublica(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalizada = (base64 + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  return Uint8Array.from(
    atob(normalizada),
    (caracter) => caracter.charCodeAt(0)
  )
}

export async function activarNotificacionesPush() {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    throw new Error('Este dispositivo no admite notificaciones push.')
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Falta configurar la clave pública VAPID.')
  }

  const { data: { user }, error: errorUsuario } =
    await supabase.auth.getUser()

  if (errorUsuario || !user) {
    throw new Error('Inicia sesión para activar las notificaciones.')
  }

  const permiso = await Notification.requestPermission()

  if (permiso !== 'granted') {
    throw new Error('No se concedió permiso para mostrar notificaciones.')
  }

  const registro = await navigator.serviceWorker.ready
  let suscripcion = await registro.pushManager.getSubscription()

  if (suscripcion) {
    const claveActual = suscripcion.options.applicationServerKey
    const claveEsperada = convertirClavePublica(VAPID_PUBLIC_KEY)

    const coincide = claveActual &&
      new Uint8Array(claveActual).length === claveEsperada.length &&
      new Uint8Array(claveActual).every(
        (valor, indice) => valor === claveEsperada[indice]
      )

    if (!coincide) {
      await suscripcion.unsubscribe()
      suscripcion = null
    }
  }

  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertirClavePublica(VAPID_PUBLIC_KEY),
    })
  }

  const datos = suscripcion.toJSON()

  const { error } = await supabase
    .from('push_suscripciones')
    .upsert({
      user_id: user.id,
      endpoint: suscripcion.endpoint,
      p256dh: datos.keys.p256dh,
      auth: datos.keys.auth,
      actualizado_en: new Date().toISOString(),
    }, {
      onConflict: 'endpoint',
    })

  if (error) {
    throw new Error(
      `No se pudo registrar el dispositivo: ${error.message}`
    )
  }

  return true
}

export async function desactivarNotificacionesPush() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registro = await navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()

  if (!suscripcion) {
    return
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Debes iniciar sesión para desactivar las notificaciones.')
  }

  const { error } = await supabase
    .from('push_suscripciones')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', suscripcion.endpoint)

  if (error) {
    throw new Error(`No se pudo eliminar el registro: ${error.message}`)
  }

  await suscripcion.unsubscribe()
}
export async function consultarEstadoPush() {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false
  }

  const { data: { user }, error: errorUsuario } =
    await supabase.auth.getUser()

  if (errorUsuario || !user) return false

  const registro = await navigator.serviceWorker.ready
  const suscripcion = await registro.pushManager.getSubscription()

  if (!suscripcion) return false

  const { data, error } = await supabase
    .from('push_suscripciones')
    .select('id')
    .eq('user_id', user.id)
    .eq('endpoint', suscripcion.endpoint)
    .maybeSingle()

  if (error) throw error

  return Boolean(data)
}