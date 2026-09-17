"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extendTrial } from "../actions";

const OPTIONS = [7, 14, 30];

export function ExtendTrial({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<number | null>(null);

  function handleExtend(days: number) {
    startTransition(async () => {
      const result = await extendTrial(tenantId, days);
      if (result.ok) {
        setDone(days);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((days) => (
          <button
            key={days}
            onClick={() => handleExtend(days)}
            disabled={pending}
            className="rounded-lg border border-[#e7e3da] px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-[#c7a15a] hover:bg-[#fffaf0] disabled:opacity-50"
          >
            +{days} días de prueba
          </button>
        ))}
      </div>
      {done && <p className="mt-2 text-xs text-emerald-700">Prueba extendida {done} días.</p>}
    </div>
  );
}
