// Utilidades de notificaciones del sistema (Web Notifications).
// El permiso se comparte entre componentes vía useSyncExternalStore.

export type WebPermission = NotificationPermission | "unsupported";

const PERMISSION_EVENT = "mf-notification-permission";

export function getWebPermission(): WebPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function subscribeWebPermission(callback: () => void) {
  window.addEventListener(PERMISSION_EVENT, callback);
  return () => window.removeEventListener(PERMISSION_EVENT, callback);
}

/** Pide el permiso al navegador (requiere gesto del usuario en Safari). */
export async function requestWebPermission(): Promise<WebPermission> {
  if (!("Notification" in window)) return "unsupported";
  const permission = await Notification.requestPermission();
  window.dispatchEvent(new Event(PERMISSION_EVENT));
  return permission;
}

/**
 * Muestra una notificación del sistema. Usa el service worker si está
 * disponible (obligatorio en Android; funciona también con la PWA instalada)
 * y cae al constructor Notification en escritorio.
 */
export async function showSystemNotification(
  title: string,
  options: { body?: string; url?: string } = {}
) {
  if (getWebPermission() !== "granted") return;

  const payload: NotificationOptions & { data: { url?: string } } = {
    body: options.body,
    icon: "/icon.png?v=2",
    badge: "/icon.png?v=2",
    data: { url: options.url },
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, payload);
      return;
    }
  } catch {
    // sin service worker: probamos el constructor
  }

  try {
    const notification = new Notification(title, payload);
    notification.onclick = () => {
      window.focus();
      if (options.url) window.location.href = options.url;
    };
  } catch {
    // Android sin SW: no hay más opciones
  }
}
