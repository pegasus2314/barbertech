import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  rejected: "Rechazada",
  no_show: "No se presentó",
};

export default async function TenantDashboardHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop } = await getTenantContext(tenant);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [{ data: todaysAppointments }, { data: todaysPayments }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, clients(full_name), services(name), barbers(display_name)")
      .eq("tenant_id", barbershop.id)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("tenant_id", barbershop.id)
      .eq("status", "recorded")
      .gte("created_at", todayStart.toISOString()),
  ]);

  const pendingCount = (todaysAppointments ?? []).filter((a) => a.status === "pending").length;
  const completedCount = (todaysAppointments ?? []).filter((a) => a.status === "completed").length;
  const todayRevenue = (todaysPayments ?? []).reduce((sum, p) => sum + p.amount_cents, 0);

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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Citas hoy" value={todaysAppointments?.length ?? 0} />
        <StatCard label="Pendientes" value={pendingCount} />
        <StatCard label="Completadas hoy" value={completedCount} />
        <StatCard label="Ingresos hoy" value={formatMoney(todayRevenue)} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Próximas citas de hoy</h2>
          <Link
            href={`/dashboard/${tenant}/citas`}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            Ver todas →
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {(todaysAppointments ?? []).slice(0, 5).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm"
            >
              <div>
                <p className="font-medium text-neutral-900">
                  {a.clients?.full_name ?? "Cliente"} · {a.services?.name}
                </p>
                <p className="text-xs text-neutral-500">con {a.barbers?.display_name}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-700">
                  {new Date(a.starts_at).toLocaleTimeString("es-DO", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: barbershop.timezone,
                  })}
                </p>
                <p className="text-xs text-neutral-400">{STATUS_LABELS[a.status] ?? a.status}</p>
              </div>
            </div>
          ))}
          {(todaysAppointments ?? []).length === 0 && (
            <p className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
              No hay citas hoy.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Acciones rápidas</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickAction href={`/dashboard/${tenant}/citas`} label="Nueva cita" />
          <QuickAction href={`/dashboard/${tenant}/clientes`} label="Nuevo cliente" />
          <QuickAction href={`/dashboard/${tenant}/servicios`} label="Nuevo servicio" />
          <QuickAction href={`/dashboard/${tenant}/barberos`} label="Nuevo barbero" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
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
