import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";

export default async function DashboardIndexPage() {
  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("barbershops(slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const barbershop = membership?.barbershops as unknown as { slug: string } | null;

  if (barbershop?.slug) {
    redirect(`/dashboard/${barbershop.slug}`);
  }

  redirect("/onboarding");
}
