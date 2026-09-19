"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { INPUT } from "@/lib/ui";
import { sendSupportMessage } from "./support-actions";

// Floating support button, mounted on every screen BarberTech's own users touch
// (dashboard, admin, auth, onboarding, landing, legal pages). Deliberately NOT on
// the public storefront/booking pages — those are a barbershop's customer-facing
// pages, and a client booking a haircut needs the barbershop's own WhatsApp
// button, which already exists there.
//
// It opens an in-app form instead of a WhatsApp link, so no personal phone
// number is exposed; messages land in /admin/soporte.
export const OPEN_SUPPORT_EVENT = "barbertech:open-support";

export function SupportBubble({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(OPEN_SUPPORT_EVENT, openPanel);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, openPanel);
  }, []);

  // Prefill the reply address for signed-in users.
  useEffect(() => {
    if (!open || email) return;
    try {
      createClient()
        .auth.getSession()
        .then(({ data: { session } }) => {
          if (session?.user.email) setEmail((current) => current || session.user.email!);
        })
        .catch(() => {});
    } catch {
      // Prefill is a convenience only.
    }
  }, [open, email]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await sendSupportMessage({ email, message, context });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSent(true);
        setMessage("");
      } catch {
        setError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
      }
    });
  }

  function close() {
    setOpen(false);
    setSent(false);
    setError(null);
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Soporte técnico"
          className="fixed bottom-20 right-4 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[#e7e3da] bg-white p-5 shadow-[0_20px_60px_rgba(23,23,23,0.18)] sm:right-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold tracking-tight text-neutral-950">Soporte técnico</p>
              <p className="mt-0.5 text-sm text-neutral-500">Cuéntanos qué necesitas y te respondemos por correo.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-lg leading-none text-neutral-400 hover:text-neutral-900"
            >
              ×
            </button>
          </div>

          {sent ? (
            <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <p className="font-semibold">✓ Mensaje enviado</p>
              <p className="mt-1">Te responderemos al correo que indicaste lo antes posible.</p>
              <button type="button" onClick={close} className="mt-3 text-xs font-semibold underline">
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="support-email" className="block text-xs font-medium text-neutral-600">
                  Tu correo
                </label>
                <input
                  id="support-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 w-full ${INPUT}`}
                />
              </div>
              <div>
                <label htmlFor="support-message" className="block text-xs font-medium text-neutral-600">
                  ¿En qué te ayudamos?
                </label>
                <textarea
                  id="support-message"
                  required
                  rows={4}
                  minLength={5}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`mt-1 w-full resize-none ${INPUT}`}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {pending ? "Enviando..." : "Enviar mensaje"}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Soporte técnico"
        aria-expanded={open}
        title="Soporte técnico"
        className="group fixed bottom-5 right-4 z-30 flex items-center gap-2.5 rounded-full bg-[#171717] py-3.5 pl-3.5 pr-3.5 text-white shadow-[0_10px_30px_rgba(23,23,23,0.3)] ring-1 ring-[#c7a15a]/40 transition-all hover:pr-5 hover:shadow-[0_14px_36px_rgba(23,23,23,0.4)] sm:right-5"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e2c17f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
        </svg>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-200 group-hover:max-w-[140px]">
          Soporte técnico
        </span>
      </button>
    </>
  );
}

// Inline link that opens the support panel — for copy like "¿Prefieres hablar antes?".
export function OpenSupportLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT))} className={className}>
      {children}
    </button>
  );
}
