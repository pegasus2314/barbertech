"use client";

import { useState } from "react";
import { CARD } from "@/lib/ui";

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context); the URL is
      // still selectable text, so there's nothing else to do here.
    }
  }

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 truncate rounded-lg border border-[#e7e3da] bg-[#f7f6f2] px-3 py-2 text-sm text-neutral-700"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-[#171717] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function BookingLinkCard({
  storefrontUrl,
  bookingUrl,
}: {
  storefrontUrl: string;
  bookingUrl: string;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Tu enlace</p>
      <p className="mt-1 text-sm text-neutral-500">
        Compártelo en tu bio de Instagram, WhatsApp o donde quieras. Es fijo: no cambia, y tus
        clientes verán horarios disponibles reales al entrar.
      </p>
      <div className="mt-4 space-y-4">
        <LinkRow label="Enlace directo para reservar" url={bookingUrl} />
        <LinkRow label="Página de tu barbería" url={storefrontUrl} />
      </div>
    </div>
  );
}
