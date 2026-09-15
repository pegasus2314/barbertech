import { describe, expect, it } from "vitest";
import { timeOfDayGreeting, zonedDayBounds } from "./timezone";

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

describe("timeOfDayGreeting", () => {
  // America/Santo_Domingo is a fixed UTC-4, no DST, so "UTC time - 4h" is
  // always the local hour — makes the reference instants easy to reason about.
  const TZ = "America/Santo_Domingo";

  it("says Buenos días before noon local time", () => {
    expect(timeOfDayGreeting(TZ, new Date("2026-09-16T04:00:00Z"))).toBe("Buenos días"); // 00:00 local
    expect(timeOfDayGreeting(TZ, new Date("2026-09-16T15:00:00Z"))).toBe("Buenos días"); // 11:00 local
  });

  it("says Buenas tardes from noon up to (not including) 7pm local time", () => {
    expect(timeOfDayGreeting(TZ, new Date("2026-09-16T16:00:00Z"))).toBe("Buenas tardes"); // 12:00 local
    expect(timeOfDayGreeting(TZ, new Date("2026-09-16T22:00:00Z"))).toBe("Buenas tardes"); // 18:00 local
  });

  it("says Buenas noches from 7pm local time onward", () => {
    expect(timeOfDayGreeting(TZ, new Date("2026-09-16T23:00:00Z"))).toBe("Buenas noches"); // 19:00 local
    expect(timeOfDayGreeting(TZ, new Date("2026-09-17T03:00:00Z"))).toBe("Buenas noches"); // 23:00 local
  });

  it("uses the shop's own timezone, not the server's", () => {
    // At this instant it's morning in Tokyo (UTC+9) but still the previous
    // evening in Santo Domingo (UTC-4) — same reference, different greeting.
    const reference = new Date("2026-09-16T02:00:00Z");
    expect(timeOfDayGreeting("Asia/Tokyo", reference)).toBe("Buenos días"); // 11:00 local
    expect(timeOfDayGreeting("America/Santo_Domingo", reference)).toBe("Buenas noches"); // 22:00 local
  });
});
