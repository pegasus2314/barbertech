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

export async function createTimeBlock(
  tenant: string,
  input: {
    barberId: string | null;
    startsAtLocal: string;
    endsAtLocal: string;
    type: string;
    reason: string;
  },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  if (new Date(input.endsAtLocal) <= new Date(input.startsAtLocal)) {
    return { ok: false as const, error: "La hora de fin debe ser después del inicio." };
  }

  const { error } = await supabase.rpc("create_time_block", {
    p_tenant_id: barbershop.id,
    p_barber_id: input.barberId ?? undefined,
    p_starts_at_local: input.startsAtLocal,
    p_ends_at_local: input.endsAtLocal,
    p_type: input.type,
    p_reason: input.reason,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/horarios`);
  return { ok: true as const };
}

export async function deleteTimeBlock(tenant: string, blockId: string) {
  const { supabase, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase.from("time_blocks").delete().eq("id", blockId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/horarios`);
  return { ok: true as const };
}

export async function updateBarberHours(
  tenant: string,
  barberId: string,
  hours: { weekday: number; mode: "general" | "custom" | "off"; openTime: string; closeTime: string }[],
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const generalWeekdays = hours.filter((h) => h.mode === "general").map((h) => h.weekday);
  const overrideRows = hours
    .filter((h) => h.mode !== "general")
    .map((h) => ({
      tenant_id: barbershop.id,
      barber_id: barberId,
      weekday: h.weekday,
      open_time: h.mode === "off" ? null : h.openTime,
      close_time: h.mode === "off" ? null : h.closeTime,
      is_off: h.mode === "off",
    }));

  if (generalWeekdays.length > 0) {
    const { error: deleteError } = await supabase
      .from("barber_hours")
      .delete()
      .eq("barber_id", barberId)
      .in("weekday", generalWeekdays);
    if (deleteError) return { ok: false as const, error: deleteError.message };
  }

  if (overrideRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("barber_hours")
      .upsert(overrideRows, { onConflict: "barber_id,weekday" });
    if (upsertError) return { ok: false as const, error: upsertError.message };
  }

  revalidatePath(`/dashboard/${tenant}/horarios`);
  return { ok: true as const };
}
