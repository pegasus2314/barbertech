import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { siteUrl } from "./site-url";

const ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("siteUrl", () => {
  it("falls back to localhost when nothing is set", () => {
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("prefers VERCEL_PROJECT_PRODUCTION_URL over localhost", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "barbertech-web.vercel.app";
    expect(siteUrl()).toBe("https://barbertech-web.vercel.app");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over VERCEL_PROJECT_PRODUCTION_URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "barbertech-web.vercel.app";
    process.env.NEXT_PUBLIC_SITE_URL = "https://barbertech.app";
    expect(siteUrl()).toBe("https://barbertech.app");
  });
});
