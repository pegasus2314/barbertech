import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWizard } from "./wizard";

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("id, name, slug, timezone, whatsapp")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!barbershop) notFound();

  const [{ data: services }, { data: barbers }, { data: barberServices }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", barbershop.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("barbers")
      .select("id, display_name, photo_url")
      .eq("tenant_id", barbershop.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("barber_services")
      .select("barber_id, service_id")
      .eq("tenant_id", barbershop.id),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4 py-10">
      <div className="w-full max-w-lg">
        <Link href={`/${slug}`} className="text-sm text-neutral-400 hover:text-neutral-600">
          ← {barbershop.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">Reservar cita</h1>

        <div className="mt-6">
          <BookingWizard
            tenantId={barbershop.id}
            tenantSlug={barbershop.slug}
            timezone={barbershop.timezone}
            services={services ?? []}
            barbers={barbers ?? []}
            barberServices={barberServices ?? []}
          />
        </div>
      </div>
    </div>
  );
}
