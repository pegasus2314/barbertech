"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nextStatuses } from "@/lib/appointments/status";
import { updateAppointmentStatus, deleteAppointment } from "./actions";
import { recordPayment } from "../finanzas/actions";
import { waLink } from "@/lib/whatsapp";
import { useOptimisticAction } from "@/lib/use-optimistic-action";

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
  isPaid,
  canManage,
}: {
  tenant: string;
  appointment: AppointmentWithRelations;
  timezone: string;
  isPaid: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const { value: status, pending, run: runStatusChange } = useOptimisticAction(appointment.status);
  const [payOpen, setPayOpen] = useState(false);
  const [payPending, startPayTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const options = nextStatuses(status);

  const when = new Date(appointment.starts_at).toLocaleString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
  const clientFirstName = appointment.clients?.full_name?.split(" ")[0] ?? "";
  const serviceName = appointment.services?.name ?? "tu servicio";
  const barberName = appointment.barbers?.display_name;

  const CLIENT_MESSAGES: Record<string, string> = {
    pending: `Hola ${clientFirstName}, tu cita de ${serviceName} para el ${when} está pendiente de confirmar. Te avisamos apenas la confirmemos.`,
    confirmed: `Hola ${clientFirstName}, tu cita de ${serviceName}${barberName ? ` con ${barberName}` : ""} está confirmada para el ${when}. ¡Te esperamos!`,
    cancelled: `Hola ${clientFirstName}, lamentamos informarte que tu cita de ${serviceName} para el ${when} fue cancelada. Contáctanos si quieres reagendar.`,
    rejected: `Hola ${clientFirstName}, no pudimos confirmar tu cita de ${serviceName} para el ${when}. Contáctanos si quieres agendar otro horario.`,
    no_show: `Hola ${clientFirstName}, notamos que no llegaste a tu cita de ${serviceName} del ${when}. ¿Quieres reagendar?`,
  };

  const clientWaLink = waLink(
    appointment.clients?.phone,
    CLIENT_MESSAGES[status] ??
      `Hola ${clientFirstName}, te escribo sobre tu cita de ${serviceName} para el ${when}.`,
  );

  function handleChange(nextStatus: string) {
    runStatusChange(nextStatus, () => updateAppointmentStatus(tenant, appointment.id, nextStatus));
  }

  function handleRegisterPayment() {
    setPayError(null);
    startPayTransition(async () => {
      const result = await recordPayment(tenant, {
        appointmentId: appointment.id,
        amountCents: appointment.price_cents,
        method: "cash",
      });
      if (!result.ok) {
        setPayError(result.error);
        return;
      }
      setPayOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteAppointment(tenant, appointment.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
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
          <div className="flex items-center gap-2">
            <p className="text-xs text-neutral-500">{appointment.clients?.phone}</p>
            {clientWaLink && (
              <a
                href={clientWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#25D366] hover:underline"
              >
                Notificar por WhatsApp
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-neutral-100 text-neutral-600"}`}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
          {status === "completed" && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              {isPaid ? "Pagado" : "Sin cobrar"}
            </span>
          )}
        </div>
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

      {(options.length > 0 || (canManage && status === "completed" && !isPaid)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleChange(option)}
              disabled={pending}
              className="rounded-lg border border-[#e7e3da] px-3 py-1 text-xs font-medium text-neutral-700 transition hover:border-[#c7a15a] hover:bg-[#fffaf0] disabled:opacity-50"
            >
              {STATUS_LABELS[option]}
            </button>
          ))}
          {canManage && status === "completed" && !isPaid && !payOpen && (
            <button
              onClick={() => setPayOpen(true)}
              className="rounded-lg border border-[#c7a15a] bg-[#fffaf0] px-3 py-1 text-xs font-semibold text-[#9d7837] transition hover:bg-[#fff3d9]"
            >
              + Registrar pago
            </button>
          )}
        </div>
      )}

      {payOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#e7e3da] bg-[#f7f6f2] p-3">
          <span className="text-xs text-neutral-600">
            Registrar {formatMoney(appointment.price_cents)} en efectivo
          </span>
          <button
            onClick={handleRegisterPayment}
            disabled={payPending}
            className="rounded-lg bg-[#171717] px-3 py-1 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {payPending ? "Guardando..." : "Confirmar"}
          </button>
          <button
            onClick={() => setPayOpen(false)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            Cancelar
          </button>
          {payError && <p className="w-full text-xs text-red-600">{payError}</p>}
        </div>
      )}

      {canManage && !deleteOpen && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => setDeleteOpen(true)}
            className="text-xs font-medium text-neutral-400 hover:text-red-600"
          >
            Eliminar cita
          </button>
        </div>
      )}

      {deleteOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <span className="text-xs text-red-700">¿Eliminar esta cita? No se puede deshacer.</span>
          <button
            onClick={handleDelete}
            disabled={deletePending}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deletePending ? "Eliminando..." : "Sí, eliminar"}
          </button>
          <button
            onClick={() => setDeleteOpen(false)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            Cancelar
          </button>
          {deleteError && <p className="w-full text-xs text-red-600">{deleteError}</p>}
        </div>
      )}
    </div>
  );
}
