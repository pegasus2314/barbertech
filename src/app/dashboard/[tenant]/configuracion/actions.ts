"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export async function updateProfile(
  tenant: string,
  input: {
    name: string;
    description: string;
    phone: string;
    whatsapp: string;
    address: string;
  },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase
    .from("barbershops")
    .update({
      name: input.name,
      description: input.description || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      address: input.address || null,
    })
    .eq("id", barbershop.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/configuracion`);
  revalidatePath(`/dashboard/${tenant}`);
  revalidatePath(`/${barbershop.slug}`);
  return { ok: true as const };
}

export async function togglePublish(tenant: string, publish: boolean) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  if (publish) {
    const [{ count: serviceCount }, { count: barberCount }] = await Promise.all([
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", barbershop.id)
        .eq("is_active", true),
      supabase
        .from("barbers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", barbershop.id)
        .eq("is_active", true),
    ]);
    if (!serviceCount || !barberCount) {
      return {
        ok: false as const,
        error: "Necesitas al menos un servicio y un barbero activos para publicar.",
      };
    }
  }

  const { error } = await supabase
    .from("barbershops")
    .update({ is_published: publish })
    .eq("id", barbershop.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/configuracion`);
  revalidatePath(`/dashboard/${tenant}`);
  revalidatePath(`/${barbershop.slug}`);
  return { ok: true as const };
}

export async function registerSubscriptionPayment(
  tenant: string,
  input: { amountCents: number; method: "cash" | "transfer"; reference?: string; notes?: string },
) {
  const { supabase, barbershop, user, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", barbershop.id)
    .maybeSingle();

  if (!subscription) return { ok: false as const, error: "No hay una suscripción activa para esta barbería." };

  const { error } = await supabase.from("subscription_payments").insert({
    tenant_id: barbershop.id,
    subscription_id: subscription.id,
    amount_cents: input.amountCents,
    method: input.method,
    reference: input.reference || null,
    notes: input.notes || null,
    created_by: user.id,
    status: "pending",
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/configuracion`);
  return { ok: true as const };
}

export async function deleteGalleryImage(tenant: string, imageId: string, storagePath: string) {
  const { supabase, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  await supabase.storage.from("barbershop-media").remove([storagePath]);
  const { error } = await supabase.from("gallery_images").delete().eq("id", imageId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/configuracion`);
  return { ok: true as const };
}
