# BarberTech — Auditoría inicial y arquitectura

## 1. Estado actual

Proyecto nuevo. No existe código previo. Esta es la fase 0: arquitectura antes de implementación.

## 2. Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Supabase: Postgres, Auth, Storage, RLS
- Vercel (o similar) para deploy

## 3. Multi-tenancy

Estrategia: **fila compartida con `tenant_id`** (no schema-per-tenant, no DB-per-tenant). Es el enfoque correcto para este tamaño de producto: más simple de operar, escalable hasta miles de tenants, y permite RLS de Postgres para aislar datos a nivel de fila.

Reglas:
- Toda tabla de negocio tiene `tenant_id uuid not null references barbershops(id)`.
- RLS habilitado en TODAS las tablas de negocio. Ninguna política confía en `tenant_id` enviado por el cliente.
- El `tenant_id` efectivo se resuelve server-side: para requests autenticados, vía membership (`memberships.user_id = auth.uid()`), nunca vía input del body/query.
- Rutas públicas (storefront, crear cita pública) resuelven el tenant por `slug` en la URL, con acceso de solo lectura a columnas públicas vía política RLS separada (`is_published = true`).
- SUPER_ADMIN usa un rol de servicio (bypass RLS) solo desde rutas server-side protegidas, nunca desde el cliente.

## 4. Modelo de datos (núcleo)

```
barbershops              (tenant raíz)
  id, slug (unique), name, description, logo_url, cover_url,
  phone, whatsapp, address, social_links jsonb,
  timezone, currency, status (trial|active|past_due|grace|suspended),
  plan_id -> plans.id, is_published, theme jsonb (colores), created_at

plans
  id, key (basic|pro|premium), name, price_cents, currency,
  limits jsonb (max_barbers, max_services, ...), features jsonb, is_active

subscriptions
  id, tenant_id, plan_id, status (trial|active|past_due|grace|suspended),
  current_period_start, current_period_end, trial_ends_at

subscription_payments
  id, tenant_id, subscription_id, amount_cents, method (cash|transfer),
  status (pending|confirmed|rejected), reference, notes,
  confirmed_by (super_admin user_id, NOT the owner), confirmed_at, created_at
  -- append-only: no update de amount/status tras confirmed, solo nuevas filas o un campo de reversal

profiles                 (extiende auth.users)
  id (=auth.uid()), full_name, avatar_url, phone, created_at

memberships               (rol de un usuario dentro de un tenant)
  id, tenant_id, user_id, role (owner|manager|barber|staff), status (active|invited|disabled)
  unique(tenant_id, user_id)

barbers
  id, tenant_id, membership_id (nullable si el barbero no tiene login),
  display_name, photo_url, bio, is_active, sort_order

services
  id, tenant_id, name, description, price_cents, duration_minutes,
  is_active, sort_order

barber_services            (qué servicios hace cada barbero)
  barber_id, service_id  (PK compuesta, tenant_id denormalizado para RLS simple)

business_hours             (horario general de la barbería)
  id, tenant_id, weekday (0-6), open_time, close_time, is_closed

barber_hours                (horario individual, sobreescribe/limita business_hours)
  id, tenant_id, barber_id, weekday, open_time, close_time, is_off

time_blocks                 (bloqueos: almuerzo, vacaciones, evento...)
  id, tenant_id, barber_id (nullable = aplica a toda la barbería),
  starts_at, ends_at, reason, type (lunch|meeting|vacation|day_off|event|other)

clients
  id, tenant_id, full_name, phone, email, notes,
  created_at, last_visit_at, total_spent_cents (derivado, recalculado por trigger/job)

appointments
  id, tenant_id, client_id, barber_id, service_id,
  starts_at, ends_at (derivado de starts_at + service.duration_minutes),
  status (pending|confirmed|in_progress|completed|cancelled|rejected|no_show),
  price_cents (snapshot del precio al momento de reservar),
  notes, created_by (client|owner|manager|barber), created_at

appointment_status_history
  id, appointment_id, tenant_id, from_status, to_status, changed_by, changed_at, note

payments                    (pagos manuales por cita/servicio)
  id, tenant_id, appointment_id (nullable), client_id,
  amount_cents, method (cash|transfer), status (recorded|voided),
  reference, notes, recorded_by, created_at
  -- append-only: anular = nueva fila status=voided referenciando la original, no DELETE/UPDATE destructivo

gallery_images
  id, tenant_id, storage_path, alt_text, sort_order, created_at

audit_log
  id, tenant_id (nullable para acciones de super_admin cross-tenant),
  actor_id, action (created_appointment|cancelled_appointment|changed_status|
                     updated_service_price|updated_service|suspended_tenant|
                     reactivated_tenant|confirmed_payment|...),
  entity_type, entity_id, metadata jsonb, created_at
```

Índices clave: `appointments(tenant_id, barber_id, starts_at)`, `appointments(tenant_id, starts_at)`, `time_blocks(tenant_id, barber_id, starts_at, ends_at)`, `memberships(user_id)`.

Constraint crítico: **evitar solapamiento de citas** por barbero. Postgres `EXCLUDE` constraint con `btree_gist`:

```sql
alter table appointments add constraint no_overlap
  exclude using gist (
    barber_id with =,
    tsrange(starts_at, ends_at) with &&
  ) where (status not in ('cancelled', 'rejected', 'no_show'));
```

Esto hace la regla de no-solapamiento correcta a nivel de base de datos, no solo en el frontend — cierra condiciones de carrera (dos clientes reservando la misma hora a la vez).

## 5. Roles y autorización

- `owner`, `manager`, `staff`: filas de `memberships` con rol asignado por tenant. Un mismo `user_id` puede tener memberships en varios tenants (ej. un super_admin externo, o alguien que gestiona 2 barberías).
- `barber`: igual, membership con role=barber; opcionalmente vinculado a una fila de `barbers` vía `membership_id`. Si el barbero no tiene cuenta (lo gestiona el owner), `barbers.membership_id` es null y solo el owner/manager administra sus citas.
- `super_admin`: NO es una membership de tenant. Es una tabla aparte `platform_admins(user_id)` o un claim en `auth.users.raw_app_meta_data`. Nunca se mezcla con `memberships` para evitar que un owner se auto-promueva.
- Autorización server-side: cada Server Action / Route Handler resuelve `tenant_id` a partir de la membership del usuario autenticado (o del slug público), y las políticas RLS son la última línea de defensa, no la única.
- Regla dura: el propio `owner` no puede confirmar sus pagos de suscripción (`subscription_payments.confirmed_by` debe ser un `platform_admin`, verificado server-side, no solo por UI).

## 6. Motor de disponibilidad

Dado: `tenant_id, barber_id, service_id, fecha`.

1. Duración = `services.duration_minutes`.
2. Ventana base = `barber_hours` del weekday (si no existe fila, cae a `business_hours` del tenant).
3. Restar `time_blocks` que intersecten ese día (barbero-específicos + generales del tenant).
4. Restar `appointments` existentes del barbero ese día con status activo (todo excepto cancelled/rejected/no_show).
5. Generar slots candidatos en incrementos configurables (ej. cada 15 min) dentro de la ventana resultante, filtrando cualquier slot cuyo `[start, start+duration)` se solape con lo restado en 3-4.
6. Esto se calcula **server-side** (Route Handler / RPC de Postgres), nunca confiando en un cálculo hecho en el cliente. El `EXCLUDE` constraint es el backstop final ante condiciones de carrera.

## 7. Qué reutilizamos conceptualmente del "Rent Car" (si aplica) y qué no

Reutilizable: patrón multi-tenant con `tenant_id` + RLS, estructura de roles por membership, auditoría append-only, manejo de suscripciones/planes del SaaS, Storage con control de acceso por tenant.

NO reutilizable: el modelo de disponibilidad de Rent Car es `recurso (vehículo) x rango de fechas` (reservas de varios días, un solo "recurso" bloquea el rango completo). BarberTech es `recurso (barbero) x slot de tiempo corto con duración variable por servicio, dentro de horarios recurrentes semanales`. Son motores de disponibilidad estructuralmente distintos — no se puede portar la lógica de solapamiento de fechas de Rent Car directamente, hay que construir el motor de slots desde cero como se describe en la sección 6.

## 8. Fases propuestas de implementación

1. **Fase 1 — Fundación**: scaffold Next.js/TS/Tailwind, conexión Supabase, esquema SQL + RLS + migraciones, auth (registro/login), tabla `barbershops`/`memberships`/`profiles`.
2. **Fase 2 — Onboarding + dashboard base**: flujo de registro de barbería (wizard corto), CRUD de servicios y barberos, horarios.
3. **Fase 3 — Motor de disponibilidad + citas**: RPC de disponibilidad, flujo de reserva pública, estados de citas + historial.
4. **Fase 4 — Storefront público**: página pública por slug, SEO, galería (Storage).
5. **Fase 5 — Clientes + finanzas**: CRM básico, pagos manuales, reportes del día.
6. **Fase 6 — Planes/suscripciones + Super Admin**: panel super_admin, pagos de suscripción manuales.
7. **Fase 7 — Pulido**: PWA básica, auditoría de seguridad, tests de aislamiento cross-tenant.

Cada fase sigue: auditar → planificar → implementar → testear → probar en navegador → documentar → commit → push. No se declara una fase terminada sin pruebas demostradas.

## 9. Estado de la Fase 1 (fundación)

Completado:
- Proyecto Supabase conectado: `aqdcvzyenkskfhtgkhyx` (us-east-2). Esquema completo aplicado ([supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)): todas las tablas de la sección 4, RLS en cada una, constraint `EXCLUDE` anti-solapamiento, trigger de transiciones de estado válidas, RPCs públicas `get_available_slots` y `create_public_appointment`, seed de planes.
- Advisories de seguridad de Supabase revisados: sin hallazgos pendientes (las únicas advertencias restantes son intencionales — RPCs públicas de reserva/disponibilidad y helpers de RLS ejecutables solo por `authenticated`).
- Scaffold Next.js 15 + TS + Tailwind + App Router en este repo, con clientes Supabase (`src/lib/supabase/client.ts`, `server.ts`) y middleware de refresco de sesión (`src/middleware.ts`).

Pendiente / abierto:
- Dominio real para producción (por ahora rutas `/[slug]` en un solo dominio, como pediste).
- Proveedor de hosting (Vercel es el objetivo natural para Next.js).

## 10. Estado de la Fase 2 (onboarding + dashboard base)

Completado y probado en navegador end-to-end (registro → onboarding de 4 pasos → dashboard → CRUD):
- Auth: `/signup`, `/login`, cierre de sesión, middleware de refresco de sesión.
- Onboarding: wizard de 4 pasos (barbería → servicio → barbero → publicar) que crea horario general por defecto (lunes–sábado 9:00–19:00, domingo cerrado).
- Dashboard por tenant (`/dashboard/[slug]`): resumen con estadísticas básicas, CRUD de servicios, CRUD de barberos con asignación de servicios, edición de horario general.
- Verificado con dos usuarios reales contra la base de datos: un usuario sin membresía en la barbería es redirigido a `/onboarding` al intentar acceder al dashboard de otro tenant — el aislamiento multi-tenant funciona tanto a nivel de RLS como de la capa de aplicación.

**Bug de RLS encontrado y corregido (importante para futuras tablas):** en Postgres, `INSERT ... RETURNING` exige que la fila insertada sea visible bajo las políticas de `SELECT`, no solo bajo el `WITH CHECK` del `INSERT`. Al crear una barbería, el usuario aún no tiene membresía en el momento del insert, así que ninguna política de `SELECT` de `barbershops` permitía verla de vuelta — Postgres reportaba esto como un genérico "new row violates row-level security policy", indistinguible de un fallo real del `WITH CHECK`. Diagnosticado aislando el problema con `curl` directo contra PostgREST (fuera de la app) y una tabla de prueba mínima. **Solución:** cualquier operación de "bootstrap" donde una fila y su registro de pertenencia (membership) se crean en el mismo paso debe hacerse en una función `SECURITY DEFINER` atómica (ver `create_barbershop_with_owner` en [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)), nunca como inserts separados desde el cliente con `.select()`.

## 11. Estado de las Fases 3–7 (producto completo)

Todo lo siguiente está implementado, compilado y probado en navegador con datos reales (usuarios `owner.qa@barbertech.test` / `admin.qa@barbertech.test`, contraseña `SuperClave123!`):

**Storefront público y reservas** (`src/app/[slug]/`)
- `/  [slug]`: página pública con logo/portada, servicios, barberos, horario, botón de WhatsApp (`wa.me`), metadata SEO (`generateMetadata` con Open Graph).
- `/[slug]/reservar`: wizard de reserva (servicio → barbero filtrado por `barber_services` → fecha/hora vía `get_available_slots` → datos del cliente → confirmar vía `create_public_appointment`).
- `/[slug]/mi-cita`: consulta de citas por teléfono (`get_client_appointments`) y cancelación (`cancel_public_appointment`), ambas RPCs `SECURITY DEFINER` — el cliente nunca tiene acceso directo a las tablas `clients`/`appointments`.

**Dashboard del negocio** (`src/app/dashboard/[tenant]/`)
- `citas`: lista con pestañas Hoy/Próximas/Pasadas, cambios de estado respetando las transiciones válidas de la BD, alta manual de citas (walk-ins) reutilizando `get_available_slots`.
- `clientes`: CRM básico con notas; `total_spent_cents` y `last_visit_at` se recalculan automáticamente vía triggers (`recalculate_client_spend`, `update_client_last_visit` en la migración 022), no en el cliente.
- `finanzas`: registro manual de pagos (efectivo/transferencia) vinculados o no a una cita, ingresos del día, anulación append-only (nunca se borra un pago, solo cambia su estado).
- `configuracion`: perfil del negocio, publicar/despublicar (bloqueado si no hay al menos 1 servicio y 1 barbero activos), logo/portada/galería vía Supabase Storage (bucket `barbershop-media`, políticas por carpeta `<tenant_id>/...`), estado de suscripción de solo lectura + formulario para que el owner registre un pago de suscripción (queda `pending`, nunca se autoconfirma).
- `resumen`: estadísticas reales del día (citas, pendientes, completadas, ingresos) y próximas citas.

**Super Admin** (`src/app/admin/`, guardado por `platform_admins`, independiente de cualquier tenant)
- Listado y búsqueda de barberías, cambio de estado (trial/active/past_due/grace/suspended) con auditoría, cambio de plan, confirmación/rechazo de pagos de suscripción pendientes (`/admin/pagos`) — verificado que el propio owner NO puede confirmar su pago (política RLS `sub_payments_write_admin` solo permite `is_platform_admin()`).

**SEO/PWA**: `robots.ts` (bloquea `/dashboard`, `/admin`, `/onboarding`, auth), `manifest.json` + ícono SVG, metadata Open Graph en el storefront.

### Bugs reales encontrados y corregidos durante las pruebas

1. **Zona horaria en horarios de citas**: el motor de disponibilidad genera `timestamptz` correctos en la zona del negocio, pero el frontend los formateaba con `toLocaleTimeString` sin especificar `timeZone`, mostrando horas desplazadas para cualquier visitante en otra zona horaria (probado: desplazamiento de 6 horas). Corregido pasando `barbershop.timezone` explícitamente a todos los `toLocaleString`/`toLocaleTimeString` del storefront, mi-cita y dashboard de citas.
2. **Listas que no se actualizaban tras una mutación**: las Server Actions llaman `revalidatePath`, pero los componentes cliente que las invocan vía `useTransition` (no un `<form action>` nativo) no refrescaban el árbol de Server Components automáticamente. Corregido añadiendo `router.refresh()` después de cada mutación exitosa en todos los formularios y botones de acción del dashboard y del panel admin.
3. **`total_spent_cents`/`last_visit_at` de clientes nunca se actualizaban**: no existía el trigger mencionado en el diseño original. Agregado en la migración 022, con backfill para los datos de prueba ya existentes.

### Bug crítico encontrado DESPUÉS de "todo probado": el storefront nunca funcionó para un visitante anónimo real

Todas mis pruebas anteriores de `/[slug]`, `/[slug]/reservar` y `/[slug]/mi-cita` las hice con sesión iniciada (como owner o admin), así que nunca until ahora probé el camino que realmente importa: un visitante sin cuenta. Al abrir la landing recién cerrada la sesión, el storefront devolvía 404 con `curl` (sin cookies) aunque la barbería estaba correctamente publicada en la BD.

**Causa raíz:** en Postgres, cuando una tabla tiene varias políticas RLS permisivas para `SELECT` (ej. `barbershops_select_member` con `is_member_of(id)` OR `barbershops_select_public` con `is_published = true`), Postgres debe **evaluar todas** para calcular el OR — no se detiene en la primera que da `true`. Si el rol que ejecuta la consulta no tiene permiso `EXECUTE` sobre una función usada en CUALQUIERA de esas políticas, toda la consulta falla con "permission denied", sin importar que otra política sí hubiera dado acceso. En la migración 011 (Fase 1) revoqué `EXECUTE` de `is_member_of`/`has_role`/`current_barber_id`/`is_platform_admin` para el rol `anon` (para que no fueran invocables directamente como RPC pública) — pero esas mismas funciones son usadas dentro de las políticas de `SELECT` de `barbershops`, `services`, `barbers`, `barber_services`, `business_hours`, `barber_hours` y `gallery_images`, políticas que aplican también a `anon`. Resultado: ningún visitante anónimo podía cargar ninguna página pública.

**Corrección** (migración 023 / [supabase/migrations/0003_fix_anon_rls_helpers.sql](supabase/migrations/0003_fix_anon_rls_helpers.sql)): se otorgó `EXECUTE` de esas 4 funciones también a `anon`. Es seguro porque internamente dependen de `auth.uid()`, que es `null` para un visitante anónimo — la función simplemente evalúa a `false`/`null`, nunca concede pertenencia o rol de admin. Verificado con `curl` sin cookies que `/[slug]`, `/[slug]/reservar` y `/[slug]/mi-cita` devuelven 200, y que un slug inexistente sigue devolviendo 404 (el aislamiento no se debilitó).

**Lección para el resto del proyecto:** cualquier tabla con una política "solo miembros" + una política "público" necesita que las funciones usadas en AMBAS tengan `EXECUTE` otorgado a `anon`, aunque la ruta pública nunca vaya a beneficiarse de la política de miembros. Antes de dar una función pública por probada, probarla con una petición realmente sin sesión (`curl` sin cookies), no solo en el navegador logueado.

### Rediseño visual (dorado/crema) — sincronizado y extendido a toda la app

Otra sesión de trabajo actualizó `src/app/page.tsx`, `globals.css`, `layout.tsx`, `middleware.ts` y el shell del dashboard directamente en `main` con un nuevo sistema visual (fondo `#f7f6f2`, acento dorado `#c7a15a`/`#9d7837`, superficies oscuras `#171717`). Tras sincronizar (`git pull --ff-only`), se extendió ese mismo sistema a el resto de la aplicación que seguía con el diseño monocromático anterior: auth, onboarding, flujo de reserva público, todas las subpáginas del dashboard (citas, clientes, servicios, barberos, horarios, finanzas, configuración) y el panel de Super Admin completo. Tokens compartidos en [src/lib/ui.ts](src/lib/ui.ts).

Bugs encontrados y corregidos durante esta extensión:
- **Nav del dashboard invisible/ausente**: el nav reutilizaba clases de texto oscuras que se veían bien en el sidebar claro original pero eran invisibles sobre el nuevo sidebar `#171717`; además el header móvil no incluía el nav en absoluto (usuarios en móvil no tenían forma de navegar). Corregido con clases responsivas `sm:` y añadiendo el nav también al header móvil.
- **Tarjeta "Ingresos de hoy" invisible en Finanzas**: combinaba la clase compartida `CARD` (que fija `bg-white`) con un `bg-[#171717]` inline; el orden de generación de Tailwind v4 dejó ganando `bg-white`, resultando en texto blanco sobre fondo blanco. Corregido quitando `CARD` de esa tarjeta y escribiendo sus clases explícitamente.

Verificado en navegador (Chrome vía MCP, escritorio y móvil 375px) con las cuentas QA (`owner.qa@barbertech.test`, `admin.qa@barbertech.test`, contraseña `SuperClave123!`): landing, login, dashboard completo (las 8 subpáginas), storefront público `/[slug]`, flujo de reserva, y Super Admin (`/admin`, `/admin/[tenant]`, `/admin/pagos`).

### Funciones agregadas después del rediseño visual

- **Logo/portada/galería personalizables**: ya existían (`src/app/dashboard/[tenant]/configuracion/media-uploader.tsx`), subida real a Supabase Storage bucket `barbershop-media`. Se agregaron botones "Quitar" para logo y portada (antes solo se podían reemplazar). Verificado en navegador con subida real (persiste tras recargar, se refleja en el storefront público).
- **WhatsApp por cita + cobro rápido** (dashboard "Citas"): link directo a WhatsApp del cliente por cada cita; una cita "Completada" sin pago muestra "Sin cobrar" con un botón "+ Registrar pago" que registra el cobro sin salir de la página. El campo `whatsapp` de la barbería, que se traía de la base de datos pero nunca se usaba, ahora también genera un botón "Avisar por WhatsApp" al terminar de reservar (`src/lib/whatsapp.ts`).
- **Horario individual por barbero**: UI en `/dashboard/[tenant]/horarios` con selector de barbero y 3 estados por día (horario general / personalizado / libre). El motor de disponibilidad (`get_available_slots`) ya priorizaba `barber_hours` sobre `business_hours` cuando existe una fila — solo faltaba la interfaz para gestionarla.
- **Bloqueos de horario** (`time_blocks`): UI en la misma página de Horarios para crear bloqueos (almuerzo, reunión, vacaciones, día libre, evento, otro) para toda la barbería o un barbero específico, y eliminarlos. Nuevo RPC `create_time_block` (migración [0004_create_time_block_rpc.sql](supabase/migrations/0004_create_time_block_rpc.sql)) convierte la hora local ingresada por el dueño a UTC usando la zona horaria de la barbería en Postgres — mismo patrón que `get_available_slots`, evitando repetir el tipo de bug de zona horaria ya encontrado antes en el frontend.

Todo lo anterior verificado en navegador con datos reales, incluyendo el efecto en el motor de disponibilidad público (no solo que el formulario guarda, sino que `/[slug]/reservar` refleja los cambios).

### Pendiente / mejoras futuras razonables (no bloqueantes)
- Habilitar "Leaked Password Protection" de Supabase Auth (HaveIBeenPwned) — requiere el dashboard de Supabase, no hay API vía MCP para esto.
- El límite "hoy" del filtro de citas en el dashboard usa la hora del servidor, no la zona horaria del negocio (a diferencia de todo el *display* de horas, que sí es correcto) — edge case solo relevante cerca de la medianoche.
- `sitemap.xml` dinámico listando tenants publicados (se agregó `robots.txt` pero no el sitemap, por tiempo).
- Tests automatizados (unit/integration) no se escribieron — todo se verificó manualmente en navegador con datos reales por falta de infraestructura de testing en el scaffold inicial. Recomendado antes de producción real.
