"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function updateAppointmentStatus(
  tenant: string,
  appointmentId: string,
  newStatus: string,
) {
  const { supabase } = await getTenantContext(tenant);

  const { error } = await supabase
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/citas`);
  revalidatePath(`/dashboard/${tenant}`);
  return { ok: true as const };
}

export async function getSlotsForManualBooking(
  tenant: string,
  barberId: string,
  serviceId: string,
  day: string,
) {
  const { supabase, barbershop } = await getTenantContext(tenant);

  const { data, error } = await supabase.rpc("get_available_slots", {
    p_tenant_id: barbershop.id,
    p_barber_id: barberId,
    p_service_id: serviceId,
    p_day: day,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, slots: (data ?? []).map((r) => r.slot_start) };
}

export async function createManualAppointment(
  tenant: string,
  input: {
    barberId: string;
    serviceId: string;
    startsAt: string;
    clientName: string;
    clientPhone: string;
    notes?: string;
  },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes, price_cents")
    .eq("id", input.serviceId)
    .single();

  if (!service) return { ok: false as const, error: "Servicio inválido." };

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60000);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .upsert(
      { tenant_id: barbershop.id, full_name: input.clientName, phone: input.clientPhone },
      { onConflict: "tenant_id,phone" },
    )
    .select("id")
    .single();

  if (clientError || !client) {
    return { ok: false as const, error: clientError?.message ?? "No se pudo guardar el cliente." };
  }

  const { error: apptError } = await supabase.from("appointments").insert({
    tenant_id: barbershop.id,
    client_id: client.id,
    barber_id: input.barberId,
    service_id: input.serviceId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    price_cents: service.price_cents,
    notes: input.notes || null,
    created_by: "owner",
    status: "confirmed",
  });

  if (apptError) return { ok: false as const, error: apptError.message };

  revalidatePath(`/dashboard/${tenant}/citas`);
  revalidatePath(`/dashboard/${tenant}`);
  return { ok: true as const };
}
