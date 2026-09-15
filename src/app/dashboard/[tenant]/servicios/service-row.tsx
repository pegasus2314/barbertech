"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { toggleServiceActive } from "./actions";

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleServiceActive(tenant, service.id, !service.is_active);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-neutral-900">{service.name}</p>
        <p className="text-xs text-neutral-500">
          {formatMoney(service.price_cents)} · {service.duration_minutes} min
        </p>
      </div>
      {canManage && (
        <button
          onClick={handleToggle}
          disabled={pending}
          className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
            service.is_active
              ? "bg-green-50 text-green-700 hover:bg-green-100"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          }`}
        >
          {service.is_active ? "Activo" : "Inactivo"}
        </button>
      )}
    </div>
  );
}
