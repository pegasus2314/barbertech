"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function createService(
  tenant: string,
  input: { name: string; priceCents: number; durationMinutes: number; description?: string },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase.from("services").insert({
    tenant_id: barbershop.id,
    name: input.name.trim(),
    price_cents: input.priceCents,
    duration_minutes: input.durationMinutes,
    description: input.description?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/servicios`);
  return { ok: true as const };
}

export async function toggleServiceActive(tenant: string, serviceId: string, isActive: boolean) {
  const { supabase, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/servicios`);
  return { ok: true as const };
}
