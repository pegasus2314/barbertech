"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPasswordPwned } from "@/lib/security/pwned-password";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (await isPasswordPwned(password)) {
        setError(
          "Esta contraseña apareció en filtraciones de datos conocidas. Por tu seguridad, elige otra.",
        );
        return;
      }

      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    } catch {
      setError("No se pudo crear la cuenta. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff8e9] text-xl">
          ✉️
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-[#171717]">Revisa tu correo</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Te enviamos un enlace de confirmación a <strong className="text-neutral-800">{email}</strong>.
          Ábrelo para activar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight text-[#171717]">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Empieza a gestionar tu barbería en minutos.
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#fff8e9] px-3 py-2 text-xs font-semibold text-[#8b6729]">
        ✓ 6 días de prueba gratis, sin tarjeta. Después, desde RD$999/mes.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700">
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e7e3da] px-3.5 py-2.5 text-sm focus:border-[#c7a15a] focus:outline-none focus:ring-1 focus:ring-[#c7a15a]"
          />
        </div>
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
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
            Contraseña
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
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-[#9d7837] hover:text-[#7f602d]">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
