import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { ClientForm } from "./client-form";
import { ClientRow } from "./client-row";

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
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Clientes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Se crean automáticamente cuando reservan una cita, o puedes agregarlos aquí.
        </p>
      </div>

      {canManage && <ClientForm tenant={tenant} />}

      <div className="space-y-2">
        {clients && clients.length > 0 ? (
          clients.map((c) => <ClientRow key={c.id} tenant={tenant} client={c} canManage={canManage} />)
        ) : (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
            Aún no hay clientes.
          </p>
        )}
      </div>
    </div>
  );
}
