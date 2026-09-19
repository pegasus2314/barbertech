"use client";

import { useOptimisticAction } from "@/lib/use-optimistic-action";
import { resolveSupportMessage } from "../actions";

export function ResolveButton({ id }: { id: string }) {
  const { value: resolved, pending, run } = useOptimisticAction(false);

  if (resolved) return <span className="text-xs font-semibold text-emerald-700">✓ Resuelto</span>;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(true, () => resolveSupportMessage(id))}
      className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d] disabled:opacity-50"
    >
      Marcar como resuelto
    </button>
  );
}
