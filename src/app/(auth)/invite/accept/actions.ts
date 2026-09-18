"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Never trust auth.updateUser()-editable user_metadata for authorization —
// the invited person can rewrite their own metadata. The only thing that
// actually proves "this specific email was invited to this tenant" is a
// matching row in barber_invites, created server-side when the owner sent
// the invite. Both actions here re-derive the email from the caller's own
// authenticated session, never from a client-supplied value.

export async function getPendingInvite() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "No hay sesión." };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("barber_invites")
    .select("id, display_name, barbershops(name)")
    .eq("email", user.email.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invite) return { ok: false as const, error: "No se encontró una invitación pendiente para este correo." };

  return {
    ok: true as const,
    displayName: invite.display_name,
    barbershopName: (invite.barbershops as unknown as { name: string } | null)?.name ?? "tu barbería",
  };
}

export async function acceptInvite() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "No hay sesión." };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("barber_invites")
    .select("*")
    .eq("email", user.email.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invite) return { ok: false as const, error: "No se encontró una invitación pendiente para este correo." };

  const { data: membership, error: membershipError } = await admin
    .from("memberships")
    .insert({ tenant_id: invite.tenant_id, user_id: user.id, role: "barber", status: "active" })
    .select("id")
    .single();
  if (membershipError || !membership) {
    return { ok: false as const, error: membershipError?.message ?? "No se pudo crear tu acceso." };
  }

  const { data: barber, error: barberError } = await admin
    .from("barbers")
    .insert({ tenant_id: invite.tenant_id, display_name: invite.display_name, membership_id: membership.id })
    .select("id")
    .single();
  if (barberError || !barber) {
    return { ok: false as const, error: barberError?.message ?? "No se pudo crear tu perfil de barbero." };
  }

  if (invite.service_ids.length > 0) {
    await admin.from("barber_services").insert(
      invite.service_ids.map((serviceId) => ({
        tenant_id: invite.tenant_id,
        barber_id: barber.id,
        service_id: serviceId,
      })),
    );
  }

  await admin.from("barber_invites").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id);

  const { data: barbershop } = await admin.from("barbershops").select("slug").eq("id", invite.tenant_id).single();

  return { ok: true as const, slug: barbershop?.slug ?? null };
}
