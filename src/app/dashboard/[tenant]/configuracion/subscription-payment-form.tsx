"use client";

import { useState, useTransition } from "react";
import { registerSubscriptionPayment } from "./actions";

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
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
      >
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
      <p className="text-sm text-green-700">
        Pago registrado. Un administrador lo confirmará pronto.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          required
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Monto RD$"
          className="w-32 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as "cash" | "transfer")}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
        </select>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Referencia (opcional)"
          className="min-w-[8rem] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
