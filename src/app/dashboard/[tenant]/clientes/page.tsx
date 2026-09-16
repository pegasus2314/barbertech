import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { ClientForm } from "./client-form";
import { ClientRow } from "./client-row";
import { EmptyState } from "../empty-state";
import { IconUsers } from "@/lib/icons";

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", barbershop.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e9] text-[#9d7837]">
          <IconUsers />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">CRM</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Clientes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Se crean automáticamente cuando reservan una cita, o puedes agregarlos aquí.
          </p>
        </div>
      </div>

      {canManage && <ClientForm tenant={tenant} />}

      <div className="space-y-2">
        {clients && clients.length > 0 ? (
          clients.map((c) => <ClientRow key={c.id} tenant={tenant} client={c} canManage={canManage} />)
        ) : (
          <EmptyState icon={<IconUsers />} title="Aún no hay clientes" subtitle="Aparecerán aquí apenas alguien reserve, o agrégalos tú mismo." />
        )}
      </div>
    </div>
  );
}
