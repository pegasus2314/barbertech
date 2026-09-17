"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";

// Shared pattern for a button that flips one value (a status, an
// active/inactive toggle) via a Server Action: show the new value the
// instant it's clicked instead of waiting for the round trip, then
// reconcile with the server once router.refresh() lands. If the action
// fails, the optimistic value simply snaps back once the real prop comes
// back unchanged — same as before, just without the wait up front.
export function useOptimisticAction<T>(value: T) {
  const router = useRouter();
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);
  const [pending, startTransition] = useTransition();

  function run(next: T, action: () => Promise<unknown>) {
    startTransition(async () => {
      setOptimisticValue(next);
      await action();
      router.refresh();
    });
  }

  return { value: optimisticValue, pending, run };
}
