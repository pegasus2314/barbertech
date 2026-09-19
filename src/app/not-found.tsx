import Link from "next/link";

export const metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-5 text-[#171717]">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#171717] text-lg font-black text-[#f5d89a]">
          B
        </span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Error 404</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Esta página no existe</h1>
        <p className="mt-3 text-sm leading-relaxed text-black/55">
          El enlace puede estar mal escrito, o la barbería ya no tiene su página publicada.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Ir al inicio
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[#e7e3da] bg-white px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-[#c7a15a] hover:bg-[#fffaf0]"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
