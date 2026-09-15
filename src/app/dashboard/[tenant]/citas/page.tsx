import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { AppointmentRow } from "./appointment-row";
import { NewAppointmentForm } from "./new-appointment-form";
import { zonedDayBounds } from "@/lib/timezone";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { tenant } = await params;
  const { view = "upcoming" } = await searchParams;
  const { supabase, barbershop, canManage, role } = await getTenantContext(tenant);

  let query = supabase
    .from("appointments")
    .select("*, clients(full_name, phone), services(name), barbers(display_name)")
    .eq("tenant_id", barbershop.id)
    .order("starts_at", { ascending: view !== "past" });

  const now = new Date();
  const { start: todayStart, end: todayEnd } = zonedDayBounds(barbershop.timezone, now);

  if (view === "today") {
    query = query.gte("starts_at", todayStart.toISOString()).lte("starts_at", todayEnd.toISOString());
  } else if (view === "upcoming") {
    query = query.gte("starts_at", now.toISOString());
  } else if (view === "past") {
    query = query.lt("starts_at", now.toISOString());
  }

  const { data: appointments } = await query.limit(100);

  const appointmentIds = (appointments ?? []).map((a) => a.id);
  const { data: paidPayments } = appointmentIds.length
    ? await supabase
        .from("payments")
        .select("appointment_id")
        .eq("status", "recorded")
        .in("appointment_id", appointmentIds)
    : { data: [] };
  const paidAppointmentIds = new Set((paidPayments ?? []).map((p) => p.appointment_id));

  const [{ data: services }, { data: barbers }] = canManage
    ? await Promise.all([
        supabase
          .from("services")
          .select("id, name, duration_minutes")
          .eq("tenant_id", barbershop.id)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("barbers")
          .select("id, display_name")
          .eq("tenant_id", barbershop.id)
          .eq("is_active", true)
          .order("sort_order"),
      ])
    : [{ data: [] }, { data: [] }];

  const tabs = [
    { key: "today", label: "Hoy" },
    { key: "upcoming", label: "Próximas" },
    { key: "past", label: "Pasadas" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Agenda</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Citas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {role === "barber" ? "Tus citas asignadas." : "Todas las citas de la barbería."}
        </p>
      </div>

      {canManage && (
        <NewAppointmentForm
          tenant={tenant}
          timezone={barbershop.timezone}
          services={services ?? []}
          barbers={barbers ?? []}
        />
      )}

      <div className="flex gap-1 rounded-xl border border-[#e7e3da] bg-white p-1 sm:inline-flex">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`?view=${t.key}`}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              view === t.key
                ? "bg-[#171717] text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="space-y-2">
        {appointments && appointments.length > 0 ? (
          appointments.map((a) => (
            <AppointmentRow
              key={a.id}
              tenant={tenant}
              appointment={a}
              timezone={barbershop.timezone}
              isPaid={paidAppointmentIds.has(a.id)}
              canManage={canManage}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[#d8d1c3] bg-white px-4 py-8 text-center text-sm text-neutral-500">
            No hay citas en este rango.
          </p>
        )}
      </div>
    </div>
  );
}
