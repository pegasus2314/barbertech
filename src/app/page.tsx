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
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-base font-semibold tracking-tight text-neutral-900">
            BarberTech
          </span>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-neutral-600 hover:text-neutral-900 sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              Crear mi barbería
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pb-28 sm:pt-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
              Reservas en línea para barberías
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
              Tu barbería, con página propia y citas que se llenan solas.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-balance text-lg leading-relaxed text-neutral-500">
              Un enlace para tus clientes. Un panel para ti. Sin código, sin diseñador, sin
              complicaciones.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 sm:w-auto"
              >
                Crear mi barbería — gratis
              </Link>
              <Link
                href="/login"
                className="w-full rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 sm:w-auto"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          <div className="relative mx-auto mt-20 max-w-3xl">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(closest-side,rgba(0,0,0,0.04),transparent)]" />
            <PreviewCard />
          </div>
        </section>

        <section className="border-y border-neutral-200 bg-neutral-50">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-3 sm:py-20">
            <Step
              number="01"
              title="Configura tu negocio"
              body="Nombre, servicios, barberos y horarios. Listo en minutos, sin formularios eternos."
            />
            <Step
              number="02"
              title="Comparte tu enlace"
              body="tudominio.com/tu-barbería. Ponlo en Instagram, WhatsApp o tu perfil de Google."
            />
            <Step
              number="03"
              title="Recibe citas"
              body="Tus clientes eligen servicio, barbero y hora. Tú solo confirmas desde el panel."
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">
              Todo lo que tu barbería necesita
            </h2>
            <p className="mt-4 text-neutral-500">
              Un solo lugar para administrar la operación diaria y la presencia en línea.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2">
            <Feature title="Página pública" body="Servicios, barberos, galería y horario, lista para compartir." />
            <Feature title="Calendario de citas" body="Estados claros: pendiente, confirmada, completada." />
            <Feature title="Clientes" body="Historial, notas y gasto total, sin hojas de cálculo." />
            <Feature title="Finanzas simples" body="Registra pagos en efectivo o transferencia al momento." />
          </div>
        </section>

        <section className="border-t border-neutral-200">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-24">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">
              Tu página está a un minuto de existir.
            </h2>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              Crear mi barbería
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-neutral-400 sm:flex-row">
          <span>© {new Date().getFullYear()} BarberTech</span>
          <span>Hecho para barberías reales.</span>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-neutral-400">{number}</span>
      <h3 className="mt-2 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white p-6">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
    </div>
  );
}

function PreviewCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.15)]">
      <div className="h-28 bg-neutral-900 sm:h-36" />
      <div className="px-6 pb-6 pt-10 sm:px-8">
        <div className="-mt-16 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-neutral-100 text-lg font-semibold text-neutral-700 sm:h-16 sm:w-16">
          B
        </div>
        <p className="text-lg font-semibold text-neutral-900">Barber King</p>
        <p className="mt-1 text-sm text-neutral-500">Cortes clásicos y fade. Santo Domingo.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
            Corte — RD$500
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
            Corte + barba — RD$700
          </span>
        </div>
        <div className="mt-6 h-9 w-32 rounded-full bg-neutral-900" />
      </div>
    </div>
  );
}
