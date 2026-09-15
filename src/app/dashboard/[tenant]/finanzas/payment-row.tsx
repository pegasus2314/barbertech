"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidPayment } from "./actions";
import { CARD } from "@/lib/ui";

type Payment = {
  id: string;
  amount_cents: number;
  method: string;
  status: string;
  reference: string | null;
  created_at: string;
  clients: { full_name: string } | null;
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

export function PaymentRow({ tenant, payment }: { tenant: string; payment: Payment }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleVoid() {
    startTransition(async () => {
      await voidPayment(tenant, payment.id);
      router.refresh();
    });
  }

  return (
    <div className={`flex items-center justify-between gap-3 ${CARD} p-4`}>
      <div>
        <p className="text-sm font-semibold text-neutral-900">
          {formatMoney(payment.amount_cents)}{" "}
          <span className="font-normal text-neutral-500">
            · {payment.method === "cash" ? "Efectivo" : "Transferencia"}
          </span>
        </p>
        <p className="text-xs text-neutral-500">
          {payment.clients?.full_name ?? "Sin cliente"} ·{" "}
          {new Date(payment.created_at).toLocaleString("es-DO")}
          {payment.reference ? ` · ${payment.reference}` : ""}
        </p>
      </div>
      {payment.status === "voided" ? (
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
          Anulado
        </span>
      ) : (
        <button
          onClick={handleVoid}
          disabled={pending}
          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          Anular
        </button>
      )}
    </div>
  );
}
