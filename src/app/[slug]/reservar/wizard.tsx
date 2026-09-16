"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { bookAppointment, getAvailableSlots } from "../actions";
import { waLink } from "@/lib/whatsapp";

type Service = { id: string; name: string; price_cents: number; duration_minutes: number };
type Barber = { id: string; display_name: string; photo_url: string | null };
type BarberService = { barber_id: string; service_id: string };

type Step = 1 | 2 | 3 | 4 | 5;

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const INPUT_CLASS =
  "w-full rounded-xl border border-[#e7e3da] px-3.5 py-2.5 text-sm focus:border-[#c7a15a] focus:outline-none focus:ring-1 focus:ring-[#c7a15a]";
const PRIMARY_BUTTON =
  "w-full rounded-xl bg-[#171717] px-3 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50";

export function BookingWizard({
  tenantId,
  tenantSlug,
  tenantWhatsapp,
  timezone,
  services,
  barbers,
  barberServices,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantWhatsapp: string | null;
  timezone: string;
  services: Service[];
  barbers: Barber[];
  barberServices: BarberService[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [day, setDay] = useState(todayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [slotStart, setSlotStart] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const selectedBarber = barbers.find((b) => b.id === barberId) ?? null;

  const confirmationWaLink = useMemo(() => {
    if (!slotStart || !selectedService || !selectedBarber) return null;
    const when = new Date(slotStart).toLocaleString("es-DO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
    return waLink(
      tenantWhatsapp,
      `Hola, soy ${name || "un cliente"}. Reservé ${selectedService.name} con ${selectedBarber.display_name} el ${when}. Quería confirmar.`,
    );
  }, [slotStart, selectedService, selectedBarber, name, timezone, tenantWhatsapp]);

  const eligibleBarbers = useMemo(() => {
    if (!serviceId) return [];
    const barberIds = new Set(
      barberServices.filter((bs) => bs.service_id === serviceId).map((bs) => bs.barber_id),
    );
    return barbers.filter((b) => barberIds.has(b.id));
  }, [barberServices, barbers, serviceId]);

  function pickService(id: string) {
    setServiceId(id);
    setBarberId(null);
    setStep(2);
  }

  function pickBarber(id: string) {
    setBarberId(id);
    setSlots([]);
    setSlotStart(null);
    setStep(3);
    void loadSlots(id, day);
  }

  function loadSlots(bId: string, d: string) {
    if (!serviceId) return;
    setError(null);
    startTransition(async () => {
      const result = await getAvailableSlots(tenantId, bId, serviceId, d);
      if (!result.ok) {
        setError(result.error);
        setSlots([]);
        return;
      }
      setSlots(result.slots);
    });
  }

  function handleDayChange(d: string) {
    setDay(d);
    setSlotStart(null);
    if (barberId) loadSlots(barberId, d);
  }

  function confirmSlot() {
    if (!slotStart) return;
    setStep(4);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!serviceId || !barberId || !slotStart) return;
    if (!name.trim() || !phone.trim()) {
      setError("Completa tu nombre y teléfono.");
      return;
    }

    startTransition(async () => {
      const result = await bookAppointment({
        tenantId,
        tenantSlug,
        barberId,
        serviceId,
        serviceName: selectedService?.name ?? "un servicio",
        startsAt: slotStart,
        clientName: name,
        clientPhone: phone,
        clientEmail: email,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep(5);
    });
  }

  return (
    <div className="rounded-2xl border border-[#e7e3da] bg-white p-6 shadow-[0_8px_30px_rgba(23,23,23,0.04)]">
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-[#171717]">Elige un servicio</h2>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => pickService(s.id)}
              className="flex w-full items-center justify-between rounded-xl border border-[#e7e3da] px-4 py-3.5 text-left transition hover:border-[#c7a15a] hover:bg-[#fffaf0]"
            >
              <span>
                <span className="block text-sm font-semibold text-neutral-900">{s.name}</span>
                <span className="block text-xs text-neutral-500">{s.duration_minutes} min</span>
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {formatMoney(s.price_cents)}
              </span>
            </button>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-neutral-500">No hay servicios disponibles.</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <button
            onClick={() => setStep(1)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            ← Cambiar servicio
          </button>
          <h2 className="text-lg font-bold tracking-tight text-[#171717]">Elige un barbero</h2>
          {eligibleBarbers.map((b) => (
            <button
              key={b.id}
              onClick={() => pickBarber(b.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-[#e7e3da] px-4 py-3.5 text-left transition hover:border-[#c7a15a] hover:bg-[#fffaf0]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f6f2] text-sm font-bold text-neutral-600">
                {b.display_name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-neutral-900">{b.display_name}</span>
            </button>
          ))}
          {eligibleBarbers.length === 0 && (
            <p className="text-sm text-neutral-500">
              Ningún barbero ofrece este servicio todavía.
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <button
            onClick={() => setStep(2)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            ← Cambiar barbero
          </button>
          <h2 className="text-lg font-bold tracking-tight text-[#171717]">Elige fecha y hora</h2>

          <input
            type="date"
            value={day}
            min={todayISO()}
            onChange={(e) => handleDayChange(e.target.value)}
            className="rounded-xl border border-[#e7e3da] px-3.5 py-2.5 text-sm"
          />

          {pending && <p className="text-sm text-neutral-500">Buscando horarios...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!pending && slots.length === 0 && (
            <p className="text-sm text-neutral-500">No hay horarios disponibles ese día.</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => {
              const label = new Date(s).toLocaleTimeString("es-DO", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: timezone,
              });
              const active = s === slotStart;
              return (
                <button
                  key={s}
                  onClick={() => setSlotStart(s)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-[#171717] bg-[#171717] text-white"
                      : "border-[#e7e3da] text-neutral-700 hover:border-[#c7a15a]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button onClick={confirmSlot} disabled={!slotStart} className={PRIMARY_BUTTON}>
            Continuar
          </button>
        </div>
      )}

      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            ← Cambiar horario
          </button>
          <h2 className="text-lg font-bold tracking-tight text-[#171717]">Tus datos</h2>

          <div className="rounded-xl bg-[#fffaf0] p-3.5 text-sm text-[#7f602d]">
            <span className="font-semibold">
              {selectedService?.name} con {selectedBarber?.display_name}
            </span>
            <br />
            {slotStart &&
              new Date(slotStart).toLocaleString("es-DO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "numeric",
                minute: "2-digit",
                timeZone: timezone,
              })}
          </div>

          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            className={INPUT_CLASS}
          />
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono"
            className={INPUT_CLASS}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo (opcional)"
            className={INPUT_CLASS}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className={INPUT_CLASS}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
            {pending ? "Confirmando..." : "Confirmar cita"}
          </button>
        </form>
      )}

      {step === 5 && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff8e9] text-xl">
            ✓
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#171717]">¡Cita solicitada!</h2>
          <p className="text-sm text-neutral-500">
            Te esperamos. La barbería confirmará tu cita pronto.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {confirmationWaLink && (
              <a
                href={confirmationWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1ebe57]"
              >
                Avisar por WhatsApp
              </a>
            )}
            <Link
              href={`/${tenantSlug}/mi-cita`}
              className="inline-flex items-center justify-center rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Consultar mi cita
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
