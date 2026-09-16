import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { ServiceForm } from "./service-form";
import { ServiceRow } from "./service-row";
import { CARD } from "@/lib/ui";
import { IconScissors } from "@/lib/icons";

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
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e9] text-[#9d7837]">
          <IconScissors />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Carta</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Servicios</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cada servicio define su precio y duración; la duración se usa para calcular la
            disponibilidad de horarios.
          </p>
        </div>
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
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f6f2] text-neutral-400">
              <IconScissors />
            </div>
            <p className="mt-3 text-sm font-medium text-neutral-900">Aún no hay servicios</p>
            <p className="mt-1 text-xs text-neutral-500">Agrega el primero para empezar a recibir reservas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
