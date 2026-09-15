import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { AppointmentRow } from "./appointment-row";
import { NewAppointmentForm } from "./new-appointment-form";

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
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  if (view === "today") {
    query = query.gte("starts_at", todayStart.toISOString()).lte("starts_at", todayEnd.toISOString());
  } else if (view === "upcoming") {
    query = query.gte("starts_at", now.toISOString());
  } else if (view === "past") {
    query = query.lt("starts_at", now.toISOString());
  }

  const { data: appointments } = await query.limit(100);

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
        <h1 className="text-xl font-semibold text-neutral-900">Citas</h1>
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

      <div className="flex gap-1">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`?view=${t.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              view === t.key
                ? "bg-neutral-900 text-white"
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
            />
          ))
        ) : (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
            No hay citas en este rango.
          </p>
        )}
      </div>
    </div>
  );
}
