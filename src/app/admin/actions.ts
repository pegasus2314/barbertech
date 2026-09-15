"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";

export async function setBarbershopStatus(tenantId: string, status: string) {
  const { supabase, user } = await requirePlatformAdmin();

  const { error } = await supabase.from("barbershops").update({ status }).eq("id", tenantId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("audit_log").insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: status === "suspended" ? "suspended_tenant" : "reactivated_tenant",
    entity_type: "barbershop",
    entity_id: tenantId,
    metadata: { status },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/${tenantId}`);
  return { ok: true as const };
}

export async function changePlan(tenantId: string, planId: string) {
  const { supabase } = await requirePlatformAdmin();

  const { error } = await supabase.from("barbershops").update({ plan_id: planId }).eq("id", tenantId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from("subscriptions").update({ plan_id: planId }).eq("tenant_id", tenantId);

  revalidatePath("/admin");
  revalidatePath(`/admin/${tenantId}`);
  return { ok: true as const };
}

export async function confirmSubscriptionPayment(paymentId: string, tenantId: string, subscriptionId: string) {
  const { supabase, user } = await requirePlatformAdmin();

  const { error } = await supabase
    .from("subscription_payments")
    .update({ status: "confirmed", confirmed_by: user.id, confirmed_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) return { ok: false as const, error: error.message };

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .eq("id", subscriptionId);

  await supabase
    .from("barbershops")
    .update({ status: "active" })
    .eq("id", tenantId);

  await supabase.from("audit_log").insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: "confirmed_payment",
    entity_type: "subscription_payment",
    entity_id: paymentId,
  });

  revalidatePath("/admin");
  return { ok: true as const };
}

export async function rejectSubscriptionPayment(paymentId: string, tenantId: string) {
  const { supabase, user } = await requirePlatformAdmin();

  const { error } = await supabase
    .from("subscription_payments")
    .update({ status: "rejected", confirmed_by: user.id, confirmed_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("audit_log").insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: "rejected_payment",
    entity_type: "subscription_payment",
    entity_id: paymentId,
  });

  revalidatePath("/admin");
  return { ok: true as const };
}
