import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { ServiceForm } from "./service-form";
import { ServiceRow } from "./service-row";
import { CARD } from "@/lib/ui";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", barbershop.id)
    .order("sort_order")
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Carta</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Servicios</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cada servicio define su precio y duración; la duración se usa para calcular la
          disponibilidad de horarios.
        </p>
      </div>

      {canManage && <ServiceForm tenant={tenant} />}

      <div className={`divide-y divide-[#eeeae2] ${CARD}`}>
        {services && services.length > 0 ? (
          services.map((service) => (
            <ServiceRow
              key={service.id}
              tenant={tenant}
              service={service}
              canManage={canManage}
            />
          ))
        ) : (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">Aún no hay servicios.</p>
        )}
      </div>
    </div>
  );
}
