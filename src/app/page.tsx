import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 px-4 py-24 text-center">
      <span className="text-2xl font-semibold tracking-tight text-neutral-900">BarberTech</span>
      <h1 className="mt-4 max-w-md text-lg text-neutral-600">
        Administra tu barbería y deja que tus clientes reserven citas en línea, sin crear tu
        propia página web.
      </h1>
      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Crear mi barbería
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
