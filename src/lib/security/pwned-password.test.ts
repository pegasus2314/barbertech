import { afterEach, describe, expect, it, vi } from "vitest";
import { isPasswordPwned } from "./pwned-password";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
// -> range prefix "5BAA6", suffix "1E4C9B93F3F0682250B6CF8331B7EE68FD8"
const PASSWORD = "password";
const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("isPasswordPwned", () => {
  it("returns true when the API range response includes the hash suffix", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`${SUFFIX}:3730471\nOTHERSUFFIX00000000000000000000000:2`),
      }),
    );

    await expect(isPasswordPwned(PASSWORD)).resolves.toBe(true);
  });

  it("returns false when the suffix isn't in the range response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("SOMEOTHERSUFFIX0000000000000000000:1"),
      }),
    );

    await expect(isPasswordPwned(PASSWORD)).resolves.toBe(false);
  });

  it("only ever sends the 5-character hash prefix, never the password or full hash", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);

    await isPasswordPwned(PASSWORD);

    // Pinning the exact URL proves nothing beyond the 5-char prefix was
    // sent — the full hash suffix (let alone the password) never appears.
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.pwnedpasswords.com/range/5BAA6",
      expect.anything(),
    );
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain(SUFFIX);
  });

  it("fails open (returns false) if the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("") }));

    await expect(isPasswordPwned(PASSWORD)).resolves.toBe(false);
  });

  it("fails open when the request throws (blocked by CSP, offline, timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(isPasswordPwned(PASSWORD)).resolves.toBe(false);
  });
});
