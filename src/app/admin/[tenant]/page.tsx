import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { StatusControls } from "./status-controls";
import { PlanSelector } from "./plan-selector";
import { PaymentActions } from "./payment-actions";

function formatMoney(cents: number, currency = "DOP") {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency });
}

export default async function AdminTenantPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  const { supabase } = await requirePlatformAdmin();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("*, plans(id, name, price_cents, currency)")
    .eq("id", tenantId)
    .maybeSingle();

  if (!barbershop) notFound();

  const [{ data: plans }, { data: subscription }, { data: payments }, { data: memberships }] =
    await Promise.all([
      supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase
        .from("subscription_payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase.from("memberships").select("role, status, user_id").eq("tenant_id", tenantId),
    ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{barbershop.name}</h1>
        <p className="text-sm text-neutral-500">/{barbershop.slug}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Estado de la cuenta</p>
        <p className="mt-1 text-sm text-neutral-500">Estado actual: {barbershop.status}</p>
        <div className="mt-3">
          <StatusControls tenantId={barbershop.id} currentStatus={barbershop.status} />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Plan</p>
        <p className="mt-1 text-sm text-neutral-500">
          Plan actual: {barbershop.plans?.name ?? "Sin plan"}
        </p>
        <div className="mt-3">
          <PlanSelector tenantId={barbershop.id} plans={plans ?? []} currentPlanId={barbershop.plan_id} />
        </div>
      </div>

      {subscription && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          <p className="font-semibold text-neutral-900">Suscripción</p>
          <p className="mt-1">Estado: {subscription.status}</p>
          {subscription.current_period_end && (
            <p>
              Vigente hasta:{" "}
              {new Date(subscription.current_period_end).toLocaleDateString("es-DO")}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Pagos de suscripción</p>
        <div className="mt-3 space-y-2">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border border-neutral-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-900">
                  {formatMoney(p.amount_cents)} · {p.method === "cash" ? "Efectivo" : "Transferencia"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "confirmed"
                      ? "bg-green-50 text-green-700"
                      : p.status === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {new Date(p.created_at).toLocaleString("es-DO")}
                {p.reference ? ` · ${p.reference}` : ""}
              </p>
              {p.status === "pending" && subscription && (
                <PaymentActions
                  paymentId={p.id}
                  tenantId={barbershop.id}
                  subscriptionId={subscription.id}
                />
              )}
            </div>
          ))}
          {(payments ?? []).length === 0 && (
            <p className="text-sm text-neutral-500">Sin pagos registrados.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Miembros</p>
        <div className="mt-2 space-y-1 text-sm text-neutral-600">
          {(memberships ?? []).map((m) => (
            <p key={m.user_id}>
              {m.role} · {m.status}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
