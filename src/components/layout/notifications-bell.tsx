"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getWebPermission,
  requestWebPermission,
  showSystemNotification,
  subscribeWebPermission,
} from "@/lib/web-notifications";
import type { AppNotification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const webPermission = useSyncExternalStore(
    subscribeWebPermission,
    getWebPermission,
    () => "unsupported" as const
  );
  const unread = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setNotifications((data as AppNotification[]) ?? []));

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const notification = payload.new as AppNotification;
          setNotifications((current) => [notification, ...current].slice(0, 15));

          if (document.visibilityState !== "visible") {
            const groupId = notification.data?.group_id;
            showSystemNotification(notification.title, {
              body: notification.body ?? undefined,
              url:
                typeof groupId === "string"
                  ? `/compartidos/${groupId}`
                  : undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markAllRead() {
    if (unread === 0) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null);
    setNotifications((ns) => ns.map((n) => ({ ...n, read_at: n.read_at ?? now })));
  }

  async function enableWebNotifications() {
    await requestWebPermission();
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && markAllRead()}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent ring-2 ring-bg-primary" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {webPermission === "default" && (
          <>
            <div className="px-2 py-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={enableWebNotifications}
              >
                Activar avisos web
              </Button>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-text-secondary">
            No tienes notificaciones.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="border-b border-border-primary px-2 py-2.5 text-[13px] last:border-0">
                <p className="font-medium text-text-primary">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-text-secondary">{n.body}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
