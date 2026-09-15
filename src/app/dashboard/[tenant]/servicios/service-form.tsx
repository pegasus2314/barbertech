"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createService } from "./actions";
import { BUTTON_GHOST, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/ui";

export function ServiceForm({ tenant }: { tenant: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
        + Nuevo servicio
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceCents = Math.round(parseFloat(price || "0") * 100);
    const durationMinutes = parseInt(duration || "0", 10);

    if (!name.trim() || priceCents <= 0 || durationMinutes <= 0) {
      setError("Completa nombre, precio y duración válidos.");
      return;
    }

    startTransition(async () => {
      const result = await createService(tenant, { name, priceCents, durationMinutes });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setPrice("");
      setDuration("30");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${CARD} p-4`}>
      <div className="flex flex-wrap gap-3">
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del servicio"
          className={`min-w-[10rem] flex-1 ${INPUT}`}
        />
        <input
          required
          type="number"
          min="1"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Precio RD$"
          className={`w-32 ${INPUT}`}
        />
        <input
          required
          type="number"
          min="5"
          step="5"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Minutos"
          className={`w-28 ${INPUT}`}
        />
      </div>
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
