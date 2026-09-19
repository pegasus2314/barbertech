"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPasswordPwned } from "@/lib/security/pwned-password";
import { getPendingInvite, acceptInvite } from "./actions";

type Status = "checking" | "ready" | "invalid";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [invite, setInvite] = useState<{ displayName: string; barbershopName: string } | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Invite and recovery emails sent by the server arrive as
    // #access_token=…&refresh_token=… (implicit flow). The browser client is
    // PKCE and refuses those URLs, so it never creates the session on its own
    // — read the tokens here and set the session explicitly.
    async function sessionFromUrl() {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) return;
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      // Don't leave tokens sitting in the address bar / history.
      window.history.replaceState(null, "", window.location.pathname);
    }

    sessionFromUrl()
      .catch(() => {})
      .then(() => supabase.auth.getSession())
      .then(async ({ data: { session } }) => {
        if (!session) {
          setStatus("invalid");
          return;
        }
        try {
          const result = await getPendingInvite();
          if (!result.ok) {
            setStatus("invalid");
            return;
          }
          setInvite({ displayName: result.displayName, barbershopName: result.barbershopName });
          setStatus("ready");
        } catch {
          setStatus("invalid");
        }
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
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    let result;
    try {
      result = await acceptInvite();
    } catch {
      setLoading(false);
      setError("No se pudo completar. Intenta de nuevo en un momento.");
      return;
    }
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(result.slug ? `/dashboard/${result.slug}` : "/dashboard");
    router.refresh();
  }

  if (status === "checking") {
    return <p className="text-center text-sm text-neutral-500">Verificando invitación...</p>;
  }

  if (status === "invalid" || !invite) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl">⚠️</div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-[#171717]">Enlace inválido o vencido</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Pídele al dueño de la barbería que te invite de nuevo.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[#9d7837] hover:text-[#7f602d]">
          ← Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight text-[#171717]">
        Hola, {invite.displayName.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Te invitaron a unirte a <strong className="text-neutral-800">{invite.barbershopName}</strong> en
        BarberTech. Crea una contraseña para entrar.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          {loading ? "Uniéndote..." : "Unirme a la barbería"}
        </button>
      </form>
    </>
  );
}
