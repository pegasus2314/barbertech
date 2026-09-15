"use client";

import { useState, useTransition } from "react";
import { togglePublish } from "./actions";
import { CARD } from "@/lib/ui";

export function PublishToggle({ tenant, isPublished }: { tenant: string; isPublished: boolean }) {
  const [published, setPublished] = useState(isPublished);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await togglePublish(tenant, !published);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPublished(!published);
    });
  }

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${published ? "bg-emerald-500" : "bg-neutral-300"}`} />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {published ? "Publicada" : "No publicada"}
            </p>
            <p className="text-xs text-neutral-500">
              {published
                ? "Tu página pública es visible para tus clientes."
                : "Actívala cuando tengas al menos un servicio y un barbero."}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={pending}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
            published
              ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              : "bg-[#171717] text-white hover:bg-neutral-800"
          }`}
        >
          {published ? "Despublicar" : "Publicar"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
