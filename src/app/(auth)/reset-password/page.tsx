"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPasswordPwned } from "@/lib/security/pwned-password";

type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // The recovery link logs the browser in with a temporary session (that's
    // how Supabase confirms "yes, this person owns this email") — we just
    // check it landed, we never see or need the token itself.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "ready" : "invalid");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);

    if (await isPasswordPwned(password)) {
      setError("Esta contraseña apareció en filtraciones de datos conocidas. Por tu seguridad, elige otra.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (status === "checking") {
    return <p className="text-center text-sm text-neutral-500">Verificando enlace...</p>;
  }

  if (status === "invalid") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl">⚠️</div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-[#171717]">Enlace inválido o vencido</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Pide un nuevo enlace para restablecer tu contraseña.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Pedir enlace nuevo
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight text-[#171717]">Crea una nueva contraseña</h1>
      <p className="mt-1 text-sm text-neutral-500">Elige una contraseña que no hayas usado antes.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e7e3da] px-3.5 py-2.5 text-sm focus:border-[#c7a15a] focus:outline-none focus:ring-1 focus:ring-[#c7a15a]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#171717] px-3 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </>
  );
}
