import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LookupForm } from "./lookup-form";

export default async function MiCitaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("id, name, slug, timezone")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!barbershop) notFound();

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <p className="text-sm text-neutral-500">{barbershop.name}</p>
          <h1 className="text-xl font-semibold text-neutral-900">Consultar mi cita</h1>
        </div>
        <LookupForm tenantId={barbershop.id} timezone={barbershop.timezone} />
      </div>
    </div>
  );
}
