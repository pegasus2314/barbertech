import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * These credentials only work against the dedicated QA fixtures seeded in
 * Supabase for this project (see ARCHITECTURE.md) — they are not secrets,
 * the accounts have no access beyond their own test barbershop.
 */
export const TEST_USERS = {
  owner: { email: "owner.qa@barbertech.test", password: "SuperClave123!" },
  admin: { email: "admin.qa@barbertech.test", password: "SuperClave123!" },
  intruder: { email: "intruder.qa@barbertech.test", password: "SuperClave123!" },
} as const;

function url() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

/** A fresh, unauthenticated client — exactly what a real anonymous visitor gets. */
export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(url(), anonKey());
}

/** A client signed in as one of TEST_USERS, via the real Auth API (no mocking). */
export async function signInAs(user: { email: string; password: string }): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url(), anonKey());
  const { error } = await client.auth.signInWithPassword(user);
  if (error) throw new Error(`Failed to sign in as ${user.email}: ${error.message}`);
  return client;
}

/** Every test barbershop this suite creates must use this prefix — it's the
 * only thing cleanup_test_barbershop() will delete. */
export function testSlug(): string {
  return `zzz-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
