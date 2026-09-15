import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

export default async function TenantDashboardHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop } = await getTenantContext(tenant);

  const [{ count: serviceCount }, { count: barberCount }] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", barbershop.id)
      .eq("is_active", true),
    supabase
      .from("barbers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", barbershop.id)
      .eq("is_active", true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Resumen</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {barbershop.is_published ? (
            <>
              Tu barbería está publicada en{" "}
              <span className="font-mono text-neutral-700">
                barbertech.app/{barbershop.slug}
              </span>
            </>
          ) : (
            "Tu barbería aún no está publicada."
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Servicios activos" value={serviceCount ?? 0} />
        <StatCard label="Barberos activos" value={barberCount ?? 0} />
        <StatCard label="Citas hoy" value="—" hint="Próximamente" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Acciones rápidas</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickAction href={`/dashboard/${tenant}/servicios`} label="Nuevo servicio" />
          <QuickAction href={`/dashboard/${tenant}/barberos`} label="Nuevo barbero" />
          <QuickAction href={`/dashboard/${tenant}/horarios`} label="Editar horarios" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
    >
      {label}
    </Link>
  );
}
