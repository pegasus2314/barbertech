"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmSubscriptionPayment, rejectSubscriptionPayment } from "../actions";

export function PaymentActions({
  paymentId,
  tenantId,
  subscriptionId,
}: {
  paymentId: string;
  tenantId: string;
  subscriptionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await confirmSubscriptionPayment(paymentId, tenantId, subscriptionId);
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      await rejectSubscriptionPayment(paymentId, tenantId);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex gap-2">
      <button
        onClick={confirm}
        disabled={pending}
        className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        Confirmar
      </button>
      <button
        onClick={reject}
        disabled={pending}
        className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        Rechazar
      </button>
    </div>
  );
}
