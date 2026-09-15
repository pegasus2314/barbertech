"use server";

import { requireUser } from "@/lib/auth/require-user";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createBarbershop(name: string): Promise<ActionResult<{ tenantId: string; slug: string }>> {
  const { supabase } = await requireUser();

  const baseSlug = slugify(name);
  if (!baseSlug) {
    return { ok: false, error: "El nombre debe contener al menos una letra o número." };
  }

  // Barbershop + owner membership + default business hours are created atomically
  // server-side (see migration 018): a freshly inserted barbershop has no membership
  // yet, so it can't satisfy its own SELECT-visibility policies if done as separate
  // client-driven inserts with RETURNING.
  const { data, error } = await supabase.rpc("create_barbershop_with_owner", {
    p_name: name,
    p_base_slug: baseSlug,
  });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear la barbería." };
  }

  const result = data as unknown as { id: string; slug: string };
  return { ok: true, data: { tenantId: result.id, slug: result.slug } };
}

export async function addService(
  tenantId: string,
  input: { name: string; priceCents: number; durationMinutes: number },
): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("services")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      price_cents: input.priceCents,
      duration_minutes: input.durationMinutes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear el servicio." };
  }

  return { ok: true, data: { id: data.id } };
}

export async function addBarber(
  tenantId: string,
  input: { displayName: string; serviceIds: string[] },
): Promise<ActionResult<{ id: string }>> {
  const { supabase } = await requireUser();

  const { data: barber, error } = await supabase
    .from("barbers")
    .insert({ tenant_id: tenantId, display_name: input.displayName })
    .select("id")
    .single();

  if (error || !barber) {
    return { ok: false, error: error?.message ?? "No se pudo crear el barbero." };
  }

  if (input.serviceIds.length > 0) {
    const links = input.serviceIds.map((serviceId) => ({
      tenant_id: tenantId,
      barber_id: barber.id,
      service_id: serviceId,
    }));
    const { error: linkError } = await supabase.from("barber_services").insert(links);
    if (linkError) {
      return { ok: false, error: linkError.message };
    }
  }

  return { ok: true, data: { id: barber.id } };
}

export async function publishBarbershop(tenantId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const [{ count: serviceCount }, { count: barberCount }] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    supabase
      .from("barbers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  if (!serviceCount || !barberCount) {
    return {
      ok: false,
      error: "Necesitas al menos un servicio y un barbero activos antes de publicar.",
    };
  }

  const { error } = await supabase
    .from("barbershops")
    .update({ is_published: true })
    .eq("id", tenantId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: undefined };
}
