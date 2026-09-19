"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public on purpose: the support form is also reachable from the landing and
// legal pages, where nobody is signed in. Abuse is bounded by an IP rate limit.
export async function sendSupportMessage(input: { email: string; message: string; context?: string }) {
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();
  const context = input.context?.trim().slice(0, 120) || null;

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false as const, error: "Escribe un correo válido para poder responderte." };
  }
  if (message.length < 5) return { ok: false as const, error: "Cuéntanos un poco más sobre lo que necesitas." };
  if (message.length > 2000) return { ok: false as const, error: "El mensaje es demasiado largo (máximo 2000 caracteres)." };

  const ip = await clientIp();
  if (!(await checkRateLimit(ip, "support_message", 5, 60))) {
    return { ok: false as const, error: "Enviaste varios mensajes seguidos. Intenta de nuevo en un rato." };
  }

  // Attach the account when signed in (verified server-side, never client-supplied).
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;

  const { error } = await createAdminClient()
    .from("support_messages")
    .insert({ email, message, context, user_id: userId });
  if (error) return { ok: false as const, error: "No se pudo enviar. Intenta de nuevo en un momento." };

  return { ok: true as const };
}
