import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";

const MANAGER_ROLES = ["owner", "manager"] as const;

// Resolves a barbershop by slug and verifies the signed-in user is an active
// member of it. RLS also enforces this at the database level; this check
// exists to give a proper 404/redirect instead of an empty result set.
export async function getTenantContext(slug: string) {
  const { supabase, user } = await requireUser();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!barbershop) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("tenant_id", barbershop.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  return {
    supabase,
    user,
    barbershop,
    role: membership.role as "owner" | "manager" | "barber" | "staff",
    canManage: MANAGER_ROLES.includes(membership.role as "owner" | "manager"),
  };
}
