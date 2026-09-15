"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualAppointment, getSlotsForManualBooking } from "./actions";
import { BUTTON_GHOST, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/ui";

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
      <button onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
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
    <form onSubmit={handleSubmit} className={`space-y-3 ${CARD} p-4`}>
      <div className="flex flex-wrap gap-3">
        <select
          value={serviceId}
          onChange={(e) => handleServiceChange(e.target.value)}
          className={INPUT}
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
          className={INPUT}
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
          className={INPUT}
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
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                  slotStart === s
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#e7e3da] text-neutral-700 hover:border-[#c7a15a]"
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
          className={`min-w-[10rem] flex-1 ${INPUT}`}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          className={`w-40 ${INPUT}`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Guardando..." : "Crear cita"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BUTTON_GHOST}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
