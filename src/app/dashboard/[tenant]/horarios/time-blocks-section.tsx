"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTimeBlock, deleteTimeBlock } from "./actions";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/ui";

const TYPE_LABELS: Record<string, string> = {
  lunch: "Almuerzo",
  meeting: "Reunión",
  vacation: "Vacaciones",
  day_off: "Día libre",
  event: "Evento",
  other: "Otro",
};

type Block = {
  id: string;
  barberId: string | null;
  barberName: string | null;
  startsAt: string;
  endsAt: string;
  type: string;
  reason: string | null;
};

export function TimeBlocksSection({
  tenant,
  timezone,
  barbers,
  blocks,
  readOnly,
}: {
  tenant: string;
  timezone: string;
  barbers: { id: string; display_name: string }[];
  blocks: Block[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [barberId, setBarberId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [type, setType] = useState("other");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!startsAt || !endsAt) {
      setError("Completa el inicio y el fin del bloqueo.");
      return;
    }

    startTransition(async () => {
      const result = await createTimeBlock(tenant, {
        barberId: barberId || null,
        startsAtLocal: startsAt,
        endsAtLocal: endsAt,
        type,
        reason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setBarberId("");
      setStartsAt("");
      setEndsAt("");
      setType("other");
      setReason("");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await deleteTimeBlock(tenant, id);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div className={`${CARD} p-5`}>
      {!readOnly && !open && (
        <button onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
          + Nuevo bloqueo
        </button>
      )}

      {!readOnly && open && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#e7e3da] bg-[#f7f6f2] p-4">
          <div className="flex flex-wrap gap-3">
            <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className={INPUT}>
              <option value="">Toda la barbería</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                </option>
              ))}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-neutral-500">
              Desde ({timezone})
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={`mt-1 block ${INPUT}`}
              />
            </label>
            <label className="text-xs text-neutral-500">
              Hasta ({timezone})
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={`mt-1 block ${INPUT}`}
              />
            </label>
          </div>

          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className={`w-full ${INPUT}`}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
              {pending ? "Guardando..." : "Crear bloqueo"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={BUTTON_SECONDARY}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {blocks.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#eeeae2] p-3.5 text-sm"
          >
            <div>
              <span className="font-semibold text-neutral-900">{TYPE_LABELS[b.type] ?? b.type}</span>
              <span className="text-neutral-400"> · {b.barberName ?? "Toda la barbería"}</span>
              <p className="mt-0.5 text-xs text-neutral-500">
                {new Date(b.startsAt).toLocaleString("es-DO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: timezone,
                })}{" "}
                —{" "}
                {new Date(b.endsAt).toLocaleString("es-DO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: timezone,
                })}
              </p>
              {b.reason && <p className="mt-0.5 text-xs text-neutral-500">{b.reason}</p>}
            </div>
            {!readOnly && (
              <button
                onClick={() => handleDelete(b.id)}
                disabled={pending && deletingId === b.id}
                className="text-xs font-medium text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
        {blocks.length === 0 && (
          <p className="text-sm text-neutral-500">Sin bloqueos próximos.</p>
        )}
      </div>
    </div>
  );
}
