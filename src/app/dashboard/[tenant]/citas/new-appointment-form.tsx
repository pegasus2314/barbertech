"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualAppointment, getSlotsForManualBooking } from "./actions";

type Service = { id: string; name: string; duration_minutes: number };
type Barber = { id: string; display_name: string };

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function NewAppointmentForm({
  tenant,
  timezone,
  services,
  barbers,
}: {
  tenant: string;
  timezone: string;
  services: Service[];
  barbers: Barber[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [day, setDay] = useState(todayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        + Nueva cita
      </button>
    );
  }

  function refreshSlots(b: string, s: string, d: string) {
    if (!b || !s) return;
    setSlotStart(null);
    startTransition(async () => {
      const result = await getSlotsForManualBooking(tenant, b, s, d);
      if (result.ok) setSlots(result.slots);
    });
  }

  function handleServiceChange(id: string) {
    setServiceId(id);
    if (barberId) refreshSlots(barberId, id, day);
  }

  function handleBarberChange(id: string) {
    setBarberId(id);
    if (serviceId) refreshSlots(id, serviceId, day);
  }

  function handleDayChange(d: string) {
    setDay(d);
    if (barberId && serviceId) refreshSlots(barberId, serviceId, d);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!barberId || !serviceId || !slotStart || !name.trim() || !phone.trim()) {
      setError("Completa todos los campos y elige un horario.");
      return;
    }

    startTransition(async () => {
      const result = await createManualAppointment(tenant, {
        barberId,
        serviceId,
        startsAt: slotStart,
        clientName: name,
        clientPhone: phone,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setServiceId("");
      setBarberId("");
      setSlots([]);
      setSlotStart(null);
      setName("");
      setPhone("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4"
    >
      <div className="flex flex-wrap gap-3">
        <select
          value={serviceId}
          onChange={(e) => handleServiceChange(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Servicio</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={barberId}
          onChange={(e) => handleBarberChange(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Barbero</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.display_name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={day}
          min={todayISO()}
          onChange={(e) => handleDayChange(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => {
            const label = new Date(s).toLocaleTimeString("es-DO", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: timezone,
            });
            return (
              <button
                type="button"
                key={s}
                onClick={() => setSlotStart(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  slotStart === s
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del cliente"
          className="min-w-[10rem] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Crear cita"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
