import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Service-role client: bypasses RLS entirely. Only ever import this from
// server-only code that needs cross-user reads the anon/session clients
// can't do by design — right now, just reading push_subscriptions across
// every member of a tenant to send a Web Push after a public booking.
// Never import this from a "use client" file or expose it to the browser.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
