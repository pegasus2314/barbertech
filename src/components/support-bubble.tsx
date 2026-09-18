import { waLink } from "@/lib/whatsapp";

// Floating WhatsApp support button to Albert's number, mounted on every
// screen BarberTech's own users touch (dashboard, admin, auth, onboarding,
// landing). Deliberately NOT on the public storefront/booking pages — those
// are a barbershop's own customer-facing pages, and a client booking a
// haircut doesn't need "BarberTech support", they need the barbershop's own
// WhatsApp button, which already exists there.
export function SupportBubble({ context }: { context?: string }) {
  const message = context ? `Hola, necesito ayuda con BarberTech (${context}).` : "Hola, necesito ayuda con BarberTech.";
  const link = waLink("18496510308", message);
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte técnico por WhatsApp"
      title="Soporte técnico"
      className="group fixed bottom-5 right-5 z-30 flex items-center gap-2.5 rounded-full bg-[#25D366] py-3.5 pl-3.5 pr-3.5 text-white shadow-[0_10px_30px_rgba(37,211,102,0.35)] transition-all hover:pr-5 hover:shadow-[0_14px_36px_rgba(37,211,102,0.45)]"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.07c-.24.68-1.4 1.3-1.93 1.37-.49.07-1.11.1-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.08 1-2.37.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.47-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.8.87-1.07.18-.28.36-.23.61-.14.24.09 1.55.73 1.82.87.26.14.44.2.5.31.07.12.07.65-.17 1.33z" />
      </svg>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-200 group-hover:max-w-[140px]">
        Soporte técnico
      </span>
    </a>
  );
}
