"use client";

import { useState, useTransition } from "react";
import type { Tables } from "@/lib/supabase/types";
import { setBarberServices, toggleBarberActive } from "./actions";
import { CARD, PILL_ACTIVE, PILL_INACTIVE } from "@/lib/ui";
import { useOptimisticAction } from "@/lib/use-optimistic-action";

export function BarberRow({
  tenant,
  barber,
  services,
  selectedServiceIds,
  canManage,
}: {
  tenant: string;
  barber: Tables<"barbers">;
  services: { id: string; name: string }[];
  selectedServiceIds: string[];
  canManage: boolean;
}) {
  const [selected, setSelected] = useState(selectedServiceIds);
  const [servicesPending, startTransition] = useTransition();
  const { value: isActive, pending: activePending, run: runToggleActive } = useOptimisticAction(barber.is_active);

  function handleToggleActive() {
    runToggleActive(!isActive, () => toggleBarberActive(tenant, barber.id, !isActive));
  }

  function handleToggleService(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setSelected(next);
    startTransition(async () => {
      await setBarberServices(tenant, barber.id, next);
    });
  }

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f6f2] text-sm font-bold text-neutral-600">
            {barber.display_name.slice(0, 1).toUpperCase()}
          </span>
          <p className="text-sm font-semibold text-neutral-900">{barber.display_name}</p>
        </div>
        {canManage && (
          <button
            onClick={handleToggleActive}
            disabled={activePending}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
              isActive ? `${PILL_ACTIVE} hover:bg-emerald-100` : `${PILL_INACTIVE} hover:bg-neutral-200`
            }`}
          >
            {isActive ? "Activo" : "Inactivo"}
          </button>
        )}
      </div>

      {canManage && services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleToggleService(service.id)}
              disabled={servicesPending}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                selected.includes(service.id)
                  ? "border-[#171717] bg-[#171717] text-white"
                  : "border-[#e7e3da] text-neutral-600 hover:border-[#c7a15a]"
              }`}
            >
              {service.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
