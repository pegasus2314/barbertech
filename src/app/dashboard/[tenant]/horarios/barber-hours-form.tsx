"use client";

import { useState, useTransition } from "react";
import { updateBarberHours } from "./actions";
import { BUTTON_PRIMARY } from "@/lib/ui";

type Mode = "general" | "custom" | "off";

type Row = {
  weekday: number;
  label: string;
  mode: Mode;
  openTime: string;
  closeTime: string;
};

const MODE_LABELS: Record<Mode, string> = {
  general: "Horario general",
  custom: "Personalizado",
  off: "Libre",
};

export function BarberHoursForm({
  tenant,
  barberId,
  initialRows,
  readOnly,
}: {
  tenant: string;
  barberId: string;
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
      const result = await updateBarberHours(
        tenant,
        barberId,
        rows.map((r) => ({
          weekday: r.weekday,
          mode: r.mode,
          openTime: r.openTime,
          closeTime: r.closeTime,
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
    <form onSubmit={handleSubmit}>
      <div className="divide-y divide-[#eeeae2]">
        {rows.map((row) => (
          <div key={row.weekday} className="flex flex-wrap items-center gap-3 py-3">
            <span className="w-24 text-sm font-semibold text-neutral-900">{row.label}</span>

            <select
              value={row.mode}
              disabled={readOnly}
              onChange={(e) => updateRow(row.weekday, { mode: e.target.value as Mode })}
              className="rounded-lg border border-[#e7e3da] px-2 py-1 text-sm"
            >
              {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </select>

            {row.mode === "custom" && (
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
            {pending ? "Guardando..." : "Guardar horario individual"}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-700">Guardado</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </form>
  );
}
