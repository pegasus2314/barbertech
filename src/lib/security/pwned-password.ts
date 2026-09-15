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

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!response.ok) {
    // Fail open: an unreachable API shouldn't block account creation.
    return false;
  }

  const body = await response.text();
  return body.split("\n").some((line) => line.split(":")[0] === suffix);
}
