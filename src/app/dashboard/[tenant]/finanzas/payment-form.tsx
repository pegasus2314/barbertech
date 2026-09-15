"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "./actions";
import { BUTTON_GHOST, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/ui";

type Appointment = {
  id: string;
  starts_at: string;
  price_cents: number;
  clients: { full_name: string } | null;
  services: { name: string } | null;
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

export function PaymentForm({
  tenant,
  appointments,
}: {
  tenant: string;
  appointments: Appointment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
        + Registrar pago
      </button>
    );
  }

  function handleAppointmentChange(id: string) {
    setAppointmentId(id);
    const appt = appointments.find((a) => a.id === id);
    if (appt) setAmount((appt.price_cents / 100).toString());
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
      const result = await recordPayment(tenant, {
        appointmentId: appointmentId || undefined,
        amountCents,
        method,
        reference,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setAppointmentId("");
      setAmount("");
      setReference("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${CARD} p-4`}>
      <select value={appointmentId} onChange={(e) => handleAppointmentChange(e.target.value)} className={`w-full ${INPUT}`}>
        <option value="">Sin cita asociada (pago libre)</option>
        {appointments.map((a) => (
          <option key={a.id} value={a.id}>
            {a.clients?.full_name} — {a.services?.name} —{" "}
            {new Date(a.starts_at).toLocaleDateString("es-DO")} ({formatMoney(a.price_cents)})
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-3">
        <input
          required
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Monto RD$"
          className={`w-36 ${INPUT}`}
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as "cash" | "transfer")}
          className={INPUT}
        >
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
        </select>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Referencia (opcional)"
          className={`min-w-[8rem] flex-1 ${INPUT}`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Guardando..." : "Registrar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BUTTON_GHOST}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
