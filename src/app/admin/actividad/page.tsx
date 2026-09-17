import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { CARD, EYEBROW } from "@/lib/ui";
import { IconActivity } from "@/lib/icons";

const ACTION_LABELS: Record<string, string> = {
  suspended_tenant: "Suspendió la cuenta",
  reactivated_tenant: "Reactivó la cuenta",
  confirmed_payment: "Confirmó un pago",
  rejected_payment: "Rechazó un pago",
  extended_trial: "Extendió la prueba",
};

export default async function AdminActivityPage() {
  const { supabase } = await requirePlatformAdmin();

  const { data: logs } = await supabase
    .from("audit_log")
    .select("id, tenant_id, actor_id, action, entity_type, metadata, created_at, barbershops(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const actorNames = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e9] text-[#9d7837]">
          <IconActivity />
        </span>
        <div>
          <p className={EYEBROW}>Plataforma</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Actividad</h1>
          <p className="mt-1 text-sm text-neutral-500">Últimas 100 acciones de administración en la plataforma.</p>
        </div>
      </div>

      <div className={`divide-y divide-[#eeeae2] ${CARD}`}>
        {(logs ?? []).map((log) => (
          <div key={log.id} className="px-5 py-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-neutral-900">
                {ACTION_LABELS[log.action] ?? log.action}
                {log.barbershops?.name && <span className="font-normal text-neutral-500"> · {log.barbershops.name}</span>}
              </p>
              <span className="shrink-0 text-xs text-neutral-400">
                {new Date(log.created_at).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {(log.actor_id && actorNames.get(log.actor_id)) || "Sistema"}
            </p>
          </div>
        ))}
        {(logs ?? []).length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">Sin actividad todavía.</p>
        )}
      </div>
    </div>
  );
}
