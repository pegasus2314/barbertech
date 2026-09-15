import { redirect } from "next/navigation";
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
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <span className="text-lg font-semibold tracking-tight text-neutral-900">
            BarberTech
          </span>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
