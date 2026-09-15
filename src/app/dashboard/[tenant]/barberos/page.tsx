import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { BarberForm } from "./barber-form";
import { BarberRow } from "./barber-row";

export default async function BarbersPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);

  const [{ data: barbers }, { data: services }, { data: barberServices }] = await Promise.all([
    supabase
      .from("barbers")
      .select("*")
      .eq("tenant_id", barbershop.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("services")
      .select("id, name")
      .eq("tenant_id", barbershop.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("barber_services").select("barber_id, service_id").eq("tenant_id", barbershop.id),
  ]);

  const servicesByBarber = new Map<string, string[]>();
  for (const link of barberServices ?? []) {
    const list = servicesByBarber.get(link.barber_id) ?? [];
    list.push(link.service_id);
    servicesByBarber.set(link.barber_id, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Equipo</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Barberos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cada barbero solo aparece disponible para los servicios que le asignes.
        </p>
      </div>

      {canManage && <BarberForm tenant={tenant} services={services ?? []} />}

      <div className="space-y-3">
        {barbers && barbers.length > 0 ? (
          barbers.map((barber) => (
            <BarberRow
              key={barber.id}
              tenant={tenant}
              barber={barber}
              services={services ?? []}
              selectedServiceIds={servicesByBarber.get(barber.id) ?? []}
              canManage={canManage}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[#d8d1c3] bg-white px-4 py-8 text-center text-sm text-neutral-500">
            Aún no hay barberos.
          </p>
        )}
      </div>
    </div>
  );
}
