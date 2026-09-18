"use client";

import { useState, useTransition } from "react";
import { updateCustomization } from "./actions";
import { BUTTON_PRIMARY, CARD, INPUT } from "@/lib/ui";
import { DEFAULT_ACCENT, accentPalette } from "@/lib/color";

type Overlay = "light" | "medium" | "dark";

const OVERLAY_OPTIONS: { value: Overlay; label: string }[] = [
  { value: "light", label: "Clara" },
  { value: "medium", label: "Media" },
  { value: "dark", label: "Oscura" },
];

export function CustomizationForm({
  tenant,
  initial,
}: {
  tenant: string;
  initial: {
    accent: string;
    overlay: Overlay;
    instagram: string;
    facebook: string;
    tiktok: string;
    bookingNote: string;
  };
}) {
  const [accent, setAccent] = useState(initial.accent || DEFAULT_ACCENT);
  const [overlay, setOverlay] = useState<Overlay>(initial.overlay);
  const [instagram, setInstagram] = useState(initial.instagram);
  const [facebook, setFacebook] = useState(initial.facebook);
  const [tiktok, setTiktok] = useState(initial.tiktok);
  const [bookingNote, setBookingNote] = useState(initial.bookingNote);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const palette = accentPalette(accent);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateCustomization(tenant, {
        accent,
        overlay,
        instagram,
        facebook,
        tiktok,
        bookingNote,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${CARD} p-5`}>
      <div>
        <p className="text-sm font-semibold text-neutral-900">Personalización de tu página pública</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          Así se ve tu enlace de reservas para tus clientes — el resto del panel no cambia.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500">Color de acento</label>
        <div className="mt-1.5 flex items-center gap-3">
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-[#e7e3da] bg-white p-1"
          />
          <input
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder={DEFAULT_ACCENT}
            className={`w-32 ${INPUT}`}
          />
          <div className="flex items-center gap-1.5">
            <span className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ backgroundColor: palette.base, color: "#171717" }}>
              Botón
            </span>
            <span className="rounded-lg bg-[#171717] px-2.5 py-1.5 text-xs font-bold" style={{ color: palette.light }}>
              Texto
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500">Oscuridad de la portada</label>
        <div className="mt-1.5 flex gap-2">
          {OVERLAY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOverlay(o.value)}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                overlay === o.value
                  ? "border-[#171717] bg-[#171717] text-white"
                  : "border-[#e7e3da] text-neutral-600 hover:border-[#c7a15a]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500">Instagram</label>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/..."
            className={`mt-1 w-full ${INPUT}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Facebook</label>
          <input
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="https://facebook.com/..."
            className={`mt-1 w-full ${INPUT}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">TikTok</label>
          <input
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            placeholder="https://tiktok.com/@..."
            className={`mt-1 w-full ${INPUT}`}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500">Nota al confirmar una cita</label>
        <textarea
          value={bookingNote}
          onChange={(e) => setBookingNote(e.target.value)}
          rows={2}
          placeholder="Ej. Llega 5 minutos antes, o trae efectivo."
          className={`mt-1 w-full ${INPUT}`}
        />
        <p className="mt-1 text-xs text-neutral-400">
          Se muestra al cliente justo después de reservar, y va incluida en el mensaje de WhatsApp.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-700">Guardado</span>}
      </div>
    </form>
  );
}
