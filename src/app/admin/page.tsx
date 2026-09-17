import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { PaymentActions } from "./[tenant]/payment-actions";
import { CARD, INPUT, EYEBROW } from "@/lib/ui";
import { IconStore, IconClock, IconCheck, IconDollar, IconSearch } from "@/lib/icons";

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-blue-50 text-blue-700",
  active: "bg-emerald-50 text-emerald-700",
  past_due: "bg-amber-50 text-amber-700",
  grace: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  trial: "Prueba",
  active: "Activa",
  past_due: "Vencida",
  grace: "En gracia",
  suspended: "Suspendida",
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 });
}

type AdminBarbershop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_published: boolean;
  created_at: string;
  plan_id: string | null;
  plan_name: string | null;
  plan_price_cents: number | null;
};

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requirePlatformAdmin();
  const { q } = await searchParams;

  const [{ data: barbershopsData }, { count: pendingCount }, { data: pendingPayments }] = await Promise.all([
    supabase.rpc("admin_search_barbershops", { search: q ?? undefined }),
    supabase.from("subscription_payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("subscription_payments")
      .select("id, amount_cents, method, created_at, tenant_id, subscription_id, barbershops(name)")
      .eq("status", "pending")
      .order("created_at")
      .limit(3),
  ]);

  const barbershops = (barbershopsData ?? []) as AdminBarbershop[];

  const stats = {
    total: barbershops.length,
    trial: barbershops.filter((b) => b.status === "trial").length,
    active: barbershops.filter((b) => b.status === "active").length,
    atRisk: barbershops.filter((b) => ["past_due", "grace", "suspended"].includes(b.status)).length,
    mrrCents: barbershops
      .filter((b) => b.status === "active")
      .reduce((sum, b) => sum + (b.plan_price_cents ?? 0), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <p className={EYEBROW}>Plataforma</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Resumen</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Barberías" value={String(stats.total)} Icon={IconStore} />
        <StatCard label="En prueba" value={String(stats.trial)} Icon={IconClock} />
        <StatCard label="Activas" value={String(stats.active)} Icon={IconCheck} />
        <StatCard label="Ingreso mensual estimado" value={formatMoney(stats.mrrCents)} Icon={IconDollar} dark />
      </div>

      {stats.atRisk > 0 && (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {stats.atRisk} barbería{stats.atRisk === 1 ? "" : "s"} con pago vencido, en gracia o suspendida.
        </p>
      )}

      {pendingPayments && pendingPayments.length > 0 && (
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-900">Pagos pendientes</p>
            {pendingCount && pendingCount > pendingPayments.length && (
              <Link href="/admin/pagos" className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d]">
                Ver todos ({pendingCount}) →
              </Link>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {pendingPayments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eeeae2] px-3.5 py-3 text-sm"
              >
                <div>
                  <Link href={`/admin/${p.tenant_id}`} className="font-semibold text-neutral-900 hover:text-[#9d7837]">
                    {p.barbershops?.name}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {p.method === "cash" ? "Efectivo" : "Transferencia"} ·{" "}
                    {new Date(p.created_at).toLocaleDateString("es-DO")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-neutral-900">{formatMoney(p.amount_cents)}</span>
                  <PaymentActions paymentId={p.id} tenantId={p.tenant_id} subscriptionId={p.subscription_id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form className="flex gap-2">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            <IconSearch />
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, slug o correo..."
            className={`w-full pl-10 ${INPUT}`}
          />
        </div>
        <button className="rounded-xl border border-[#e7e3da] bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Buscar
        </button>
      </form>

      <div className={`divide-y divide-[#eeeae2] ${CARD}`}>
        {barbershops.map((b) => (
          <Link
            key={b.id}
            href={`/admin/${b.id}`}
            className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-[#fffaf0]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff8e9] text-[#9d7837]">
                <IconStore />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{b.name}</p>
                <p className="truncate text-xs text-neutral-500">
                  /{b.slug} · {b.plan_name ?? "Sin plan"}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[b.status] ?? "bg-neutral-100 text-neutral-600"}`}
            >
              {STATUS_LABELS[b.status] ?? b.status}
            </span>
          </Link>
        ))}
        {barbershops.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">No hay barberías.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  dark,
}: {
  label: string;
  value: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
  dark?: boolean;
}) {
  const wrapClass = dark
    ? "rounded-2xl border border-[#171717] bg-[#171717] text-white shadow-[0_8px_30px_rgba(23,23,23,0.04)] flex items-center justify-between p-4"
    : `${CARD} flex items-center justify-between p-4`;

  return (
    <div className={wrapClass}>
      <div className="min-w-0">
        <p className={`truncate text-xs ${dark ? "text-white/55" : "text-neutral-500"}`}>{label}</p>
        <p className="mt-1.5 text-xl font-bold tracking-tight">{value}</p>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-white/10 text-[#e2c17f]" : "bg-[#fff8e9] text-[#9d7837]"}`}
      >
        <Icon />
      </span>
    </div>
  );
}
