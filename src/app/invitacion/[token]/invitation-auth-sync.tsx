"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function InvitationAuthSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function syncInviteSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session) {
        return;
      }

      const key = `invite-session-synced:${window.location.pathname}`;
      if (sessionStorage.getItem(key)) {
        return;
      }

      sessionStorage.setItem(key, "1");
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      router.refresh();
    }

    void syncInviteSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
