import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { StatusControls } from "./status-controls";
import { PlanSelector } from "./plan-selector";
import { PaymentActions } from "./payment-actions";
import { ExtendTrial } from "./extend-trial";
import { CARD, EYEBROW } from "@/lib/ui";
import { IconStore } from "@/lib/icons";

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
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900">
        ← Todas las barberías
      </Link>

      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e9] text-[#9d7837]">
          <IconStore />
        </span>
        <div>
          <p className={EYEBROW}>Barbería</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">{barbershop.name}</h1>
          <p className="text-sm text-neutral-500">/{barbershop.slug}</p>
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <p className="text-sm font-semibold text-neutral-900">Estado de la cuenta</p>
        <p className="mt-1 text-sm text-neutral-500">Estado actual: {barbershop.status}</p>
        <div className="mt-3">
          <StatusControls tenantId={barbershop.id} currentStatus={barbershop.status} />
        </div>
        <div className="mt-4 border-t border-[#eeeae2] pt-4">
          <p className="text-xs font-semibold text-neutral-500">Extender período de prueba</p>
          <div className="mt-2">
            <ExtendTrial tenantId={barbershop.id} />
          </div>
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <p className="text-sm font-semibold text-neutral-900">Plan</p>
        <p className="mt-1 text-sm text-neutral-500">
          Plan actual: {barbershop.plans?.name ?? "Sin plan"}
        </p>
        <div className="mt-3">
          <PlanSelector tenantId={barbershop.id} plans={plans ?? []} currentPlanId={barbershop.plan_id} />
        </div>
      </div>

      {subscription && (
        <div className={`${CARD} p-5 text-sm text-neutral-600`}>
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

      <div className={`${CARD} p-5`}>
        <p className="text-sm font-semibold text-neutral-900">Pagos de suscripción</p>
        <div className="mt-3 space-y-2">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-[#eeeae2] p-3.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900">
                  {formatMoney(p.amount_cents)} · {p.method === "cash" ? "Efectivo" : "Transferencia"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.status === "confirmed"
                      ? "bg-emerald-50 text-emerald-700"
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

      <div className={`${CARD} p-5`}>
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
