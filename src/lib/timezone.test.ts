import { describe, expect, it } from "vitest";
import { zonedDayBounds } from "./timezone";

describe("zonedDayBounds", () => {
  it("computes midnight-to-midnight in the given timezone, not UTC", () => {
    // 2026-09-16T02:00:00Z is already Sept 16 in UTC, but still Sept 15
    // evening in America/Santo_Domingo (UTC-4) — the whole point of the bug
    // this replaces: the server's own "today" doesn't match the shop's.
    const reference = new Date("2026-09-16T02:00:00Z");
    const { start, end } = zonedDayBounds("America/Santo_Domingo", reference);

    // Midnight in Santo Domingo (UTC-4) on Sept 15 is 04:00 UTC.
    expect(start.toISOString()).toBe("2026-09-15T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-16T03:59:59.999Z");
  });

  it("handles a UTC-based timezone as a no-op offset", () => {
    const reference = new Date("2026-09-16T15:30:00Z");
    const { start, end } = zonedDayBounds("UTC", reference);

    expect(start.toISOString()).toBe("2026-09-16T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-16T23:59:59.999Z");
  });
});
