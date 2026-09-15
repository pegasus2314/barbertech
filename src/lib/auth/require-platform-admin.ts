import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";

export async function requirePlatformAdmin() {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error || !data) {
    redirect("/dashboard");
  }

  return { supabase, user };
}
