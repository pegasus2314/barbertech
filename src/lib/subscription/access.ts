export const TRIAL_DAYS = 6;
export const GRACE_DAYS = 3;

export type AccessState = "full" | "grace" | "blocked";

/**
 * Derived at read time from trial_ends_at / current_period_end rather than a
 * stored status a cron would need to flip — always correct, no scheduled job
 * required. barbershops.status = 'suspended' is a manual admin override that
 * always wins; everything else is computed from the dates.
 */
export function getAccessState(input: {
  barbershopStatus: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}): AccessState {
  if (input.barbershopStatus === "suspended") return "blocked";

  // current_period_end (a real paid period) supersedes trial_ends_at once it
  // exists — falling back to a stale, long-past-relevant trial date after a
  // paid period has lapsed would wrongly grant access.
  const anchor = input.currentPeriodEnd ?? input.trialEndsAt;
  if (!anchor) return "full";

  const now = new Date();
  if (new Date(anchor) > now) return "full";

  const graceEnd = new Date(anchor);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

  return now <= graceEnd ? "grace" : "blocked";
}

export function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Days left in the grace window, given the trial/period-end date it started counting from. 0 once it's over. */
export function graceDaysLeft(anchorIso: string): number {
  const graceEnd = new Date(anchorIso);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);
  return daysUntil(graceEnd.toISOString());
}
