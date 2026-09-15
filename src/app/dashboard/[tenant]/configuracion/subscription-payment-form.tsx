"use client";

import { useState, useTransition } from "react";
import { registerSubscriptionPayment } from "./actions";
import { BUTTON_GHOST, INPUT } from "@/lib/ui";

export function SubscriptionPaymentForm({ tenant }: { tenant: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("transfer");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d]">
        + Registrar pago de suscripción
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (amountCents <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    startTransition(async () => {
      const result = await registerSubscriptionPayment(tenant, { amountCents, method, reference });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setAmount("");
      setReference("");
    });
  }

  if (success) {
    return (
      <p className="text-sm font-medium text-emerald-700">
        Pago registrado. Un administrador lo confirmará pronto.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          required
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Monto RD$"
          className={`w-32 ${INPUT} py-1.5`}
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as "cash" | "transfer")}
          className={`${INPUT} py-1.5`}
        >
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
        </select>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Referencia (opcional)"
          className={`min-w-[8rem] flex-1 ${INPUT} py-1.5`}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#171717] px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${BUTTON_GHOST} py-1.5 text-xs`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
