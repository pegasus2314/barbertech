import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { HoursForm } from "./hours-form";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function HoursPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Disponibilidad</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Horarios</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Este es el horario general de la barbería. Cada barbero podrá tener su propio
          horario individual más adelante.
        </p>
      </div>

      <HoursForm tenant={tenant} initialRows={rows} readOnly={!canManage} />
    </div>
  );
}
