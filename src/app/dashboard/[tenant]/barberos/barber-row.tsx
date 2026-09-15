"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { setBarberServices, toggleBarberActive } from "./actions";

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
  const router = useRouter();
  const [selected, setSelected] = useState(selectedServiceIds);
  const [pending, startTransition] = useTransition();

  function handleToggleActive() {
    startTransition(async () => {
      await toggleBarberActive(tenant, barber.id, !barber.is_active);
      router.refresh();
    });
  }

  function handleToggleService(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setSelected(next);
    startTransition(async () => {
      await setBarberServices(tenant, barber.id, next);
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-neutral-900">{barber.display_name}</p>
        {canManage && (
          <button
            onClick={handleToggleActive}
            disabled={pending}
            className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
              barber.is_active
                ? "bg-green-50 text-green-700 hover:bg-green-100"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
            }`}
          >
            {barber.is_active ? "Activo" : "Inactivo"}
          </button>
        )}
      </div>

      {canManage && services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleToggleService(service.id)}
              disabled={pending}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                selected.includes(service.id)
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
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
