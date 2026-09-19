import Link from "next/link";
import { OpenSupportLink, SupportBubble } from "@/components/support-bubble";

export const metadata = {
  title: "Compra, garantía, activación y devoluciones",
  description:
    "Cómo se paga BarberTech, cuándo se activa tu plan, qué garantía tienes y cómo funcionan las devoluciones.",
};

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#171717]">
      <SupportBubble />
      <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-black/50 hover:text-black">
          ← Volver al inicio
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Compra, garantía, activación y devoluciones</h1>
        <p className="mt-2 text-sm text-black/45">Última actualización: 19 de septiembre de 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-black/70">
          <p>
            BarberTech es un servicio digital por suscripción: no vendemos productos físicos, así que no hay
            envíos. Aquí explicamos, en simple, cómo se compra, cuándo se activa, qué garantía tienes y cuándo
            te devolvemos tu dinero.
          </p>

          <Section title="1. Cómo se compra">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Creas tu cuenta gratis y pruebas BarberTech <strong className="text-black/85">6 días sin tarjeta</strong>.</li>
              <li>
                Los precios de cada plan (Basic, Pro y Premium) están publicados en la sección{" "}
                <Link href="/#precios" className="font-semibold text-[#9d7837] hover:underline">Precios</Link>, en pesos dominicanos (DOP).
                Lo que ves ahí es lo que pagas: sin comisiones ocultas.
              </li>
              <li>
                El pago se hace por <strong className="text-black/85">transferencia bancaria o en efectivo</strong>. Después de pagar,
                registras el pago dentro de tu panel (monto, método y referencia) y nuestro equipo lo confirma.
              </li>
              <li>Cada pago cubre <strong className="text-black/85">30 días</strong> de servicio. No hacemos cobros automáticos: tú decides cuándo renovar.</li>
            </ul>
          </Section>

          <Section title="2. Cuándo se activa tu plan (tiempos de entrega)">
            <p>
              Como BarberTech es digital, la &quot;entrega&quot; es la activación de tu cuenta:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong className="text-black/85">Cuenta nueva y período de prueba:</strong> inmediato, en cuanto creas tu cuenta y confirmas tu correo.</li>
              <li>
                <strong className="text-black/85">Plan de pago:</strong> se activa cuando confirmamos tu pago. Normalmente ocurre el
                mismo día hábil y, como máximo, en 24 horas hábiles desde que registras el pago con su referencia.
              </li>
              <li>Si pasadas 24 horas hábiles tu plan no está activo, escríbenos por el chat de soporte y lo resolvemos con prioridad.</li>
            </ul>
          </Section>

          <Section title="3. Renovación y qué pasa si no pagas">
            <p>
              Cuando termina tu período (o tu prueba) tienes <strong className="text-black/85">3 días de gracia</strong> para renovar
              sin perder el acceso. Pasados esos días, tu panel y tu página pública se pausan. <strong className="text-black/85">No borramos tus datos</strong>:
              en cuanto se confirma un nuevo pago, todo vuelve a funcionar tal como lo dejaste.
            </p>
          </Section>

          <Section title="4. Garantía del servicio">
            <p>
              Te garantizamos que BarberTech funciona como se describe en nuestra página. La mejor garantía es la prueba
              gratis de 6 días: pruébalo con tu barbería real antes de pagar. Además:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Si una función principal (reservas, agenda o tu página pública) falla por un error nuestro, la corregimos con prioridad.</li>
              <li>Si el problema te deja sin servicio más de 24 horas seguidas por causa nuestra, te sumamos los días perdidos a tu plan.</li>
              <li>Respondemos las consultas de soporte normalmente en menos de 24 horas hábiles.</li>
            </ul>
            <p className="mt-2">
              BarberTech está en etapa temprana: no prometemos cero fallos, pero sí atender cada uno con rapidez (ver también los{" "}
              <Link href="/terminos" className="font-semibold text-[#9d7837] hover:underline">Términos de Servicio</Link>).
            </p>
          </Section>

          <Section title="5. Devoluciones y reembolsos">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-black/85">Primer pago:</strong> si pagaste tu primer mes y BarberTech no es lo que esperabas, te
                devolvemos el 100% si lo pides dentro de los <strong className="text-black/85">7 días</strong> siguientes a la confirmación del pago.
              </li>
              <li>
                <strong className="text-black/85">Pagos posteriores (renovaciones):</strong> no se reembolsa un período que ya empezó. Puedes
                cancelar cuando quieras y conservas el acceso hasta que termine el período pagado; simplemente no renuevas.
              </li>
              <li>
                <strong className="text-black/85">Errores de cobro:</strong> si pagaste de más o por duplicado, te devolvemos la diferencia completa sin importar la fecha.
              </li>
              <li>
                <strong className="text-black/85">Cómo se devuelve:</strong> por el mismo medio que usaste (transferencia o efectivo), en un
                máximo de 5 días hábiles desde que aprobamos la solicitud.
              </li>
              <li>Para pedir una devolución, escríbenos por el chat de soporte indicando el correo de tu cuenta y la referencia del pago.</li>
            </ul>
          </Section>

          <Section title="6. Lo que compran tus clientes en tu barbería">
            <p>
              Los cortes y servicios que tus clientes reservan a través de tu página son entre tu barbería y ellos. BarberTech solo
              provee la herramienta de reservas: no cobra esos servicios ni es parte de ellos. Las reglas de cancelación,
              precios y devoluciones de esos servicios las define cada barbería.
            </p>
          </Section>

          <Section title="7. Contacto">
            <p>
              ¿Dudas sobre un pago, una activación o una devolución? Escríbenos por{" "}
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
