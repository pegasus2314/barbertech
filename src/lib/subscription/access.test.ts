import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessState } from "./access";

const NOW = new Date("2026-09-20T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function daysFromNow(days: number) {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe("getAccessState", () => {
  it("is full access during the trial", () => {
    const state = getAccessState({
      barbershopStatus: "trial",
      subscriptionStatus: "trial",
      trialEndsAt: daysFromNow(2),
      currentPeriodEnd: null,
    });
    expect(state).toBe("full");
  });

  it("enters grace the day the trial ends", () => {
    const state = getAccessState({
      barbershopStatus: "trial",
      subscriptionStatus: "trial",
      trialEndsAt: daysFromNow(-0.5),
      currentPeriodEnd: null,
    });
    expect(state).toBe("grace");
  });

  it("stays in grace through day 3 after trial end", () => {
    const state = getAccessState({
      barbershopStatus: "trial",
      subscriptionStatus: "trial",
      trialEndsAt: daysFromNow(-2.9),
      currentPeriodEnd: null,
    });
    expect(state).toBe("grace");
  });

  it("blocks once the grace window is over", () => {
    const state = getAccessState({
      barbershopStatus: "trial",
      subscriptionStatus: "trial",
      trialEndsAt: daysFromNow(-3.1),
      currentPeriodEnd: null,
    });
    expect(state).toBe("blocked");
  });

  it("is full access with a confirmed active subscription in its paid period", () => {
    const state = getAccessState({
      barbershopStatus: "active",
      subscriptionStatus: "active",
      trialEndsAt: daysFromNow(-40),
      currentPeriodEnd: daysFromNow(10),
    });
    expect(state).toBe("full");
  });

  it("falls back to grace/blocked once a paid period lapses without renewal", () => {
    const grace = getAccessState({
      barbershopStatus: "active",
      subscriptionStatus: "active",
      trialEndsAt: daysFromNow(-40),
      currentPeriodEnd: daysFromNow(-1),
    });
    expect(grace).toBe("grace");

    const blocked = getAccessState({
      barbershopStatus: "active",
      subscriptionStatus: "active",
      trialEndsAt: daysFromNow(-40),
      currentPeriodEnd: daysFromNow(-4),
    });
    expect(blocked).toBe("blocked");
  });

  it("regression: a lapsed paid period blocks even if trial_ends_at is still numerically in the future", () => {
    // Real bug found manually: a shop upgraded from trial to a paid period,
    // that period later lapsed, but trial_ends_at (set once at signup, long
    // unused) still pointed to a date after "now". The first implementation
    // treated that stale trial date as a fallback and granted full access.
    const state = getAccessState({
      barbershopStatus: "active",
      subscriptionStatus: "active",
      trialEndsAt: daysFromNow(9),
      currentPeriodEnd: daysFromNow(-5),
    });
    expect(state).toBe("blocked");
  });

  it("a manual admin suspension always blocks, even mid-trial", () => {
    const state = getAccessState({
      barbershopStatus: "suspended",
      subscriptionStatus: "trial",
      trialEndsAt: daysFromNow(5),
      currentPeriodEnd: null,
    });
    expect(state).toBe("blocked");
  });
});
