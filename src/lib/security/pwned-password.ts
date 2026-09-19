/**
 * Checks a password against the HaveIBeenPwned Pwned Passwords database,
 * the same protection Supabase's own "Leaked Password Protection" offers —
 * that one is gated behind their Pro plan, this replicates it for free.
 *
 * Uses k-anonymity: only the first 5 hex characters of the password's SHA-1
 * hash are ever sent over the network. The full password and full hash never
 * leave the browser. See https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-1", encoder.encode(password));
  const hashHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  // Fail open on every failure mode (blocked by CSP, offline, slow, non-2xx):
  // an unreachable API must never block or hang account creation.
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;

    const body = await response.text();
    return body.split("\n").some((line) => line.split(":")[0].trim() === suffix);
  } catch {
    return false;
  }
}
