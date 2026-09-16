"use server";

import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function markNotificationRead(tenant: string, notificationId: string) {
  const { supabase } = await getTenantContext(tenant);
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function markAllNotificationsRead(tenant: string) {
  const { supabase, barbershop } = await getTenantContext(tenant);
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("tenant_id", barbershop.id)
    .eq("is_read", false);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function savePushSubscription(
  tenant: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  const { supabase, user, barbershop } = await getTenantContext(tenant);
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      tenant_id: barbershop.id,
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function removePushSubscription(tenant: string, endpoint: string) {
  const { supabase } = await getTenantContext(tenant);
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
