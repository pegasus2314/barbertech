import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { HoursForm } from "./hours-form";
import { BarberHoursForm } from "./barber-hours-form";
import { TimeBlocksSection } from "./time-blocks-section";
import { CARD } from "@/lib/ui";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function HoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ barber?: string }>;
}) {
  const { tenant } = await params;
  const { barber: selectedBarberId } = await searchParams;
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("tenant_id", barbershop.id)
    .order("weekday");

  const byWeekday = new Map(hours?.map((h) => [h.weekday, h]));
  const rows = Array.from({ length: 7 }, (_, weekday) => {
    const existing = byWeekday.get(weekday);
    return {
      weekday,
      label: WEEKDAYS[weekday],
      openTime: existing?.open_time?.slice(0, 5) ?? "09:00",
      closeTime: existing?.close_time?.slice(0, 5) ?? "19:00",
      isClosed: existing?.is_closed ?? weekday === 0,
    };
  });

  const { data: barbers } = await supabase
    .from("barbers")
    .select("id, display_name")
    .eq("tenant_id", barbershop.id)
    .eq("is_active", true)
    .order("sort_order");

  const activeBarberId = selectedBarberId ?? barbers?.[0]?.id ?? null;

  const { data: timeBlocks } = await supabase
    .from("time_blocks")
    .select("id, barber_id, starts_at, ends_at, type, reason, barbers(display_name)")
    .eq("tenant_id", barbershop.id)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");

  let barberRows: {
    weekday: number;
    label: string;
    mode: "general" | "custom" | "off";
    openTime: string;
    closeTime: string;
  }[] = [];

  if (activeBarberId) {
    const { data: individualHours } = await supabase
      .from("barber_hours")
      .select("*")
      .eq("barber_id", activeBarberId);

    const byBarberWeekday = new Map(individualHours?.map((h) => [h.weekday, h]));
    barberRows = Array.from({ length: 7 }, (_, weekday) => {
      const existing = byBarberWeekday.get(weekday);
      if (!existing) {
        return { weekday, label: WEEKDAYS[weekday], mode: "general" as const, openTime: "09:00", closeTime: "19:00" };
      }
      return {
        weekday,
        label: WEEKDAYS[weekday],
        mode: existing.is_off ? ("off" as const) : ("custom" as const),
        openTime: existing.open_time?.slice(0, 5) ?? "09:00",
        closeTime: existing.close_time?.slice(0, 5) ?? "19:00",
      };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Disponibilidad</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Horarios</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Este es el horario general de la barbería. Cada barbero puede tener su propio
          horario individual debajo.
        </p>
      </div>

      <HoursForm tenant={tenant} initialRows={rows} readOnly={!canManage} />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Horario individual</p>
        <p className="mt-1 text-sm text-neutral-500">
          Anula el horario general para un barbero específico, o márcalo libre un día.
        </p>
      </div>

      {barbers && barbers.length > 0 ? (
        <div className={`${CARD} p-5`}>
          <div className="flex flex-wrap gap-2">
            {barbers.map((b) => (
              <a
                key={b.id}
                href={`?barber=${b.id}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  b.id === activeBarberId
                    ? "bg-[#171717] text-white"
                    : "border border-[#e7e3da] text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {b.display_name}
              </a>
            ))}
          </div>

          {activeBarberId && (
            <div className="mt-4">
              <BarberHoursForm
                tenant={tenant}
                barberId={activeBarberId}
                initialRows={barberRows}
                readOnly={!canManage}
              />
            </div>
          )}
        </div>
      ) : (
        <div className={`${CARD} px-4 py-6 text-sm text-neutral-500`}>
          Agrega un barbero primero para configurar su horario individual.
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Bloqueos</p>
        <p className="mt-1 text-sm text-neutral-500">
          Almuerzos, vacaciones, reuniones u otros momentos en los que no se puede reservar.
        </p>
      </div>

      <TimeBlocksSection
        tenant={tenant}
        timezone={barbershop.timezone}
        barbers={barbers ?? []}
        blocks={(timeBlocks ?? []).map((b) => ({
          id: b.id,
          barberId: b.barber_id,
          barberName: b.barbers?.display_name ?? null,
          startsAt: b.starts_at,
          endsAt: b.ends_at,
          type: b.type,
          reason: b.reason,
        }))}
        readOnly={!canManage}
      />
    </div>
  );
}
