import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { PaymentActions } from "../[tenant]/payment-actions";
import { CARD, EYEBROW } from "@/lib/ui";
import { IconDollar } from "@/lib/icons";

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

export default async function AdminPaymentsPage() {
  const { supabase } = await requirePlatformAdmin();

  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("*, barbershops(id, name, slug)")
    .eq("status", "pending")
    .order("created_at");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e9] text-[#9d7837]">
          <IconDollar />
        </span>
        <div>
          <p className={EYEBROW}>Suscripciones</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Pagos pendientes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pagos de suscripción registrados por dueños, esperando confirmación.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {(payments ?? []).map((p) => (
          <div key={p.id} className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <Link
                href={`/admin/${p.barbershops?.id}`}
                className="text-sm font-semibold text-neutral-900 hover:text-[#9d7837]"
              >
                {p.barbershops?.name}
              </Link>
              <span className="text-sm font-bold text-neutral-900">
                {formatMoney(p.amount_cents)}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {p.method === "cash" ? "Efectivo" : "Transferencia"} ·{" "}
              {new Date(p.created_at).toLocaleString("es-DO")}
              {p.reference ? ` · ${p.reference}` : ""}
            </p>
            <PaymentActions
              paymentId={p.id}
              tenantId={p.tenant_id}
              subscriptionId={p.subscription_id}
            />
          </div>
        ))}
        {(payments ?? []).length === 0 && (
          <p className={`${CARD} px-4 py-8 text-center text-sm text-neutral-500`}>
            No hay pagos pendientes.
          </p>
        )}
      </div>
    </div>
  );
}
