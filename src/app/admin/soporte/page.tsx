import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { CARD, EYEBROW, PILL_ACTIVE, PILL_INACTIVE } from "@/lib/ui";
import { IconInbox } from "@/lib/icons";
import { ResolveButton } from "./resolve-button";

export default async function AdminSupportPage() {
  const { supabase } = await requirePlatformAdmin();

  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, created_at, email, context, message, status")
    .order("status", { ascending: true }) // 'new' before 'resolved'
    .order("created_at", { ascending: false })
    .limit(100);

  const open = (messages ?? []).filter((m) => m.status === "new").length;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e9] text-[#9d7837]">
          <IconInbox />
        </span>
        <div>
          <p className={EYEBROW}>Plataforma</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Soporte</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {open > 0 ? `${open} mensaje${open === 1 ? "" : "s"} sin resolver.` : "Todo al día."} Responde al correo de
            cada persona y márcalo como resuelto.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {(messages ?? []).map((m) => (
          <article key={m.id} className={`${CARD} p-5 ${m.status === "resolved" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <a href={`mailto:${m.email}`} className="break-all text-sm font-semibold text-[#9d7837] hover:underline">
                  {m.email}
                </a>
                {m.context && <span className="text-xs text-neutral-400"> · {m.context}</span>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.status === "new" ? PILL_ACTIVE : PILL_INACTIVE}`}>
                {m.status === "new" ? "Nuevo" : "Resuelto"}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-800">{m.message}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-400">
                {new Date(m.created_at).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              {m.status === "new" && <ResolveButton id={m.id} />}
            </div>
          </article>
        ))}
        {(messages ?? []).length === 0 && (
          <p className={`${CARD} px-5 py-10 text-center text-sm text-neutral-500`}>Aún no hay mensajes de soporte.</p>
        )}
      </div>
    </div>
  );
}
