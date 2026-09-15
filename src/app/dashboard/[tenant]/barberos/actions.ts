"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function createBarber(
  tenant: string,
  input: { displayName: string; serviceIds: string[] },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { data: barber, error } = await supabase
    .from("barbers")
    .insert({ tenant_id: barbershop.id, display_name: input.displayName })
    .select("id")
    .single();

  if (error || !barber) {
    return { ok: false as const, error: error?.message ?? "No se pudo crear el barbero." };
  }

  if (input.serviceIds.length > 0) {
    const links = input.serviceIds.map((serviceId) => ({
      tenant_id: barbershop.id,
      barber_id: barber.id,
      service_id: serviceId,
    }));
    const { error: linkError } = await supabase.from("barber_services").insert(links);
    if (linkError) return { ok: false as const, error: linkError.message };
  }

  revalidatePath(`/dashboard/${tenant}/barberos`);
  return { ok: true as const };
}

export async function toggleBarberActive(tenant: string, barberId: string, isActive: boolean) {
  const { supabase, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase
    .from("barbers")
    .update({ is_active: isActive })
    .eq("id", barberId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/barberos`);
  return { ok: true as const };
}

export async function setBarberServices(tenant: string, barberId: string, serviceIds: string[]) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error: deleteError } = await supabase
    .from("barber_services")
    .delete()
    .eq("barber_id", barberId);
  if (deleteError) return { ok: false as const, error: deleteError.message };

  if (serviceIds.length > 0) {
    const links = serviceIds.map((serviceId) => ({
      tenant_id: barbershop.id,
      barber_id: barberId,
      service_id: serviceId,
    }));
    const { error: insertError } = await supabase.from("barber_services").insert(links);
    if (insertError) return { ok: false as const, error: insertError.message };
  }

  revalidatePath(`/dashboard/${tenant}/barberos`);
  return { ok: true as const };
}
