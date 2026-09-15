"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { updateClientNotes } from "./actions";
import { BUTTON_GHOST, BUTTON_PRIMARY, CARD, INPUT } from "@/lib/ui";

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

export function ClientRow({
  tenant,
  client,
  canManage,
}: {
  tenant: string;
  client: Tables<"clients">;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateClientNotes(tenant, client.id, notes);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{client.full_name}</p>
          <p className="text-xs text-neutral-500">
            {client.phone}
            {client.email ? ` · ${client.email}` : ""}
          </p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <p className="font-semibold text-neutral-900">
            {formatMoney(client.total_spent_cents)} <span className="font-normal text-neutral-400">gastado</span>
          </p>
          {client.last_visit_at && (
            <p>
              Última visita:{" "}
              {new Date(client.last_visit_at).toLocaleDateString("es-DO")}
            </p>
          )}
        </div>
      </div>

      {canManage && (
        <div className="mt-2">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`w-full ${INPUT}`}
                placeholder="Notas sobre el cliente..."
              />
              <div className="flex gap-2">
                <button onClick={save} disabled={pending} className={`${BUTTON_PRIMARY} py-1.5 text-xs`}>
                  Guardar
                </button>
                <button onClick={() => setEditing(false)} className={`${BUTTON_GHOST} py-1.5 text-xs`}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-neutral-500 hover:text-[#9d7837]"
            >
              {client.notes ? client.notes : "+ Agregar nota"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
