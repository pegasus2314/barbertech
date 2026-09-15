"use client";

import { useState, useTransition } from "react";
import { cancelAppointment, lookupAppointments, type LookupResult } from "../actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  rejected: "Rechazada",
  no_show: "No se presentó",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-green-50 text-green-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-neutral-100 text-neutral-600",
  cancelled: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
  no_show: "bg-red-50 text-red-700",
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

export function LookupForm({ tenantId, timezone }: { tenantId: string; timezone: string }) {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    startTransition(async () => {
      const res = await lookupAppointments(tenantId, phone);
      setResult(res);
    });
  }

  function handleCancel(appointmentId: string) {
    startTransition(async () => {
      await cancelAppointment(appointmentId, phone);
      const res = await lookupAppointments(tenantId, phone);
      setResult(res);
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Tu número de teléfono"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {result && !result.ok && <p className="text-sm text-red-600">{result.error}</p>}

      {result && result.ok && result.appointments.length === 0 && (
        <p className="text-sm text-neutral-500">No encontramos citas con ese número.</p>
      )}

      {result && result.ok && result.appointments.length > 0 && (
        <div className="space-y-3">
          {result.appointments.map((a) => (
            <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{a.service_name}</p>
                  <p className="text-xs text-neutral-500">con {a.barber_name}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[a.status] ?? "bg-neutral-100 text-neutral-600"}`}
                >
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">
                {new Date(a.starts_at).toLocaleString("es-DO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: timezone,
                })}
              </p>
              <p className="text-sm text-neutral-500">{formatMoney(a.price_cents)}</p>

              {(a.status === "pending" || a.status === "confirmed") && (
                <button
                  onClick={() => handleCancel(a.id)}
                  disabled={pending}
                  className="mt-3 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Cancelar cita
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
