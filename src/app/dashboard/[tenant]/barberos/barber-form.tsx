"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBarber } from "./actions";
import { BUTTON_GHOST, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/ui";

export function BarberForm({
  tenant,
  services,
}: {
  tenant: string;
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
        + Nuevo barbero
      </button>
    );
  }

  function toggleService(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Ingresa el nombre del barbero.");
      return;
    }

    startTransition(async () => {
      const result = await createBarber(tenant, { displayName: name, serviceIds: selected });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setSelected([]);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${CARD} p-4`}>
      <input
        autoFocus
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del barbero"
        className={`w-full max-w-sm ${INPUT}`}
      />

      {services.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">Servicios que realiza</p>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selected.includes(service.id)
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#e7e3da] text-neutral-600 hover:border-[#c7a15a]"
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BUTTON_GHOST}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
