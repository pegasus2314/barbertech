"use client";

import { useState, useTransition } from "react";
import { updateBusinessHours } from "./actions";
import { BUTTON_PRIMARY, CARD } from "@/lib/ui";

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
    <form onSubmit={handleSubmit} className={`${CARD} p-5`}>
      <div className="divide-y divide-[#eeeae2]">
        {rows.map((row) => (
          <div key={row.weekday} className="flex flex-wrap items-center gap-3 py-3">
            <span className="w-24 text-sm font-semibold text-neutral-900">{row.label}</span>

            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <input
                type="checkbox"
                checked={!row.isClosed}
                disabled={readOnly}
                onChange={(e) => updateRow(row.weekday, { isClosed: !e.target.checked })}
                className="accent-[#c7a15a]"
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
                  className="rounded-lg border border-[#e7e3da] px-2 py-1 text-sm"
                />
                <span className="text-neutral-400">—</span>
                <input
                  type="time"
                  value={row.closeTime}
                  disabled={readOnly}
                  onChange={(e) => updateRow(row.weekday, { closeTime: e.target.value })}
                  className="rounded-lg border border-[#e7e3da] px-2 py-1 text-sm"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
            {pending ? "Guardando..." : "Guardar horarios"}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-700">Guardado</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </form>
  );
}
