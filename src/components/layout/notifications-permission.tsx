"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import {
  getWebPermission,
  requestWebPermission,
  showSystemNotification,
  subscribeWebPermission,
} from "@/lib/web-notifications";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "mf-notification-prompt-dismissed";

/**
 * Aviso descartable que pide activar las notificaciones del sistema.
 * Solo aparece si el navegador las soporta y aún no se ha decidido.
 */
export function NotificationsPermissionPrompt() {
  const permission = useSyncExternalStore(
    subscribeWebPermission,
    getWebPermission,
    () => "unsupported" as const
  );
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [asking, setAsking] = useState(false);

  if (permission !== "default" || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function allow() {
    setAsking(true);
    try {
      const result = await requestWebPermission();
      if (result === "granted") {
        toast.success("Notificaciones activadas.");
        showSystemNotification("¡Listo! 🎉", {
          body: "Así verás los avisos de deudas y pagos de tus grupos.",
        });
      } else if (result === "denied") {
        toast.message(
          "Permiso denegado. Puedes activarlo desde los ajustes del navegador."
        );
      }
      // En cualquier caso dejamos de insistir
      localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="animate-pop-in fixed right-4 bottom-20 z-40 w-[calc(100%-2rem)] max-w-sm rounded-2xl border bg-card p-4 shadow-lg md:bottom-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <BellRing className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">¿Activamos las notificaciones?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Te avisaremos cuando alguien registre un gasto compartido o pague una
            deuda, aunque no tengas la app abierta en pantalla.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={allow} disabled={asking}>
              {asking ? "Pidiendo permiso…" : "Permitir"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={asking}>
              Ahora no
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label="Cerrar"
          onClick={dismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
