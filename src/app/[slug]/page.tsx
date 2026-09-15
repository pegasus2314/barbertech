import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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

  const [{ data: services }, { data: barbers }, { data: hours }] = await Promise.all([
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
  ]);

  return { barbershop, services: services ?? [], barbers: barbers ?? [], hours: hours ?? [] };
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

  const { barbershop, services, barbers, hours } = data;
  const whatsappHref = waLink(
    barbershop.whatsapp,
    `Hola, tengo una pregunta sobre ${barbershop.name}.`,
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-40 bg-neutral-900 sm:h-56">
        {barbershop.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={barbershop.cover_url}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        )}
        <div className="absolute -bottom-8 left-4 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-neutral-100 text-xl font-semibold text-neutral-700 shadow-sm sm:left-8">
          {barbershop.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={barbershop.logo_url}
              alt={barbershop.name}
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            barbershop.name.slice(0, 1).toUpperCase()
          )}
        </div>
      </div>

      <div className="px-4 pt-12 sm:px-8">
        <h1 className="text-2xl font-semibold text-neutral-900">{barbershop.name}</h1>
        {barbershop.description && (
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{barbershop.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {barbershop.address && (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
              {barbershop.address}
            </span>
          )}
          {barbershop.phone && (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
              {barbershop.phone}
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/${slug}/reservar`}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Reservar cita
          </Link>
          <Link
            href={`/${slug}/mi-cita`}
            className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Consultar mi cita
          </Link>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <section className="mt-10 px-4 sm:px-8">
        <h2 className="text-lg font-semibold text-neutral-900">Servicios</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <div key={service.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-neutral-900">{service.name}</p>
                <p className="whitespace-nowrap font-semibold text-neutral-900">
                  {formatMoney(service.price_cents)}
                </p>
              </div>
              {service.description && (
                <p className="mt-1 text-sm text-neutral-500">{service.description}</p>
              )}
              <p className="mt-1 text-xs text-neutral-400">{service.duration_minutes} min</p>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-neutral-500">Aún no hay servicios publicados.</p>
          )}
        </div>
      </section>

      <section className="mt-10 px-4 sm:px-8">
        <h2 className="text-lg font-semibold text-neutral-900">Barberos</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          {barbers.map((barber) => (
            <div key={barber.id} className="w-28 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-lg font-semibold text-neutral-600">
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
              <p className="mt-2 text-sm font-medium text-neutral-900">{barber.display_name}</p>
            </div>
          ))}
          {barbers.length === 0 && (
            <p className="text-sm text-neutral-500">Aún no hay barberos publicados.</p>
          )}
        </div>
      </section>

      <section className="mt-10 px-4 pb-16 sm:px-8">
        <h2 className="text-lg font-semibold text-neutral-900">Horario</h2>
        <div className="mt-3 max-w-xs divide-y divide-neutral-100 rounded-xl border border-neutral-200">
          {hours.map((h) => (
            <div
              key={h.weekday}
              className="flex items-center justify-between px-4 py-2 text-sm"
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
  );
}
