"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";
import { updateClientNotes } from "./actions";

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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-neutral-900">{client.full_name}</p>
          <p className="text-xs text-neutral-500">
            {client.phone}
            {client.email ? ` · ${client.email}` : ""}
          </p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <p>{formatMoney(client.total_spent_cents)} gastado</p>
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
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Notas sobre el cliente..."
              />
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={pending}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              {client.notes ? client.notes : "+ Agregar nota"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
