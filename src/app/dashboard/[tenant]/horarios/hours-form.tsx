"use client";

import { useState, useTransition } from "react";
import { updateBusinessHours } from "./actions";

type Row = {
  weekday: number;
  label: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export function HoursForm({
  tenant,
  initialRows,
  readOnly,
}: {
  tenant: string;
  initialRows: Row[];
  readOnly: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(weekday: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessHours(
        tenant,
        rows.map((r) => ({
          weekday: r.weekday,
          openTime: r.openTime,
          closeTime: r.closeTime,
          isClosed: r.isClosed,
        })),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="divide-y divide-neutral-100">
        {rows.map((row) => (
          <div key={row.weekday} className="flex flex-wrap items-center gap-3 py-3">
            <span className="w-24 text-sm font-medium text-neutral-900">{row.label}</span>

            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <input
                type="checkbox"
                checked={!row.isClosed}
                disabled={readOnly}
                onChange={(e) => updateRow(row.weekday, { isClosed: !e.target.checked })}
              />
              Abierto
            </label>

            {!row.isClosed && (
              <>
                <input
                  type="time"
                  value={row.openTime}
                  disabled={readOnly}
                  onChange={(e) => updateRow(row.weekday, { openTime: e.target.value })}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                />
                <span className="text-neutral-400">—</span>
                <input
                  type="time"
                  value={row.closeTime}
                  disabled={readOnly}
                  onChange={(e) => updateRow(row.weekday, { closeTime: e.target.value })}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Guardar horarios"}
          </button>
          {saved && <span className="text-sm text-green-700">Guardado</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </form>
  );
}
