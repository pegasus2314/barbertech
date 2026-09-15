"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBarber, addService, createBarbershop, publishBarbershop } from "./actions";

type Step = 1 | 2 | 3 | 4;

const INPUT_CLASS =
  "w-full rounded-xl border border-[#e7e3da] px-3.5 py-2.5 text-sm focus:border-[#c7a15a] focus:outline-none focus:ring-1 focus:ring-[#c7a15a]";
const BUTTON_CLASS =
  "w-full rounded-xl bg-[#171717] px-3 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [serviceId, setServiceId] = useState<string | null>(null);

  const [barberName, setBarberName] = useState("");

  function handleCreateShop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBarbershop(shopName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTenantId(result.data.tenantId);
      setSlug(result.data.slug);
      setStep(2);
    });
  }

  function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setError(null);

    const priceCents = Math.round(parseFloat(servicePrice || "0") * 100);
    const durationMinutes = parseInt(serviceDuration || "0", 10);

    if (!serviceName.trim() || priceCents <= 0 || durationMinutes <= 0) {
      setError("Completa nombre, precio y duración válidos.");
      return;
    }

    startTransition(async () => {
      const result = await addService(tenantId, {
        name: serviceName,
        priceCents,
        durationMinutes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setServiceId(result.data.id);
      setStep(3);
    });
  }

  function handleAddBarber(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setError(null);

    if (!barberName.trim()) {
      setError("Ingresa el nombre del barbero.");
      return;
    }

    startTransition(async () => {
      const result = await addBarber(tenantId, {
        displayName: barberName,
        serviceIds: serviceId ? [serviceId] : [],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep(4);
    });
  }

  function handlePublish() {
    if (!tenantId || !slug) return;
    setError(null);

    startTransition(async () => {
      const result = await publishBarbershop(tenantId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/${slug}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[#e7e3da] bg-white p-6 shadow-[0_8px_30px_rgba(23,23,23,0.04)]">
      <ol className="mb-6 flex items-center gap-2 text-xs font-medium text-neutral-400">
        {(["Barbería", "Servicio", "Barbero", "Publicar"] as const).map((label, i) => {
          const n = (i + 1) as Step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  n <= step ? "bg-[#c7a15a] text-[#171717]" : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {n}
              </span>
              <span className={n <= step ? "font-medium text-neutral-900" : ""}>{label}</span>
              {i < 3 && <span className="mx-1 text-neutral-300">—</span>}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <form onSubmit={handleCreateShop} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#171717]">
              ¿Cómo se llama tu barbería?
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Usaremos este nombre para generar tu enlace público.
            </p>
          </div>
          <input
            autoFocus
            required
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Ej. Barber King"
            className={INPUT_CLASS}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className={BUTTON_CLASS}>
            {pending ? "Creando..." : "Continuar"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleAddService} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#171717]">Tu primer servicio</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Podrás agregar más servicios luego desde el panel.
            </p>
          </div>
          <input
            autoFocus
            required
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="Ej. Corte clásico"
            className={INPUT_CLASS}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500">Precio (RD$)</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                className={`mt-1 ${INPUT_CLASS}`}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500">Duración (min)</label>
              <input
                required
                type="number"
                min="5"
                step="5"
                value={serviceDuration}
                onChange={(e) => setServiceDuration(e.target.value)}
                className={`mt-1 ${INPUT_CLASS}`}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className={BUTTON_CLASS}>
            {pending ? "Guardando..." : "Continuar"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleAddBarber} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#171717]">Tu primer barbero</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Se le asignará el servicio que acabas de crear; puedes ajustar esto luego.
            </p>
          </div>
          <input
            autoFocus
            required
            value={barberName}
            onChange={(e) => setBarberName(e.target.value)}
            placeholder="Ej. Carlos"
            className={INPUT_CLASS}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className={BUTTON_CLASS}>
            {pending ? "Guardando..." : "Continuar"}
          </button>
        </form>
      )}

      {step === 4 && slug && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#171717]">Todo listo</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Configuramos un horario general de lunes a sábado, 9:00 AM–7:00 PM (lo puedes
              cambiar desde el panel). Tu enlace público será:
            </p>
          </div>
          <div className="rounded-xl bg-[#fffaf0] px-3.5 py-2.5 text-sm font-mono text-[#9d7837]">
            barbertech.app/{slug}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" onClick={handlePublish} disabled={pending} className={BUTTON_CLASS}>
            {pending ? "Publicando..." : "Publicar barbería"}
          </button>
        </div>
      )}
    </div>
  );
}
