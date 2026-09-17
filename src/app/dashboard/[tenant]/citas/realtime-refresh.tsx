"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Keeps the Citas list current without a manual reload: any insert/update/
// delete on this tenant's appointments (a new public booking, a status
// change from another device, a cancellation) triggers a router.refresh().
// Same realtime-auth pattern as the notification bell — see its comment for
// why supabase.realtime.setAuth() is required before subscribing.
export function CitasRealtimeRefresh({ tenantId }: { tenantId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`appointments:${tenantId}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments", filter: `tenant_id=eq.${tenantId}` },
          () => router.refresh(),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId, router]);

  return null;
}
