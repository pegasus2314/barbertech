import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { ServiceForm } from "./service-form";
import { ServiceRow } from "./service-row";

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
        <h1 className="text-xl font-semibold text-neutral-900">Servicios</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cada servicio define su precio y duración; la duración se usa para calcular la
          disponibilidad de horarios.
        </p>
      </div>

      {canManage && <ServiceForm tenant={tenant} />}

      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
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
          <p className="px-4 py-6 text-sm text-neutral-500">Aún no hay servicios.</p>
        )}
      </div>
    </div>
  );
}
