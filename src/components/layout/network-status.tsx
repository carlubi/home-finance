"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Mensaje no intrusivo para operaciones que requieren conexión al servidor. */
export function NetworkStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full bg-foreground px-3 py-2 text-sm font-medium text-background shadow-lg"
    >
      <WifiOff className="size-4 shrink-0" />
      Sin conexión. Necesitas internet para actualizar tus datos.
    </div>
  );
}
