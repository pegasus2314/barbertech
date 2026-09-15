"use server";

import { createClient } from "@/lib/supabase/server";

export type SlotsResult =
  | { ok: true; slots: string[] }
  | { ok: false; error: string };

export async function getAvailableSlots(
  tenantId: string,
  barberId: string,
  serviceId: string,
  day: string,
): Promise<SlotsResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_available_slots", {
    p_tenant_id: tenantId,
    p_barber_id: barberId,
    p_service_id: serviceId,
    p_day: day,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, slots: (data ?? []).map((row) => row.slot_start) };
}

export type BookingResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

export async function bookAppointment(input: {
  tenantId: string;
  barberId: string;
  serviceId: string;
  startsAt: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
}): Promise<BookingResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_public_appointment", {
    p_tenant_id: input.tenantId,
    p_barber_id: input.barberId,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_client_name: input.clientName,
    p_client_phone: input.clientPhone,
    p_client_email: input.clientEmail || undefined,
    p_notes: input.notes || undefined,
  });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "No se pudo crear la cita. Intenta con otro horario.",
    };
  }

  return { ok: true, appointmentId: data };
}

export type LookupResult =
  | {
      ok: true;
      appointments: {
        id: string;
        starts_at: string;
        ends_at: string;
        status: string;
        service_name: string;
        barber_name: string;
        price_cents: number;
      }[];
    }
  | { ok: false; error: string };

export async function lookupAppointments(tenantId: string, phone: string): Promise<LookupResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_client_appointments", {
    p_tenant_id: tenantId,
    p_phone: phone,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, appointments: data ?? [] };
}

export async function cancelAppointment(
  appointmentId: string,
  phone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("cancel_public_appointment", {
    p_appointment_id: appointmentId,
    p_phone: phone,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "No se pudo cancelar. Verifica el número y la cita." };
  }

  return { ok: true };
}
