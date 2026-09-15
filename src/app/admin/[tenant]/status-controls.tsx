"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBarbershopStatus } from "../actions";

const STATUSES = ["trial", "active", "past_due", "grace", "suspended"];

export function StatusControls({
  tenantId,
  currentStatus,
}: {
  tenantId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(status: string) {
    startTransition(async () => {
      await setBarbershopStatus(tenantId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((status) => (
        <button
          key={status}
          onClick={() => handleChange(status)}
          disabled={pending || status === currentStatus}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
            status === currentStatus
              ? "border-[#171717] bg-[#171717] text-white"
              : "border-[#e7e3da] text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
