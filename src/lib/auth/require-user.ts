import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// getClaims() verifies the JWT signature locally against the project's cached
// public keys (asymmetric signing) — no round trip to Supabase Auth, unlike
// getUser(). Data access is still enforced by RLS with the same JWT.
//
// cache() memoizes per request, so the layout and the page (which both call
// this) share one verification and one Supabase client.
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  const user = { id: data.claims.sub, email: data.claims.email };
  return { supabase, user };
});
