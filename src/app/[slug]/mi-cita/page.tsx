import Link from "next/link";
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          href={`/${slug}`}
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          ← {barbershop.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Consultar mi cita</h1>

        <div className="mt-6">
          <LookupForm tenantId={barbershop.id} timezone={barbershop.timezone} />
        </div>
      </div>
    </div>
  );
}
