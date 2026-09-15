"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function recordPayment(
  tenant: string,
  input: {
    appointmentId?: string;
    clientId?: string;
    amountCents: number;
    method: "cash" | "transfer";
    reference?: string;
    notes?: string;
  },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  let clientId = input.clientId || null;
  if (!clientId && input.appointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("id", input.appointmentId)
      .single();
    clientId = appointment?.client_id ?? null;
  }

  const { error } = await supabase.from("payments").insert({
    tenant_id: barbershop.id,
    appointment_id: input.appointmentId || null,
    client_id: clientId,
    amount_cents: input.amountCents,
    method: input.method,
    reference: input.reference || null,
    notes: input.notes || null,
    status: "recorded",
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/finanzas`);
  revalidatePath(`/dashboard/${tenant}`);
  return { ok: true as const };
}

// Financial records are append-only: voiding creates no destructive delete, it just
// flips status so the original entry stays in the audit trail.
export async function voidPayment(tenant: string, paymentId: string) {
  const { supabase, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase
    .from("payments")
    .update({ status: "voided" })
    .eq("id", paymentId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/finanzas`);
  revalidatePath(`/dashboard/${tenant}`);
  return { ok: true as const };
}
