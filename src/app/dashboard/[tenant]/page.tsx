import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { zonedDayBounds, timeOfDayGreeting } from "@/lib/timezone";

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

  const { start: todayStart, end: todayEnd } = zonedDayBounds(barbershop.timezone);
  const greeting = timeOfDayGreeting(barbershop.timezone);

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
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9d7837]">Panel de control</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{greeting} 👋</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Aquí tienes una vista rápida de lo que ocurre hoy en {barbershop.name}.
          </p>
        </div>
        <Link
          href={`/dashboard/${tenant}/citas`}
          className="inline-flex items-center justify-center rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
        >
          + Nueva cita
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citas hoy" value={todaysAppointments?.length ?? 0} accent="gold" />
        <StatCard label="Pendientes" value={pendingCount} />
        <StatCard label="Completadas" value={completedCount} />
        <StatCard label="Ingresos de hoy" value={formatMoney(todayRevenue)} accent="dark" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="overflow-hidden rounded-2xl border border-[#e7e3da] bg-white shadow-[0_8px_30px_rgba(23,23,23,0.04)]">
          <div className="flex items-center justify-between border-b border-[#eeeae2] px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-neutral-950">Agenda de hoy</h2>
              <p className="mt-1 text-xs text-neutral-500">Tus próximas citas y su estado.</p>
            </div>
            <Link href={`/dashboard/${tenant}/citas`} className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d]">
              Ver agenda →
            </Link>
          </div>
          <div className="divide-y divide-[#eeeae2]">
            {(todaysAppointments ?? []).slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f7f6f2] text-xs font-semibold text-neutral-700">
                  {new Date(a.starts_at).toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit", timeZone: barbershop.timezone })}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{a.clients?.full_name ?? "Cliente"}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">{a.services?.name} · {a.barbers?.display_name}</p>
                </div>
                <StatusBadge status={a.status} label={STATUS_LABELS[a.status] ?? a.status} />
              </div>
            ))}
            {(todaysAppointments ?? []).length === 0 && (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f6f2] text-xl">◷</div>
                <p className="mt-3 text-sm font-medium text-neutral-900">No hay citas hoy</p>
                <p className="mt-1 text-xs text-neutral-500">Tu agenda está libre por ahora.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-[#171717] p-6 text-white shadow-[0_12px_35px_rgba(23,23,23,0.14)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c7a15a] text-[#171717]">✦</div>
            <h2 className="mt-5 text-lg font-semibold">Tu barbería</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {barbershop.is_published ? "Tu perfil público está activo y listo para recibir reservas." : "Completa la configuración para publicar tu barbería."}
            </p>
            <Link
              href={`/dashboard/${tenant}/configuracion`}
              className="mt-5 inline-flex rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
            >
              {barbershop.is_published ? "Editar perfil" : "Configurar ahora"}
            </Link>
          </div>

          <div className="rounded-2xl border border-[#e7e3da] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Acciones rápidas</p>
            <div className="mt-4 grid gap-2">
              <QuickAction href={`/dashboard/${tenant}/clientes`} label="Añadir cliente" />
              <QuickAction href={`/dashboard/${tenant}/servicios`} label="Nuevo servicio" />
              <QuickAction href={`/dashboard/${tenant}/barberos`} label="Añadir barbero" />
              <QuickAction href={`/dashboard/${tenant}/horarios`} label="Editar horarios" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: "gold" | "dark" }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-[0_6px_24px_rgba(23,23,23,0.035)] ${accent === "dark" ? "border-[#171717] bg-[#171717] text-white" : accent === "gold" ? "border-[#d7c08c] bg-[#fffaf0]" : "border-[#e7e3da] bg-white"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-medium ${accent === "dark" ? "text-white/55" : "text-neutral-500"}`}>{label}</p>
        <span className={`h-2 w-2 rounded-full ${accent === "gold" ? "bg-[#c7a15a]" : accent === "dark" ? "bg-[#c7a15a]" : "bg-neutral-200"}`} />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles = status === "completed" ? "bg-emerald-50 text-emerald-700" : status === "pending" ? "bg-amber-50 text-amber-700" : status === "cancelled" || status === "rejected" ? "bg-red-50 text-red-600" : "bg-neutral-100 text-neutral-600";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles}`}>{label}</span>;
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-[#eeeae2] px-3.5 py-3 text-sm font-medium text-neutral-700 transition hover:border-[#c7a15a] hover:bg-[#fffaf0] hover:text-neutral-950">
      <span>{label}</span><span className="text-neutral-300">→</span>
    </Link>
  );
}
