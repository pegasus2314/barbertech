"use client";

import type { Tables } from "@/lib/supabase/types";
import { toggleServiceActive } from "./actions";
import { PILL_ACTIVE, PILL_INACTIVE } from "@/lib/ui";
import { useOptimisticAction } from "@/lib/use-optimistic-action";

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

export function ServiceRow({
  tenant,
  service,
  canManage,
}: {
  tenant: string;
  service: Tables<"services">;
  canManage: boolean;
}) {
  const { value: isActive, pending, run } = useOptimisticAction(service.is_active);

  function handleToggle() {
    run(!isActive, () => toggleServiceActive(tenant, service.id, !isActive));
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-neutral-900">{service.name}</p>
        <p className="text-xs text-neutral-500">
          {formatMoney(service.price_cents)} · {service.duration_minutes} min
        </p>
      </div>
      {canManage && (
        <button
          onClick={handleToggle}
          disabled={pending}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
            isActive ? `${PILL_ACTIVE} hover:bg-emerald-100` : `${PILL_INACTIVE} hover:bg-neutral-200`
          }`}
        >
          {isActive ? "Activo" : "Inactivo"}
        </button>
      )}
    </div>
  );
}
