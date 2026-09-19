// Landing — desarrollado por Albert Silvestre
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { waLink } from "@/lib/whatsapp";
import { SupportBubble } from "@/components/support-bubble";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 });
}

export default async function Home() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims?.sub) redirect("/dashboard");

  const { data: plans } = await supabase
    .from("plans")
    .select("id, key, name, price_cents")
    .order("sort_order");

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#171717]">
      <SupportBubble />
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f7f6f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171717] text-sm font-black text-[#f5d89a] shadow-lg shadow-black/10">B</span>
            <span className="text-lg font-bold tracking-tight">BarberTech</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-7">
            <a href="#funciones" className="hidden text-sm font-medium text-black/60 hover:text-black sm:block">Funciones</a>
            <a href="#como-funciona" className="hidden text-sm font-medium text-black/60 hover:text-black md:block">Cómo funciona</a>
            <a href="#precios" className="hidden text-sm font-medium text-black/60 hover:text-black md:block">Precios</a>
            <Link href="/login" className="text-sm font-semibold text-black/70 hover:text-black">Entrar</Link>
            <Link href="/signup" className="rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/15 hover:-translate-y-0.5 hover:bg-black">Empezar</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(199,161,90,0.18),transparent_30%),radial-gradient(circle_at_85%_35%,rgba(23,23,23,0.08),transparent_28%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/40 bg-[#fffaf0] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6729]">
                <span className="h-2 w-2 rounded-full bg-[#c7a15a]" />
                El sistema para tu barbería
              </div>
              <h1 className="max-w-3xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.7rem]">
                Menos mensajes. <span className="text-[#a47d36]">Más citas.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-black/60 sm:text-xl">
                BarberTech convierte tu barbería en un negocio más organizado: página propia, reservas online, agenda, clientes y finanzas en un solo lugar.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center rounded-2xl bg-[#171717] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-black/15 hover:-translate-y-0.5 hover:bg-black">
                  Crear mi barbería <span className="ml-2">→</span>
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-white/60 px-6 py-4 text-sm font-bold text-black/75 hover:bg-white">
                  Ya tengo una cuenta
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-black/45">
                <span>✓ 6 días de prueba gratis</span><span>✓ Sin tarjeta para empezar</span><span>✓ Cancela cuando quieras</span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="como-funciona" className="border-y border-[#e4dfd5] bg-white/60">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47d36]">Así de simple</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Tu operación, bajo control.</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <Step number="01" title="Configura" body="Añade tu barbería, servicios, barberos y horarios. Sin complicarte." />
              <Step number="02" title="Comparte" body="Publica tu enlace de reservas en WhatsApp, Instagram o donde quieras." />
              <Step number="03" title="Administra" body="Controla citas, clientes, pagos y el día a día desde tu panel." />
            </div>
          </div>
        </section>

        <section id="funciones" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47d36]">Todo en un solo sitio</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Hecho para el ritmo real de una barbería.</h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-black/55 lg:justify-self-end">Deja atrás las agendas improvisadas y los mensajes perdidos. BarberTech reúne las herramientas que necesitas para atender mejor y trabajar con más orden.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon="01" title="Reservas online" body="Tus clientes pueden reservar desde tu página pública." />
            <Feature icon="02" title="Agenda" body="Visualiza las citas y sus estados de forma clara." />
            <Feature icon="03" title="Clientes" body="Consulta historial, notas y relación con cada cliente." />
            <Feature icon="04" title="Finanzas" body="Registra pagos y conoce mejor el movimiento de tu negocio." />
          </div>
        </section>

        <section id="precios" className="border-y border-[#e4dfd5] bg-white/60">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47d36]">Precios</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Empieza gratis, crece cuando lo necesites.</h2>
              <p className="mt-4 text-lg leading-7 text-black/55">
                Todo plan incluye <strong className="text-black/75">6 días de prueba gratis</strong>, sin tarjeta. Después, elige el plan que se ajuste a tu barbería.
              </p>
            </div>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {(plans ?? []).map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-black/40">Precios en pesos dominicanos (DOP). Pago por transferencia o efectivo, sin comisiones ocultas.</p>
            <p className="mt-3 text-center text-sm text-black/50">
              ¿Prefieres hablar antes?{" "}
              <a
                href={waLink("18496510308", "Estoy interesado en comprar")!}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#25D366] hover:underline"
              >
                Escríbenos por WhatsApp
              </a>
            </p>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#171717] px-7 py-12 text-white shadow-2xl shadow-black/20 sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e2c17f]">Tu siguiente paso</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">Haz que reservar en tu barbería sea tan fácil como reservar un taxi.</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/55">Empieza a construir una experiencia más profesional para tus clientes desde hoy.</p>
            </div>
            <Link href="/signup" className="mt-8 inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#c7a15a] px-6 py-4 text-sm font-black text-[#171717] hover:-translate-y-0.5 hover:bg-[#d5b36c] lg:mt-0">Crear mi barbería →</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e4dfd5] bg-white/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-black/45 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2 font-bold text-black/70"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#171717] text-[10px] text-[#f5d89a]">B</span> BarberTech</div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>© {new Date().getFullYear()} BarberTech. Hecho para barberías.</span>
            <Link href="/terminos" className="hover:text-black">Términos</Link>
            <Link href="/privacidad" className="hover:text-black">Privacidad</Link>
          </div>
        </div>
        <div className="border-t border-[#e4dfd5]/70 px-5 py-4 text-center text-xs text-black/35 sm:px-8">
          Desarrollado por <span className="font-semibold text-black/50">Albert Silvestre</span>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-[#e4dfd5] bg-[#f7f6f2] p-7">
      <span className="text-sm font-black text-[#b28a43]">{number}</span>
      <h3 className="mt-8 text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-black/55">{body}</p>
    </div>
  );
}

const PLAN_COPY: Record<string, { tagline: string; bullets: string[]; highlight?: boolean }> = {
  basic: {
    tagline: "Para probar el sistema sin compromiso.",
    bullets: ["1 barbero", "Página de reservas propia", "Agenda y clientes básicos"],
  },
  pro: {
    tagline: "Para profesionales y barberías pequeñas.",
    bullets: ["Hasta 5 barberos", "Citas y clientes ilimitados", "Finanzas y registro de pagos", "Reportes y estadísticas avanzadas"],
    highlight: true,
  },
  premium: {
    tagline: "Para barberías con una operación más grande.",
    bullets: ["Hasta 15 barberos", "Todo lo del plan Pro", "Soporte prioritario y ayuda con la configuración"],
  },
};

function PlanCard({ plan }: { plan: { id: string; key: string; name: string; price_cents: number } }) {
  const copy = PLAN_COPY[plan.key] ?? { tagline: "", bullets: [] };
  const isFree = plan.price_cents === 0;

  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-8 ${
        copy.highlight
          ? "border-[#c7a15a] bg-[#171717] text-white shadow-2xl shadow-black/20 lg:-translate-y-3"
          : "border-[#e4dfd5] bg-white"
      }`}
    >
      {copy.highlight && (
        <span className="absolute -top-3 left-8 rounded-full bg-[#c7a15a] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#171717]">
          Más elegido
        </span>
      )}
      <h3 className={`text-lg font-black ${copy.highlight ? "text-[#e2c17f]" : "text-black"}`}>{plan.name}</h3>
      <p className={`mt-1 text-sm ${copy.highlight ? "text-white/55" : "text-black/50"}`}>{copy.tagline}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tight">{isFree ? "Gratis" : formatPrice(plan.price_cents)}</span>
        {!isFree && <span className={`text-sm font-semibold ${copy.highlight ? "text-white/45" : "text-black/40"}`}>/mes</span>}
      </div>
      <ul className={`mt-7 flex-1 space-y-3 text-sm ${copy.highlight ? "text-white/75" : "text-black/65"}`}>
        {copy.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className={copy.highlight ? "text-[#e2c17f]" : "text-[#a47d36]"}>✓</span> {b}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-8 inline-flex items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-bold shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
          copy.highlight
            ? "bg-[#c7a15a] text-[#171717] shadow-black/20 hover:bg-[#d5b36c]"
            : "bg-[#171717] text-white shadow-black/10 hover:bg-black"
        }`}
      >
        {isFree ? "Empezar prueba gratis" : "Compra ya"}
      </Link>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="group rounded-3xl border border-[#e4dfd5] bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff8e9] text-xs font-black text-[#9d7837]">{icon}</span>
      <h3 className="mt-7 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-black/50">{body}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-[#c7a15a]/15 blur-3xl" />
      <div className="absolute inset-x-10 -bottom-8 h-10 animate-float-shadow rounded-[50%] bg-black/40 blur-2xl" />
      <div className="animate-float relative overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between border-b border-black/10 bg-[#171717] px-5 py-4 text-white">
          <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c7a15a] text-xs font-black text-[#171717]">B</span><span className="text-sm font-bold">BarberTech</span></div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">Panel</span>
        </div>
        <div className="grid gap-5 bg-[#f7f6f2] p-5 sm:p-7">
          <div className="flex items-end justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Hoy</p><h3 className="mt-1 text-2xl font-black">Buenos días 👋</h3></div>
            <span className="rounded-xl bg-[#171717] px-3 py-2 text-xs font-bold text-white">+ Nueva cita</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Citas" value="12" /><MiniStat label="Pendientes" value="4" /><MiniStat label="Completadas" value="7" /><MiniStat label="Ingresos" value="RD$5.8k" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-center justify-between"><h4 className="font-black">Agenda de hoy</h4><span className="text-xs font-semibold text-black/35">09:00 — 18:00</span></div>
              <div className="mt-4 space-y-3"><Appointment time="09:30" name="Carlos Martínez" service="Corte + barba" status="Confirmada" /><Appointment time="11:00" name="Luis Peña" service="Fade" status="Pendiente" /><Appointment time="13:30" name="Miguel Reyes" service="Corte clásico" status="Confirmada" /></div>
            </div>
            <div className="rounded-2xl bg-[#171717] p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-white/40">Tu barbería</p><p className="mt-2 text-xl font-black">Barber King</p><p className="mt-1 text-xs text-white/45">Santo Domingo · Abierta hoy</p><div className="mt-7 h-px bg-white/10" /><p className="mt-5 text-xs text-white/45">Reservas esta semana</p><p className="mt-1 text-3xl font-black text-[#e2c17f]">+28%</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-black/35">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>;
}

function Appointment({ time, name, service, status }: { time: string; name: string; service: string; status: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-[#f7f6f2] p-3"><span className="w-11 shrink-0 text-xs font-black text-black/45">{time}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name}</p><p className="truncate text-xs text-black/40">{service}</p></div><span className={`hidden rounded-full px-2 py-1 text-[9px] font-black sm:block ${status === "Confirmada" ? "bg-[#edf7ed] text-[#3e7c48]" : "bg-[#fff5df] text-[#9d7837]"}`}>{status}</span></div>;
}
