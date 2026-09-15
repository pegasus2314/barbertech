"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function updateClientNotes(tenant: string, clientId: string, notes: string) {
  const { supabase, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase.from("clients").update({ notes }).eq("id", clientId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/clientes`);
  return { ok: true as const };
}

export async function createClient(
  tenant: string,
  input: { fullName: string; phone: string; email?: string; notes?: string },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase.from("clients").insert({
    tenant_id: barbershop.id,
    full_name: input.fullName,
    phone: input.phone,
    email: input.email || null,
    notes: input.notes || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/clientes`);
  return { ok: true as const };
}
