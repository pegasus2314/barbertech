"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from "./notifications/actions";

type Notification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationBell({
  tenant,
  tenantId,
  variant = "light",
}: {
  tenant: string;
  tenantId: string;
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [pushState, setPushState] = useState<"unknown" | "unsupported" | "off" | "on">(() =>
    typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)
      ? "unsupported"
      : "unknown",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase
      .from("notifications")
      .select("id, title, body, is_read, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setItems(data ?? []));

    // The realtime connection needs the user's own JWT (not just the anon
    // key) so its RLS check on `notifications` — is_member_of(tenant_id) —
    // evaluates auth.uid() correctly. createBrowserClient doesn't sync this
    // to the realtime socket automatically, so without this, every insert
    // gets silently filtered out and .subscribe() reports SUBSCRIBED anyway.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`notifications:${tenantId}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `tenant_id=eq.${tenantId}` },
          (payload) => {
            setItems((prev) => [payload.new as Notification, ...prev].slice(0, 20));
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId]);

  useEffect(() => {
    if (pushState === "unsupported") return;
    navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
      if (!reg) {
        setPushState("off");
        return;
      }
      reg.pushManager.getSubscription().then((sub) => setPushState(sub ? "on" : "off"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleItemClick(n: Notification) {
    if (!n.is_read) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
      await markNotificationRead(tenant, n.id);
    }
    router.push(`/dashboard/${tenant}/citas`);
    setOpen(false);
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    await markAllNotificationsRead(tenant);
  }

  async function handleEnablePush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const json = subscription.toJSON();
      await savePushSubscription(tenant, {
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setPushState("on");
    } catch {
      setPushState("off");
    }
  }

  const iconColor = variant === "dark" ? "text-white/70 hover:text-white" : "text-neutral-600 hover:text-neutral-900";

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition ${iconColor} ${variant === "dark" ? "hover:bg-white/10" : "hover:bg-black/5"}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c7a15a] px-1 text-[10px] font-bold text-[#171717]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-11 z-30 w-80 rounded-2xl border border-[#e7e3da] bg-white shadow-[0_16px_40px_rgba(23,23,23,0.12)] ${
            variant === "dark" ? "left-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#e7e3da] px-4 py-3">
            <p className="text-sm font-bold text-neutral-900">Notificaciones</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d]">
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">No hay notificaciones todavía.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`block w-full border-b border-[#f0ede6] px-4 py-3 text-left transition last:border-0 hover:bg-[#f7f6f2] ${!n.is_read ? "bg-[#fffaf0]" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c7a15a]" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">{n.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{n.body}</p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      {new Date(n.created_at).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {pushState === "off" && (
            <button
              onClick={handleEnablePush}
              className="block w-full rounded-b-2xl border-t border-[#e7e3da] bg-[#f7f6f2] px-4 py-3 text-left text-xs font-semibold text-[#9d7837] hover:bg-[#fff8e9]"
            >
              🔔 Activar notificaciones en este dispositivo
            </button>
          )}
          {pushState === "on" && (
            <p className="rounded-b-2xl border-t border-[#e7e3da] bg-[#f7f6f2] px-4 py-2.5 text-center text-[11px] text-neutral-400">
              Notificaciones activas en este dispositivo
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
