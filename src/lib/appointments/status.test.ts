import { describe, expect, it } from "vitest";
import { nextStatuses } from "./status";

// This table must stay identical to the `allowed` jsonb map inside the
// enforce_appointment_status_transition() trigger in
// supabase/migrations/0001_init.sql. The UI only offers transitions this
// function allows, but the database is the real enforcement point — if the
// two drift apart, the UI will offer a transition the trigger then rejects.
const EXPECTED: Record<string, string[]> = {
  pending: ["confirmed", "cancelled", "rejected"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

describe("nextStatuses", () => {
  it.each(Object.entries(EXPECTED))("matches the DB trigger for %s", (status, expected) => {
    expect(nextStatuses(status)).toEqual(expected);
  });

  it("returns an empty array for an unknown status", () => {
    expect(nextStatuses("bogus")).toEqual([]);
  });
});
