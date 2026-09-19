"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";

export async function createBarber(
  tenant: string,
  input: { displayName: string; serviceIds: string[] },
) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { data: barber, error } = await supabase
    .from("barbers")
    .insert({ tenant_id: barbershop.id, display_name: input.displayName.trim() })
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

export async function inviteBarber(
  tenant: string,
  input: { email: string; displayName: string; serviceIds: string[] },
) {
  const { barbershop, user, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!email || !displayName) {
    return { ok: false as const, error: "Completa el correo y el nombre." };
  }

  const admin = createAdminClient();

  // Send the invite first — if this fails (e.g. that email already has an
  // account) we don't want a dangling barber_invites row nothing will ever
  // pick up.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/invite/accept`,
    data: { invited_barbershop_name: barbershop.name },
  });

  if (inviteError) {
    const alreadyExists = /already.*regist/i.test(inviteError.message);
    return {
      ok: false as const,
      error: alreadyExists
        ? "Ese correo ya tiene una cuenta en BarberTech — pídele que inicie sesión directamente en vez de invitarlo."
        : inviteError.message,
    };
  }

  const { error: inviteRowError } = await admin.from("barber_invites").insert({
    tenant_id: barbershop.id,
    email,
    display_name: displayName,
    service_ids: input.serviceIds,
    invited_by: user.id,
  });
  if (inviteRowError) return { ok: false as const, error: inviteRowError.message };

  revalidatePath(`/dashboard/${tenant}/barberos`);
  return { ok: true as const };
}

// Sends the invite email again. If the person already has an account (they
// opened the first link, or registered on their own) a fresh "invite" is
// rejected by Supabase, so fall back to a recovery email that lands on the
// same /invite/accept page and lets them set a password and join.
export async function resendInvite(tenant: string, inviteId: string) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { data: invite } = await supabase
    .from("barber_invites")
    .select("email, status")
    .eq("id", inviteId)
    .eq("tenant_id", barbershop.id)
    .maybeSingle();
  if (!invite || invite.status !== "pending") {
    return { ok: false as const, error: "Esa invitación ya no está pendiente." };
  }

  const admin = createAdminClient();
  const redirectTo = `${siteUrl()}/invite/accept`;

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(invite.email, {
    redirectTo,
    data: { invited_barbershop_name: barbershop.name },
  });

  if (inviteError) {
    if (!/already.*regist/i.test(inviteError.message)) {
      return { ok: false as const, error: friendlyEmailError(inviteError.message) };
    }

    const { error: recoverError } = await admin.auth.resetPasswordForEmail(invite.email, { redirectTo });
    if (recoverError) return { ok: false as const, error: friendlyEmailError(recoverError.message) };
  }

  return { ok: true as const };
}

export async function cancelInvite(tenant: string, inviteId: string) {
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);
  if (!canManage) return { ok: false as const, error: "No tienes permiso para hacer esto." };

  const { error } = await supabase
    .from("barber_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("tenant_id", barbershop.id)
    .eq("status", "pending");
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/${tenant}/barberos`);
  return { ok: true as const };
}

function friendlyEmailError(message: string) {
  return /rate limit|too many|security purposes/i.test(message)
    ? "Se enviaron muchos correos seguidos. Espera unos minutos e intenta de nuevo."
    : message;
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
