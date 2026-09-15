import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { waLink } from "@/lib/whatsapp";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

async function getStorefront(slug: string) {
  const supabase = await createClient();
  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!barbershop) return null;

  const [{ data: services }, { data: barbers }, { data: hours }, { data: gallery }] = await Promise.all([
    supabase.from("services").select("*").eq("tenant_id", barbershop.id).eq("is_active", true).order("sort_order"),
    supabase.from("barbers").select("*").eq("tenant_id", barbershop.id).eq("is_active", true).order("sort_order"),
    supabase.from("business_hours").select("*").eq("tenant_id", barbershop.id).order("weekday"),
    supabase.from("gallery_images").select("id, storage_path").eq("tenant_id", barbershop.id).order("sort_order").limit(8),
  ]);

  const galleryUrls = (gallery ?? []).map((img) => ({
    id: img.id,
    url: supabase.storage.from("barbershop-media").getPublicUrl(img.storage_path).data.publicUrl,
  }));

  return {
    barbershop,
    services: services ?? [],
    barbers: barbers ?? [],
    hours: hours ?? [],
    gallery: galleryUrls,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStorefront(slug);
  if (!data) return { title: "BarberTech" };

  return {
    title: `${data.barbershop.name} — Reserva tu cita`,
    description: data.barbershop.description ?? `Reserva tu cita en ${data.barbershop.name}.`,
    openGraph: {
      title: data.barbershop.name,
      description: data.barbershop.description ?? undefined,
      images: data.barbershop.cover_url ? [data.barbershop.cover_url] : undefined,
    },
  };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getStorefront(slug);
  if (!data) notFound();

  const { barbershop, services, barbers, hours, gallery } = data;
  const today = new Date().getDay();
  const todayHours = hours.find((h) => h.weekday === today);
  const whatsappHref = waLink(barbershop.whatsapp, `Hola, tengo una pregunta sobre ${barbershop.name}.`);

  return (
    <main className="min-h-screen bg-[#f7f6f2] pb-24 text-neutral-950 sm:pb-0">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#111111] text-white">
        <div className="absolute inset-0">
          {barbershop.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={barbershop.cover_url} alt="" className="h-full w-full object-cover opacity-55" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_75%_15%,rgba(199,161,90,0.32),transparent_34%),linear-gradient(135deg,#181818,#050505)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/90" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-7">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c7a15a]" />
              BarberTech
            </div>
            <Link href={`/${slug}/mi-cita`} className="text-sm font-medium text-white/80 hover:text-white">
              Mi cita →
            </Link>
          </div>

          <div className="mt-20 max-w-3xl sm:mt-28">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-2xl font-bold shadow-2xl backdrop-blur sm:h-24 sm:w-24">
                {barbershop.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={barbershop.logo_url} alt={barbershop.name} className="h-full w-full object-cover" />
                ) : (
                  barbershop.name.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="pb-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2c98f]">Reserva online</p>
                <h1 className="mt-1 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">{barbershop.name}</h1>
              </div>
            </div>
            {barbershop.description && (
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{barbershop.description}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-2 text-sm text-white/70">
              {todayHours && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                  <span className={`h-2 w-2 rounded-full ${todayHours.is_closed ? "bg-white/30" : "bg-emerald-400"}`} />
                  {todayHours.is_closed ? "Cerrado hoy" : `Abierto · ${todayHours.open_time?.slice(0, 5)} – ${todayHours.close_time?.slice(0, 5)}`}
                </span>
              )}
              {barbershop.address && <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">{barbershop.address}</span>}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${slug}/reservar`} className="inline-flex items-center justify-center rounded-xl bg-[#c7a15a] px-6 py-3.5 text-sm font-bold text-[#171717] shadow-lg shadow-black/20 hover:bg-[#d8b66f]">
                Reservar cita <span className="ml-2">→</span>
              </Link>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/15">
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-14">
          <div className="min-w-0">
            <section id="servicios">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d7837]">Nuestra carta</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Servicios</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 shadow-sm ring-1 ring-[#e7e3da]">{services.length} disponibles</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <Link key={service.id} href={`/${slug}/reservar`} className="group rounded-2xl border border-[#e7e3da] bg-white p-5 shadow-[0_8px_30px_rgba(23,23,23,0.04)] hover:-translate-y-0.5 hover:border-[#c7a15a] hover:shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-neutral-900 group-hover:text-[#9d7837]">{service.name}</h3>
                        {service.description && <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-neutral-500">{service.description}</p>}
                      </div>
                      <span className="text-lg font-extrabold text-neutral-900">{formatMoney(service.price_cents)}</span>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs font-medium text-neutral-400">
                      <span>{service.duration_minutes} min</span>
                      <span className="text-[#9d7837] opacity-0 transition group-hover:opacity-100">Elegir →</span>
                    </div>
                  </Link>
                ))}
              </div>
              {services.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[#d8d1c3] bg-white p-8 text-center text-sm text-neutral-500">Aún no hay servicios publicados.</div>}
            </section>

            {barbers.length > 0 && (
              <section className="mt-14" id="barberos">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d7837]">Nuestro equipo</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Barberos</h2>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {barbers.map((barber) => (
                    <div key={barber.id} className="rounded-2xl border border-[#e7e3da] bg-white p-4 text-center shadow-[0_8px_30px_rgba(23,23,23,0.04)]">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#f1eadc] bg-neutral-100 text-xl font-bold text-neutral-500">
                        {barber.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={barber.photo_url} alt={barber.display_name} className="h-full w-full object-cover" />
                        ) : barber.display_name.slice(0, 1).toUpperCase()}
                      </div>
                      <p className="mt-3 font-bold text-neutral-900">{barber.display_name}</p>
                      <p className="mt-1 text-xs text-neutral-400">Especialista</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {gallery.length > 0 && (
              <section className="mt-14">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d7837]">El ambiente</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Galería</h2>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {gallery.map((img, index) => (
                    <div key={img.id} className={`overflow-hidden rounded-2xl bg-neutral-100 ${index === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-[#e7e3da] bg-[#171717] p-6 text-white shadow-xl shadow-black/10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8b66f]">Tu próxima visita</p>
              <h2 className="mt-3 text-2xl font-bold">Reserva en menos de un minuto.</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">Elige servicio, barbero, fecha y hora. Sin llamadas.</p>
              <Link href={`/${slug}/reservar`} className="mt-6 flex items-center justify-center rounded-xl bg-[#c7a15a] px-5 py-3.5 text-sm font-bold text-[#171717] hover:bg-[#d8b66f]">Agendar ahora →</Link>
              <Link href={`/${slug}/mi-cita`} className="mt-2 flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">Consultar una cita</Link>
            </div>

            <div className="mt-4 rounded-3xl border border-[#e7e3da] bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d7837]">Horario</p>
              <div className="mt-4 divide-y divide-neutral-100">
                {hours.map((h) => (
                  <div key={h.weekday} className={`flex items-center justify-between py-2.5 text-sm ${h.weekday === today ? "font-bold text-neutral-950" : "text-neutral-500"}`}>
                    <span className="flex items-center gap-2">{h.weekday === today && <span className="h-1.5 w-1.5 rounded-full bg-[#c7a15a]" />}{WEEKDAYS[h.weekday]}</span>
                    <span>{h.is_closed ? "Cerrado" : `${h.open_time?.slice(0, 5)} – ${h.close_time?.slice(0, 5)}`}</span>
                  </div>
                ))}
              </div>
            </div>

            {(barbershop.address || barbershop.phone) && (
              <div className="mt-4 rounded-3xl border border-[#e7e3da] bg-white p-6 text-sm">
                {barbershop.address && <div><p className="font-bold text-neutral-900">Ubicación</p><p className="mt-1 leading-5 text-neutral-500">{barbershop.address}</p></div>}
                {barbershop.phone && <div className="mt-5"><p className="font-bold text-neutral-900">Contacto</p><p className="mt-1 text-neutral-500">{barbershop.phone}</p></div>}
              </div>
            )}
          </aside>
        </div>

        <footer className="border-t border-[#e7e3da] py-8 text-center text-xs text-neutral-400">
          Reservas gestionadas con <span className="font-semibold text-neutral-600">BarberTech</span>
        </footer>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-2xl shadow-black/10 backdrop-blur sm:hidden">
        <Link href={`/${slug}/mi-cita`} className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Mi cita</Link>
        <Link href={`/${slug}/reservar`} className="rounded-xl bg-[#171717] px-4 py-3 text-center text-sm font-bold text-white">Reservar</Link>
      </nav>
    </main>
  );
}
