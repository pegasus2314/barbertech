import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { PaymentActions } from "../[tenant]/payment-actions";

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
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Pagos pendientes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pagos de suscripción registrados por dueños, esperando confirmación.
        </p>
      </div>

      <div className="space-y-3">
        {(payments ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <Link
                href={`/admin/${p.barbershops?.id}`}
                className="text-sm font-medium text-neutral-900 hover:underline"
              >
                {p.barbershops?.name}
              </Link>
              <span className="text-sm font-semibold text-neutral-900">
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
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
            No hay pagos pendientes.
          </p>
        )}
      </div>
    </div>
  );
}
