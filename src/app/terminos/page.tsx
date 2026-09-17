import Link from "next/link";

export const metadata = {
  title: "Términos de Servicio — BarberTech",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#171717]">
      <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-black/50 hover:text-black">
          ← Volver al inicio
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Términos de Servicio</h1>
        <p className="mt-2 text-sm text-black/45">Última actualización: 18 de septiembre de 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-black/70">
          <p>
            Estos Términos regulan el uso de BarberTech, un servicio de gestión de citas, clientes y
            operación para barberías. Al crear una cuenta o usar BarberTech, aceptas lo descrito aquí.
            Este documento es una base general y no sustituye asesoría legal profesional.
          </p>

          <Section title="1. Qué es BarberTech">
            <p>
              BarberTech es una plataforma que permite a una barbería crear su propia página de reservas,
              administrar su agenda, barberos, servicios, clientes y registrar sus pagos. No procesamos
              pagos con tarjeta ni movemos dinero entre cuentas — los pagos de suscripción se registran
              manualmente y son revisados por el equipo de BarberTech.
            </p>
          </Section>

          <Section title="2. Cuentas y planes">
            <p>
              Cada barbería es responsable de la información que registra y de mantener segura su
              contraseña. Ofrecemos un plan gratuito y planes pagos con límites distintos (cantidad de
              barberos, funciones disponibles); los planes pagos incluyen un período de prueba gratuito.
              Podemos suspender una cuenta si el pago de suscripción no se confirma dentro del período
              correspondiente.
            </p>
          </Section>

          <Section title="3. Contenido que subes">
            <p>
              Si subes fotos, el nombre de tu negocio, descripciones u otro contenido a tu página
              (logo, portada, galería), <strong className="text-black/85">tú eres responsable de tener los derechos sobre ese
              contenido</strong> y de que no infrinja derechos de autor ni la ley. BarberTech puede remover
              contenido que viole estos Términos o derechos de terceros, y puede suspender cuentas que
              reincidan.
            </p>
          </Section>

          <Section title="4. Datos de tus clientes">
            <p>
              Al usar BarberTech para gestionar tus citas, vas a registrar datos de tus propios clientes
              (nombre, teléfono). Eres responsable de contar con la autorización necesaria de tus clientes
              para almacenar y usar esa información dentro del sistema. BarberTech actúa como el proveedor
              técnico que aloja esos datos de forma segura, no como dueño de ellos.
            </p>
          </Section>

          <Section title="5. Uso aceptable">
            <p>
              No está permitido usar BarberTech para actividades ilegales, enviar spam, intentar acceder a
              datos de otras barberías, o interferir con el funcionamiento del servicio.
            </p>
          </Section>

          <Section title="6. Disponibilidad del servicio">
            <p>
              BarberTech se ofrece &quot;tal cual&quot;. Al ser un producto en etapa temprana, no garantizamos
              disponibilidad ininterrumpida ni ausencia total de errores, aunque trabajamos para que el
              servicio sea confiable. No somos responsables por pérdidas indirectas derivadas de
              interrupciones del servicio.
            </p>
          </Section>

          <Section title="7. Cancelación">
            <p>
              Puedes dejar de usar BarberTech cuando quieras. Podemos suspender o cerrar cuentas que
              incumplan estos Términos, incumplan pagos de forma prolongada, o representen un riesgo para
              otros usuarios de la plataforma.
            </p>
          </Section>

          <Section title="8. Resolución de disputas">
            <p>
              Ante cualquier inconveniente, primero intentaremos resolverlo directamente contactándonos.
              Estos Términos se rigen por las leyes de la República Dominicana.
            </p>
          </Section>

          <Section title="9. Cambios a estos Términos">
            <p>
              Podemos actualizar estos Términos conforme el producto evolucione. Si el cambio es
              significativo, lo avisaremos dentro del panel o por el canal de contacto registrado.
            </p>
          </Section>

          <Section title="10. Contacto">
            <p>
              ¿Preguntas sobre estos Términos? Escríbenos por{" "}
              <a
                href="https://wa.me/18496510308"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#25D366] hover:underline"
              >
                WhatsApp
              </a>
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
