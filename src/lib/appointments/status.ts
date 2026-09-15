const ALLOWED_NEXT: Record<string, string[]> = {
  pending: ["confirmed", "cancelled", "rejected"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

export function nextStatuses(current: string) {
  return ALLOWED_NEXT[current] ?? [];
}
