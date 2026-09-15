import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { PaymentForm } from "./payment-form";
import { PaymentRow } from "./payment-row";

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

export default async function FinancesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);

  if (!canManage) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
        No tienes acceso a esta sección.
      </div>
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: payments }, { data: recentAppointments }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, clients(full_name)")
      .eq("tenant_id", barbershop.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("appointments")
      .select("id, starts_at, price_cents, clients(full_name), services(name)")
      .eq("tenant_id", barbershop.id)
      .in("status", ["confirmed", "in_progress", "completed"])
      .order("starts_at", { ascending: false })
      .limit(20),
  ]);

  const todayTotal = (payments ?? [])
    .filter((p) => p.status === "recorded" && new Date(p.created_at) >= todayStart)
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Finanzas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Registro manual de pagos (efectivo o transferencia). El historial no se borra: anular
          crea un nuevo estado, no elimina el registro.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-2xl font-semibold text-neutral-900">{formatMoney(todayTotal)}</p>
        <p className="text-xs text-neutral-500">Ingresos de hoy</p>
      </div>

      <PaymentForm tenant={tenant} appointments={recentAppointments ?? []} />

      <div className="space-y-2">
        {payments && payments.length > 0 ? (
          payments.map((p) => <PaymentRow key={p.id} tenant={tenant} payment={p} />)
        ) : (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
            Aún no hay pagos registrados.
          </p>
        )}
      </div>
    </div>
  );
}
