"use client";

import { useRouter } from "next/navigation";
import { INPUT } from "@/lib/ui";

export function MonthPicker({ tenant, year, month }: { tenant: string; year: number; month: number }) {
  const router = useRouter();
  const value = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <input
      type="month"
      value={value}
      onChange={(e) => {
        if (e.target.value) router.push(`/dashboard/${tenant}/estadisticas?month=${e.target.value}`);
      }}
      className={INPUT}
    />
  );
}
