"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendInvite, cancelInvite } from "./actions";
import { CARD } from "@/lib/ui";

type Invite = { id: string; email: string; display_name: string; created_at: string };

export function PendingInvites({ tenant, invites }: { tenant: string; invites: Invite[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (invites.length === 0) return null;

  function run(id: string, action: () => Promise<{ ok: boolean; error?: string }>, successText: string) {
    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        const result = await action();
        setMessage({ id, ok: result.ok, text: result.ok ? successText : (result.error ?? "No se pudo completar.") });
        if (result.ok) router.refresh();
      } catch {
        setMessage({ id, ok: false, text: "No se pudo completar. Intenta de nuevo." });
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className={`${CARD} p-5`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Invitaciones pendientes</p>
      <p className="mt-1 text-sm text-neutral-500">
        Aún no han aceptado. Si no les llegó el correo o el enlace falló, reenvíalo.
      </p>
      <div className="mt-3 divide-y divide-[#eeeae2]">
        {invites.map((invite) => (
          <div key={invite.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{invite.display_name}</p>
                <p className="break-all text-xs text-neutral-500">{invite.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={pendingId === invite.id}
                  onClick={() => run(invite.id, () => resendInvite(tenant, invite.id), `✓ Correo reenviado a ${invite.email}`)}
                  className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d] disabled:opacity-50"
                >
                  {pendingId === invite.id ? "Enviando..." : "Reenviar"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === invite.id}
                  onClick={() => run(invite.id, () => cancelInvite(tenant, invite.id), "Invitación cancelada.")}
                  className="text-xs font-medium text-neutral-400 hover:text-red-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
            {message?.id === invite.id && (
              <p className={`mt-1.5 text-xs ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
