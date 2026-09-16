import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { getMonthlyStats, monthLabel, formatMoney } from "./data";
import { MonthPicker } from "./month-picker";
import { CARD, EYEBROW } from "@/lib/ui";
import { IconChart, IconDollar } from "@/lib/icons";

export default async function EstadisticasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { tenant } = await params;
  const { month: monthParam } = await searchParams;
  const { barbershop, canManage } = await getTenantContext(tenant);

  if (!canManage) {
    return (
      <div className={`${CARD} px-4 py-6 text-sm text-neutral-500`}>
        No tienes acceso a esta sección.
      </div>
    );
  }

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: barbershop.timezone }));
  const [defaultYear, defaultMonth] = [now.getFullYear(), now.getMonth() + 1];
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [defaultYear, defaultMonth];

  const stats = await getMonthlyStats(tenant, year, month);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e9] text-[#9d7837]">
            <IconChart />
          </span>
          <div>
            <p className={EYEBROW}>Negocio</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Estadísticas</h1>
            <p className="mt-1 text-sm text-neutral-500">Cómo le fue a {stats.barbershopName} en {monthLabel(month, year)}.</p>
          </div>
        </div>
        <MonthPicker tenant={tenant} year={year} month={month} />
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/dashboard/${tenant}/estadisticas/export/csv?month=${year}-${String(month).padStart(2, "0")}`}
          className="rounded-xl border border-[#e7e3da] bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-[#c7a15a] hover:bg-[#fffaf0]"
        >
          Exportar Excel
        </a>
        <a
          href={`/dashboard/${tenant}/estadisticas/export/pdf?month=${year}-${String(month).padStart(2, "0")}`}
          className="rounded-xl border border-[#e7e3da] bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-[#c7a15a] hover:bg-[#fffaf0]"
        >
          Exportar PDF
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${CARD} flex items-center justify-between border-[#171717] bg-[#171717] p-5 text-white`}>
          <div>
            <p className="text-xs text-white/55">Ingresos del mes</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{formatMoney(stats.totalRevenueCents)}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#e2c17f]">
            <IconDollar />
          </span>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-xs text-neutral-500">Citas completadas</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">{stats.completedCount}</p>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-xs text-neutral-500">Ticket promedio</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">{formatMoney(stats.avgTicketCents)}</p>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-xs text-neutral-500">Canceladas / no llegó</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">{stats.cancelledCount}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankingCard title="Servicios más vendidos" empty="Sin servicios completados este mes.">
          {stats.topServices.map((s) => (
            <RankingRow key={s.name} name={s.name} detail={`${s.count} citas`} value={formatMoney(s.revenueCents)} />
          ))}
        </RankingCard>

        <RankingCard title="Barberos con más citas" empty="Sin citas completadas este mes.">
          {stats.topBarbers.map((b) => (
            <RankingRow key={b.name} name={b.name} detail={`${b.count} citas`} value={formatMoney(b.revenueCents)} />
          ))}
        </RankingCard>

        <RankingCard title="Clientes que más gastaron" empty="Sin pagos registrados este mes.">
          {stats.topClients.map((c) => (
            <RankingRow key={c.name} name={c.name} value={formatMoney(c.spentCents)} />
          ))}
        </RankingCard>
      </div>
    </div>
  );
}

function RankingCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className={`${CARD} p-5`}>
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <div className="mt-3 space-y-1">
        {hasChildren ? children : <p className="text-sm text-neutral-500">{empty}</p>}
      </div>
    </div>
  );
}

function RankingRow({ name, detail, value }: { name: string; detail?: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#f1eee7] py-2.5 text-sm first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-neutral-900">{name}</p>
        {detail && <p className="text-xs text-neutral-500">{detail}</p>}
      </div>
      <span className="shrink-0 font-semibold text-neutral-900">{value}</span>
    </div>
  );
}
