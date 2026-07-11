"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  const [webPermission, setWebPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
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

          if (
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            const webNotification = new Notification(notification.title, {
              body: notification.body ?? undefined,
              icon: "/icon.png",
            });
            webNotification.onclick = () => {
              window.focus();
              const groupId = notification.data?.group_id;
              if (typeof groupId === "string") {
                window.location.href = `/compartidos/${groupId}`;
              }
            };
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
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setWebPermission(permission);
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && markAllRead()}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
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
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No tienes notificaciones.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="border-b px-2 py-2 text-sm last:border-0">
                <p className="font-medium">{n.title}</p>
                {n.body && (
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
