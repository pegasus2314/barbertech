"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ variant = "light" }: { variant?: "light" | "dark" }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={`text-sm font-medium transition ${
        variant === "dark" ? "text-white/55 hover:text-white" : "text-neutral-500 hover:text-neutral-900"
      }`}
    >
      Cerrar sesión
    </button>
  );
}
