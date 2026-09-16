import { describe, expect, it } from "vitest";
import { timeOfDayGreeting, zonedDayBounds, zonedMonthBounds } from "./timezone";

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

describe("zonedMonthBounds", () => {
  it("spans the 1st through the last day of a 31-day month in the shop's timezone", () => {
    const { start, end } = zonedMonthBounds("America/Santo_Domingo", 2026, 9);

    expect(start.toISOString()).toBe("2026-09-01T04:00:00.000Z"); // Sept 1, 00:00 local (UTC-4)
    expect(end.toISOString()).toBe("2026-10-01T03:59:59.999Z"); // Sept 30, 23:59:59.999 local
  });

  it("gets February's day count right (including a leap year)", () => {
    const { end: end2027 } = zonedMonthBounds("UTC", 2027, 2);
    expect(end2027.toISOString()).toBe("2027-02-28T23:59:59.999Z");

    const { end: end2028 } = zonedMonthBounds("UTC", 2028, 2); // 2028 is a leap year
    expect(end2028.toISOString()).toBe("2028-02-29T23:59:59.999Z");
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
