"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function updateBusinessHours(
  tenant: string,
  hours: { weekday: number; openTime: string | null; closeTime: string | null; isClosed: boolean }[],
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const rows = hours.map((h) => ({
    tenant_id: barbershop.id,
    weekday: h.weekday,
    open_time: h.isClosed ? null : h.openTime,
    close_time: h.isClosed ? null : h.closeTime,
    is_closed: h.isClosed,
  }));

  const { error } = await supabase
    .from("business_hours")
    .upsert(rows, { onConflict: "tenant_id,weekday" });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/horarios`);
  return { ok: true as const };
}
