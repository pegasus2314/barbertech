"use client";

import { useState, useTransition } from "react";
import { createBarber } from "./actions";

export function BarberForm({
  tenant,
  services,
}: {
  tenant: string;
  services: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
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
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4"
    >
      <input
        autoFocus
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del barbero"
        className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
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
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
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
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar"}
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
