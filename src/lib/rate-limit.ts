import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function clientIp(): Promise<string> {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// Records this attempt and returns false once `limit` attempts for the same
// key+action have happened within `windowMinutes`. Fails open (returns true)
// if the check itself errors, so a database hiccup never blocks real users.
export async function checkRateLimit(
  key: string,
  action: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

    const { count } = await admin
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("key", key)
      .eq("action", action)
      .gte("created_at", since);

    if ((count ?? 0) >= limit) return false;

    await admin.from("rate_limits").insert({ key, action });
    return true;
  } catch {
    return true;
  }
}
