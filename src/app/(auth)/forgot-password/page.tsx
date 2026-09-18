"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/site-url";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/reset-password`,
    });

    setLoading(false);

    // Always show the same confirmation, whether or not the email exists —
    // otherwise this becomes a way to check which emails have an account.
    if (resetError) {
      setError("No se pudo enviar el correo. Intenta de nuevo en un momento.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff8e9] text-xl">
          ✉️
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-[#171717]">Revisa tu correo</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Si <strong className="text-neutral-800">{email}</strong> tiene una cuenta, te enviamos un
          enlace para restablecer tu contraseña.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[#9d7837] hover:text-[#7f602d]">
          ← Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Volver a iniciar sesión
      </Link>
      <h1 className="text-xl font-bold tracking-tight text-[#171717]">¿Olvidaste tu contraseña?</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Escribe tu correo y te mandamos un enlace para crear una nueva.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e7e3da] px-3.5 py-2.5 text-sm focus:border-[#c7a15a] focus:outline-none focus:ring-1 focus:ring-[#c7a15a]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#171717] px-3 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>
    </>
  );
}
