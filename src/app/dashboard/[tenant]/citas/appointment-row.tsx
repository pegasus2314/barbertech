"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { nextStatuses } from "@/lib/appointments/status";
import { updateAppointmentStatus } from "./actions";

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
  confirmed: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-neutral-100 text-neutral-600",
  cancelled: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
  no_show: "bg-red-50 text-red-700",
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

type AppointmentWithRelations = {
  id: string;
  starts_at: string;
  status: string;
  price_cents: number;
  clients: { full_name: string; phone: string } | null;
  services: { name: string } | null;
  barbers: { display_name: string } | null;
};

export function AppointmentRow({
  tenant,
  appointment,
  timezone,
}: {
  tenant: string;
  appointment: AppointmentWithRelations;
  timezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = nextStatuses(appointment.status);

  function handleChange(status: string) {
    startTransition(async () => {
      await updateAppointmentStatus(tenant, appointment.id, status);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[#e7e3da] bg-white p-4 shadow-[0_8px_30px_rgba(23,23,23,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {appointment.clients?.full_name ?? "Cliente"}
          </p>
          <p className="text-xs text-neutral-500">{appointment.clients?.phone}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[appointment.status] ?? "bg-neutral-100 text-neutral-600"}`}
        >
          {STATUS_LABELS[appointment.status] ?? appointment.status}
        </span>
      </div>

      <div className="mt-2 text-sm text-neutral-700">
        {appointment.services?.name} con {appointment.barbers?.display_name}
      </div>
      <div className="mt-1 flex items-center justify-between text-sm text-neutral-500">
        <span>
          {new Date(appointment.starts_at).toLocaleString("es-DO", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            timeZone: timezone,
          })}
        </span>
        <span className="font-semibold text-neutral-900">{formatMoney(appointment.price_cents)}</span>
      </div>

      {options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((status) => (
            <button
              key={status}
              onClick={() => handleChange(status)}
              disabled={pending}
              className="rounded-lg border border-[#e7e3da] px-3 py-1 text-xs font-medium text-neutral-700 transition hover:border-[#c7a15a] hover:bg-[#fffaf0] disabled:opacity-50"
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
