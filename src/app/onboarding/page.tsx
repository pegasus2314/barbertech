// Flujo de onboarding — desarrollado por Albert Silvestre
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("tenant_id, barbershops(slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    const barbershop = existingMembership.barbershops as unknown as { slug: string } | null;
    if (barbershop?.slug) {
      redirect(`/dashboard/${barbershop.slug}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#171717] hover:opacity-70"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171717] text-xs font-black text-[#f5d89a]">
              B
            </span>
            BarberTech
          </Link>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
