import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

function waLink(phone: string | null, message: string) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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

  const [{ data: services }, { data: barbers }, { data: hours }, { data: gallery }] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("tenant_id", barbershop.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("barbers")
        .select("*")
        .eq("tenant_id", barbershop.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("business_hours").select("*").eq("tenant_id", barbershop.id).order("weekday"),
      supabase
        .from("gallery_images")
        .select("id, storage_path")
        .eq("tenant_id", barbershop.id)
        .order("sort_order")
        .limit(8),
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
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

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getStorefront(slug);
  if (!data) notFound();

  const { barbershop, services, barbers, hours, gallery } = data;
  const whatsappHref = waLink(
    barbershop.whatsapp,
    `Hola, tengo una pregunta sobre ${barbershop.name}.`,
  );

  const todayHours = hours.find((h) => h.weekday === new Date().getDay());

  return (
    <div className="min-h-screen bg-white pb-24 sm:pb-0">
      <div className="relative h-48 overflow-hidden bg-neutral-900 sm:h-64">
        {barbershop.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={barbershop.cover_url}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="flex items-end gap-4 pt-4">
          <div className="-mt-14 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-neutral-100 text-2xl font-semibold text-neutral-700 shadow-md sm:h-28 sm:w-28">
            {barbershop.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={barbershop.logo_url}
                alt={barbershop.name}
                className="h-full w-full object-cover"
              />
            ) : (
              barbershop.name.slice(0, 1).toUpperCase()
            )}
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {barbershop.name}
          </h1>
          {barbershop.description && (
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-500">
              {barbershop.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
            {todayHours && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${todayHours.is_closed ? "bg-neutral-300" : "bg-emerald-500"}`}
                />
                {todayHours.is_closed
                  ? "Cerrado hoy"
                  : `Abierto hoy · ${todayHours.open_time?.slice(0, 5)} – ${todayHours.close_time?.slice(0, 5)}`}
              </span>
            )}
            {barbershop.address && <span>{barbershop.address}</span>}
            {barbershop.phone && <span>{barbershop.phone}</span>}
          </div>
        </div>

        <div className="mt-6 hidden gap-3 sm:flex">
          <Link
            href={`/${slug}/reservar`}
            className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Reservar cita
          </Link>
          <Link
            href={`/${slug}/mi-cita`}
            className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            Consultar mi cita
          </Link>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
            >
              WhatsApp
            </a>
          )}
        </div>

        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Servicios
          </h2>
          <div className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium text-neutral-900">{service.name}</p>
                  {service.description && (
                    <p className="mt-0.5 text-sm text-neutral-500">{service.description}</p>
                  )}
                  <p className="mt-1 text-xs text-neutral-400">{service.duration_minutes} min</p>
                </div>
                <p className="whitespace-nowrap font-semibold text-neutral-900">
                  {formatMoney(service.price_cents)}
                </p>
              </div>
            ))}
            {services.length === 0 && (
              <p className="px-5 py-6 text-sm text-neutral-500">
                Aún no hay servicios publicados.
              </p>
            )}
          </div>
        </section>

        {barbers.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Barberos
            </h2>
            <div className="mt-4 flex flex-wrap gap-5">
              {barbers.map((barber) => (
                <div key={barber.id} className="w-24 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-lg font-semibold text-neutral-600 ring-1 ring-neutral-200">
                    {barber.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={barber.photo_url}
                        alt={barber.display_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      barber.display_name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-neutral-900">
                    {barber.display_name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Galería
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  className="aspect-square overflow-hidden rounded-xl bg-neutral-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 pb-16">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Horario
          </h2>
          <div className="mt-4 max-w-sm divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {hours.map((h) => (
              <div
                key={h.weekday}
                className={`flex items-center justify-between px-5 py-2.5 text-sm ${
                  h.weekday === new Date().getDay() ? "bg-neutral-50 font-medium" : ""
                }`}
              >
                <span className="text-neutral-600">{WEEKDAYS[h.weekday]}</span>
                <span className="text-neutral-900">
                  {h.is_closed
                    ? "Cerrado"
                    : `${h.open_time?.slice(0, 5)} – ${h.close_time?.slice(0, 5)}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <Link
          href={`/${slug}/mi-cita`}
          className="flex-1 rounded-full border border-neutral-300 px-4 py-3 text-center text-sm font-medium text-neutral-700"
        >
          Mi cita
        </Link>
        <Link
          href={`/${slug}/reservar`}
          className="flex-1 rounded-full bg-neutral-900 px-4 py-3 text-center text-sm font-medium text-white"
        >
          Reservar cita
        </Link>
      </nav>
    </div>
  );
}
