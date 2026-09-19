import Link from "next/link";
import { OpenSupportLink, SupportBubble } from "@/components/support-bubble";

export const metadata = {
  title: "Política de Privacidad — BarberTech",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#171717]">
      <SupportBubble />
      <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-black/50 hover:text-black">
          ← Volver al inicio
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-black/45">Última actualización: 18 de septiembre de 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-black/70">
          <p>
            Esta política explica qué información recolecta BarberTech, para qué la usamos y cómo la
            protegemos. Este documento es una base general y no sustituye asesoría legal profesional.
          </p>

          <Section title="1. Qué información recolectamos">
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong className="text-black/85">De la barbería:</strong> nombre del negocio, descripción, teléfono, WhatsApp, dirección, logo y fotos de galería.</li>
              <li><strong className="text-black/85">De cuentas de usuario:</strong> correo y contraseña (gestionados de forma segura por nuestro proveedor de autenticación).</li>
              <li><strong className="text-black/85">De clientes de una barbería:</strong> nombre y teléfono, registrados por la barbería o por el propio cliente al reservar una cita.</li>
              <li><strong className="text-black/85">De pagos de suscripción:</strong> monto, método (efectivo o transferencia) y una referencia — nunca números de tarjeta ni datos bancarios de quien paga.</li>
              <li><strong className="text-black/85">Técnica:</strong> si activas las notificaciones, guardamos la suscripción de tu navegador para poder enviarte avisos del sistema operativo.</li>
            </ul>
          </Section>

          <Section title="2. Para qué la usamos">
            <p>
              Para operar el servicio: mostrar tu página pública, gestionar tu agenda y clientes, enviarte
              notificaciones dentro del panel o al navegador cuando entra una cita nueva, y permitirte
              avisar a tus clientes por WhatsApp (esto último siempre lo inicias tú manualmente, con un
              clic — no enviamos mensajes automáticos a tus clientes en su nombre).
            </p>
          </Section>

          <Section title="3. Qué NO hacemos">
            <p>
              No vendemos tu información ni la de tus clientes a terceros. No usamos rastreadores
              publicitarios ni píxeles de redes sociales en la plataforma. No usamos inteligencia
              artificial para procesar tus datos — BarberTech no tiene funciones de IA por ahora.
            </p>
          </Section>

          <Section title="4. Dónde se guardan los datos">
            <p>
              Tus datos se almacenan en Supabase (base de datos) y el sitio se sirve a través de Vercel,
              proveedores de infraestructura que usamos para operar BarberTech. Solo el equipo de
              BarberTech (Super Admin) puede ver datos de todas las barberías, para dar soporte y
              administrar la plataforma — cada barbería solo puede ver su propia información.
            </p>
          </Section>

          <Section title="5. Cookies y almacenamiento local">
            <p>
              Usamos únicamente cookies/almacenamiento técnico necesario para mantener tu sesión iniciada.
              No usamos cookies de publicidad ni de seguimiento entre sitios.
            </p>
          </Section>

          <Section title="6. Tus derechos">
            <p>
              Puedes pedirnos en cualquier momento que corrijamos o eliminemos tu información, o la de tu
              barbería, escribiéndonos por{" "}
              <OpenSupportLink className="font-semibold text-[#9d7837] hover:underline">
                el chat de soporte
              </OpenSupportLink>
              . Ten en cuenta que eliminar ciertos datos puede significar que ya no puedas usar el
              servicio.
            </p>
          </Section>

          <Section title="7. Cambios a esta política">
            <p>
              Si cambiamos cómo manejamos tus datos de forma significativa — por ejemplo, si en el futuro
              agregamos analítica o funciones de inteligencia artificial — actualizaremos esta página y lo
              indicaremos claramente.
            </p>
          </Section>

          <Section title="8. Contacto">
            <p>
              ¿Preguntas sobre tu privacidad? Escríbenos por{" "}
              <OpenSupportLink className="font-semibold text-[#9d7837] hover:underline">
                el chat de soporte
              </OpenSupportLink>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-black/90">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
