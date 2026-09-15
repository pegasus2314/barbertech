"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { changePlan } from "../actions";

export function PlanSelector({
  tenantId,
  plans,
  currentPlanId,
}: {
  tenantId: string;
  plans: Tables<"plans">[];
  currentPlanId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(planId: string) {
    startTransition(async () => {
      await changePlan(tenantId, planId);
      router.refresh();
    });
  }

  return (
    <select
      defaultValue={currentPlanId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={pending}
      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
    >
      <option value="" disabled>
        Elige un plan
      </option>
      {plans.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
