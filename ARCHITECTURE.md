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

Todo lo siguiente está implementado, compilado y probado en navegador con datos reales (usuarios `owner.qa@barbertech.test` / `admin.qa@barbertech.test` / `intruder.qa@barbertech.test` — este último sin membresía en ninguna barbería real, usado para probar aislamiento entre tenants —, contraseña `SuperClave123!`):

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

### Auditoría del Security Advisor de Supabase (migración [0005_security_hardening.sql](supabase/migrations/0005_security_hardening.sql))

El advisor reportó 3 categorías de hallazgo. Se revisó cada una contra el código real antes de tocar nada, porque dos de las tres son parte del diseño intencional de este proyecto y "arreglarlas" a ciegas habría reintroducido bugs ya resueltos esta sesión.

**Corregidos:**
- `public_bucket_allows_listing`: la política `storage_barbershop_media_read` permitía a cualquiera (incluido `anon`) listar/enumerar TODOS los archivos del bucket `barbershop-media` vía `.list()`, cruzando todos los tenants. Un bucket público ya sirve objetos individuales sin pasar por RLS (endpoint `/storage/v1/object/public/...`), así que esta política solo habilitaba el listado, no el acceso normal. **Casi se rompe algo real aquí**: mi primer intento fue eliminar la política por completo, lo cual rompió la subida de logo/portada (`upload({upsert:true})` sí necesita SELECT para su chequeo de existencia) — lo detecté de inmediato probando en el navegador, y lo corregí con una política más angosta (solo el owner/manager del propio tenant puede hacer SELECT, igual que ya aplicaba a INSERT/UPDATE/DELETE) en vez de revertir al original. Verificado: la subida sigue funcionando, y `list()` anónimo ahora devuelve `[]`.
- `create_barbershop_with_owner` ejecutable por `anon`: la función ya rechaza con "Authentication required" si `auth.uid()` es null, así que no había riesgo real, pero no necesitaba el grant. Revocado sin cambio de comportamiento.

**Deliberadamente NO corregidos** (el advisor los marca WARN sin conocer el diseño):
- `create_public_appointment`, `cancel_public_appointment`, `get_available_slots`, `get_client_appointments` ejecutables por `anon`: ES el propósito de estas funciones — la reserva pública no requiere cuenta. Cada una valida su propia autorización internamente (coincidencia de teléfono para cancelar/consultar, validación de tenant/servicio/barbero para reservar) en vez de depender de `auth.uid()`.
- `has_role`, `is_member_of`, `is_platform_admin`, `current_barber_id` ejecutables por `anon`: **necesario**, no un descuido. Estas funciones se usan dentro de políticas RLS de `SELECT` en `barbershops`/`services`/`barbers`/etc. Cuando una tabla tiene varias políticas permisivas de `SELECT`, Postgres debe evaluar todas para calcular el OR — no hay short-circuit — así que si `anon` no tiene `EXECUTE` sobre una función usada en CUALQUIER política aplicable, toda la consulta falla con "permission denied", aunque otra política de la misma tabla sí diera acceso. Es exactamente el bug corregido en la migración `0003_fix_anon_rls_helpers.sql` (el storefront público devolvía 404 a visitantes anónimos reales). Revocar esto lo reintroduciría.

**No corregible desde aquí:**
- `auth_leaked_password_protection`: toggle en Authentication → Policies del dashboard de Supabase (HaveIBeenPwned). No hay API para esto vía las herramientas MCP disponibles.

### SEO y pruebas automatizadas

- **`sitemap.xml` dinámico** ([src/app/sitemap.ts](src/app/sitemap.ts)): lista la landing más cada barbería publicada (storefront + página de reserva), usando `updated_at` como `lastmod`. `robots.txt` ahora apunta a él. La URL base se resuelve en [src/lib/site-url.ts](src/lib/site-url.ts): `NEXT_PUBLIC_SITE_URL` si está definida, si no `VERCEL_PROJECT_PRODUCTION_URL` (inyectada automáticamente por Vercel, estable entre deployments a diferencia de `VERCEL_URL`), si no `localhost:3000`.
- **Vitest** (`npm test`): primera infraestructura de tests del proyecto. Cubre la lógica pura más crítica:
  - `nextStatuses()` — verificado que coincide exactamente con el mapa de transiciones dentro del trigger `enforce_appointment_status_transition()` en `0001_init.sql`. Estas dos copias están duplicadas a mano sin ningún otro mecanismo que las mantenga sincronizadas; si alguien cambia una sin la otra, el test lo detecta.
  - `waLink()` — teléfonos nulos/vacíos/sin dígitos, limpieza de símbolos, encoding del mensaje.
  - `siteUrl()` — precedencia de variables de entorno.

### Corrección de zona horaria en los límites de "hoy" (lado de consulta, no de display)

El resumen del dashboard, "Ingresos de hoy" en Finanzas, y el filtro "Hoy" en Citas calculaban el inicio/fin del día con `new Date(); setHours(0,0,0,0)`, que usa la zona horaria del proceso de Node (el servidor), no la de la barbería — mismo tipo de bug ya corregido antes en el *display* de horas, pero esta vez del lado de la consulta. Reemplazado por `zonedDayBounds()` ([src/lib/timezone.ts](src/lib/timezone.ts)), que calcula los instantes UTC reales de medianoche a medianoche en cualquier zona IANA. El test que escribí para esta función detectó un bug real en mi primera implementación (el redondeo de segundos de `Intl.DateTimeFormat` desviaba el offset ~1s justo en el límite `.999`) antes de que llegara a la app — prueba concreta del valor de tener tests para este tipo de lógica.

### Cumplimiento real de suscripción (migración [0006_shorten_trial_and_access_enforcement.sql](supabase/migrations/0006_shorten_trial_and_access_enforcement.sql))

Hasta este punto `barbershops.status` era solo una etiqueta — nada en el código realmente restringía el acceso de una barbería con la prueba vencida o sin pagar. Cualquiera podía registrarse y usar la plataforma indefinidamente gratis.

Reglas de negocio (decisión del usuario): **6 días de prueba → 3 días de gracia (acceso completo + aviso) → bloqueado**.

- [`src/lib/subscription/access.ts`](src/lib/subscription/access.ts): `getAccessState()` calculado al momento de la consulta desde `trial_ends_at`/`current_period_end`, sin depender de un cron que actualice un estado guardado.
- Bloqueo aplicado en tres puntos: el layout del dashboard (pantalla de "renueva tu suscripción" que incrusta el propio formulario de pago, para que el dueño pueda pagar sin necesitar otra página que también estaría bloqueada), el storefront público y `/reservar`, y — el punto que realmente importa — dentro del RPC `create_public_appointment` mismo, para que nadie pueda saltarse el bloqueo llamando la API directamente. `is_barbershop_active(uuid)` es el espejo público de la misma lógica, ya que `anon` no puede leer `subscriptions` (solo miembros/admin por RLS).
- **Bug real encontrado antes de enviarlo**: la primera versión usaba `trial_ends_at` como respaldo aunque ya hubiera pasado `current_period_end`, porque la fecha de prueba original (fijada una sola vez al registrarse) seguía siendo numéricamente futura. Corregido haciendo que `current_period_end` reemplace a `trial_ends_at` en cuanto existe, en ambas copias (TS y SQL); agregado un test de regresión.
- Verificado en navegador de punta a punta: forcé una barbería a estado bloqueado, confirmé que dashboard/storefront/reserva rechazan acceso correctamente, registré un pago de suscripción desde la pantalla bloqueada, lo confirmé como admin de plataforma, y confirmé que la barbería quedó usable de inmediato.

### Protección de contraseñas filtradas (sin depender de Supabase Pro)

El toggle nativo de Supabase ("Leaked Password Protection") está detrás del plan Pro — el proyecto está en el plan gratuito. En vez de pagar solo por esto, se replicó la misma protección con la API pública y gratuita de "Pwned Passwords" de HaveIBeenPwned ([src/lib/security/pwned-password.ts](src/lib/security/pwned-password.ts)): k-anonimato, solo se envían los primeros 5 caracteres del hash SHA-1 de la contraseña (calculado en el navegador vía Web Crypto), nunca la contraseña ni el hash completo. Falla "abierto" (no bloquea el registro) si la API no responde. Conectado al formulario de registro — probado en navegador con una contraseña filtrada real (rechazada) y una fuerte/única (pasó correctamente).

### Tests de integración contra RLS real (`npm run test:integration`)

Docker no está instalado en la máquina de desarrollo (bloquea la ruta local pgTAP + Supabase CLI), y se descartó un branch de pruebas de pago ($0.01344/hora) a favor de la opción gratuita. En su lugar, [src/test/integration/rls.integration.test.ts](src/test/integration/rls.integration.test.ts) usa `@supabase/supabase-js` real contra el mismo proyecto de Supabase (Postgres/RLS/Auth reales, nada simulado), aislado así:

- Usuario dedicado `intruder.qa@barbertech.test` (sin membresía en ninguna barbería real) para probar aislamiento entre tenants sin tocar `barber-king-qa` ni `los-baah`.
- Cada corrida crea su propia barbería desechable con prefijo `zzz-test-`, y la borra al final vía el RPC `cleanup_test_barbershop` (migración [0007_test_cleanup_rpc.sql](supabase/migrations/0007_test_cleanup_rpc.sql)) — que se niega a borrar cualquier cosa sin ese prefijo, así que no hace falta una service role key ni hay riesgo de borrar algo real por error.
- Corre por separado de `npm test` (config propia en `vitest.integration.config.ts`) porque necesita red y las credenciales de `.env.local`.

12 tests, los 12 pasando contra el proyecto real: visibilidad de `RETURNING` al crear una barbería, aislamiento cruzado de tenants (lectura Y escritura bloqueadas en ambos sentidos), acceso anónimo al storefront público, que suspender una barbería bloquea `create_public_appointment` incluso llamando el RPC directamente, y que un owner no puede autoconfirmarse su propio pago de suscripción (solo `platform_admin` puede).

### Estadísticas mensuales + exportar Excel/PDF (`src/app/dashboard/[tenant]/estadisticas/`)

Nueva página con selector de mes (por defecto el mes actual en la zona horaria de la barbería, vía `zonedMonthBounds()` en [src/lib/timezone.ts](src/lib/timezone.ts)): ingresos, citas completadas, ticket promedio, canceladas, y top 5 de servicios/barberos/clientes — todo calculado de citas y pagos reales, nada hardcodeado.

Dos rutas de exportación (Route Handlers, no Server Actions, porque necesitan mandar los headers reales de descarga):
- **Excel** (`export/csv`): CSV real con BOM UTF-8 (para que Excel muestre bien acentos y el símbolo de RD$), en vez del paquete `xlsx` de npm — ese paquete tiene dos vulnerabilidades "high" sin parche (prototype pollution, ReDoS) en su código de *lectura*. Ninguna aplica aquí (solo escribimos datos que generamos, nunca leemos un archivo subido), pero un CSV abre igual en Excel sin ninguna dependencia ni riesgo, así que no había razón para aceptar esa exposición. `npm audit --omit=dev` da 0 vulnerabilidades tras quitar `xlsx`.
- **PDF** (`export/pdf`): usa `pdf-lib` (sin advisories conocidos) para dibujar un reporte de una página. Verificado descomprimiendo el stream de contenido generado directamente (confirma operadores de dibujo reales) y renderizando el archivo en el visor nativo de PDF de Chrome vía blob URL — el archivo es válido; la vista previa en blanco que dio la herramienta Read al principio era una rareza de ese visor, no un bug del archivo.

### Pendiente / mejoras futuras razonables (no bloqueantes)
- Instalar Docker para poder correr pgTAP localmente sería la mejora natural sobre el enfoque actual (probaría contra una base de datos completamente aislada en vez del proyecto compartido) — no bloqueante, la cobertura actual ya es real.

## 12. Notificaciones: campanita en tiempo real + Web Push, y aviso al cliente por WhatsApp

Dos canales, elegidos deliberadamente por costo y por lo que cada dato garantiza: el teléfono del cliente es obligatorio al reservar, el correo no lo es, así que WhatsApp (basado en teléfono) es el único canal gratis y confiable hacia el cliente sin aprobación de Meta ni API de pago. Para el dueño/barbero, en vez de correo se eligió Web Push real (notificación del sistema operativo, gratis, sin proveedor externo) porque el pedido explícito fue "que también le notifique fuera de la página".

**Campanita in-app** (`src/app/dashboard/[tenant]/notification-bell.tsx`): tabla `notifications` (migración [0008_notifications_and_push.sql](supabase/migrations/0008_notifications_and_push.sql)) con un trigger `notify_new_appointment()` en `appointments` que crea la fila automáticamente solo cuando `created_by = 'client'` (una cita creada por el propio staff no necesita notificarle a sí mismo). El bell hace un fetch inicial + se suscribe a `postgres_changes` para insertar en vivo sin recargar, y expone "Marcar todas leídas".

**Bug real encontrado en pruebas de navegador — Realtime silencioso sin RLS de usuario**: el `.subscribe()` reportaba `SUBSCRIBED` y no lanzaba ningún error, pero ningún INSERT llegaba nunca al cliente. Diagnosticado consultando directamente `realtime.subscription` en Postgres: la fila mostraba `claims_role: "anon"` en vez de `"authenticated"`, aunque el usuario tenía sesión iniciada en el navegador. `createBrowserClient` de `@supabase/ssr` no sincroniza automáticamente el JWT de sesión hacia el socket de Realtime — sin eso, la política RLS `notifications_select_members` (`is_member_of(tenant_id)`) evalúa `auth.uid()` como `null` para cada intento de broadcast y descarta la fila en silencio, sin que el cliente se entere. Corregido llamando `supabase.realtime.setAuth(session.access_token)` antes de crear el canal. Verificado insertando una fila de prueba por SQL y confirmando que aparece en el bell sin recargar la página, con `claims_role` ya en `authenticated`. **Lección:** con Realtime + RLS, `SUBSCRIBED` solo confirma la conexión del socket, nunca que las políticas vayan a dejar pasar algo — hay que probarlo con una escritura real, no confiando en el estado de la suscripción.

Segundo bug de navegador (no de datos): el nombre del canal `notifications:${tenantId}` colisionaba consigo mismo bajo Fast Refresh/Strict Mode (mismo topic ya suscrito → "cannot add postgres_changes callbacks... after subscribe()"). Corregido agregando un sufijo aleatorio al nombre del canal por montaje.

**Web Push** (`src/lib/push/send.ts`, `public/sw.js`, `src/lib/supabase/admin.ts`): par de llaves VAPID generadas una vez con `web-push`; la pública viaja al navegador (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`), la privada nunca sale del servidor. Suscripciones del navegador se guardan en `push_subscriptions` (RLS: cada quien solo ve/borra la suya). Enviar un push requiere leer las suscripciones de *todos* los miembros de un tenant — algo que ningún usuario individual puede hacer por RLS ni debería poder vía RPC pública (expondría endpoints/keys de push de otros usuarios a quien tenga la anon key) — así que `sendPushToTenant` usa un cliente `service_role` server-only (`src/lib/supabase/admin.ts`, con `import "server-only"` para que Next.js falle el build si algo intenta importarlo desde un componente cliente). Se dispara desde el Server Action `bookAppointment` (`src/app/[slug]/actions.ts`) envuelto en `after()` de `next/server` para no bloquear la respuesta al cliente que reserva, garantizando igual que corra hasta el final en Vercel (vía `waitUntil`) en lugar de un fire-and-forget que el runtime podría cortar. Suscripciones que devuelven 404/410 (el navegador las revocó) se borran solas.

**Aviso al cliente por WhatsApp** (`src/app/dashboard/[tenant]/citas/appointment-row.tsx`): ya existía un botón de WhatsApp genérico por cita; se cambió el mensaje para que sea específico según el estado de la cita (pendiente/confirmada/cancelada/rechazada/no-show) e incluya fecha, hora y barbero en la zona horaria del negocio — antes decía siempre lo mismo sin importar si la cita seguía en pie o se había cancelado. Sigue siendo de un clic manual, no automático: WhatsApp Business API real (mensajes sin que nadie toque nada) requiere verificación de negocio con Meta y tiene costo por conversación, evaluado y descartado por ahora a favor de la opción gratis.

**Variables de entorno nuevas** (`.env.local`, y deben agregarse también en Vercel para producción): `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Sin `SUPABASE_SERVICE_ROLE_KEY`/`VAPID_PRIVATE_KEY`, `sendPushToTenant` simplemente no hace nada (falla abierto) — la campanita y el WhatsApp siguen funcionando igual.

**Correo transaccional con marca propia** (`supabase/email-templates/*.html`): Supabase Auth manda sus correos (confirmación de registro, reset de contraseña, magic link, invitación) con una plantilla genérica sin estilo por defecto, y su servicio de correo integrado está limitado a un puñado de envíos por hora "best-effort" — explícitamente no apto para producción según la propia documentación de Supabase. Se diseñaron 4 plantillas HTML con la marca real (mismo sistema cream/gold/black, tablas con estilos inline para compatibilidad de clientes de correo) y se activó un SMTP personalizado (Gmail con contraseña de aplicación, gratis) desde el dashboard de Supabase — ninguna de las dos cosas vive en el código ni se puede automatizar vía las herramientas MCP disponibles, así que quedan documentadas aquí con instrucciones para pegarlas manualmente.

Bug real encontrado en producción, con usuarios reales ya afectados (dos registros fallidos antes de detectarlo): tras activar el SMTP personalizado, todo intento de registro devolvía "Error sending confirmation email". Diagnosticado consultando los logs de Auth directamente vía la herramienta `query_logs` (no hay forma de ver esto desde la UI del dashboard) — el error real de Gmail era `535 5.7.8 Username and Password not accepted`, es decir, la contraseña de aplicación guardada no era válida (probablemente se guardó la contraseña normal de la cuenta en vez de la contraseña de aplicación de 16 caracteres). Corregido regenerando la contraseña de aplicación. **Lección:** el mensaje de error que ve el usuario final ("Error sending confirmation email") no dice nada sobre la causa real — siempre hay que revisar los logs de Auth del proyecto para ver el error SMTP subyacente antes de adivinar.

Un usuario de prueba real quedó con el correo sin confirmar porque el envío nunca le llegó (posible filtro de spam de una cuenta de Gmail recién creada) a pesar de que los logs mostraban el envío como exitoso — se le confirmó la cuenta manualmente vía `execute_sql` (`update auth.users set email_confirmed_at = now()`) como solución puntual para no bloquear la prueba; no es un mecanismo automatizado, solo una intervención manual de emergencia.

**Datos bancarios + QR en el pago de suscripción — implementado y luego revertido**: se agregó una tarjeta con los datos de la cuenta bancaria (banco, titular, cédula, número de cuenta, IBAN, SWIFT) más un QR generado en el servidor, tanto en el dashboard (configuración y pantalla de suscripción vencida) como en una sección pública nueva de la landing (`#pagar`, a donde apuntaban los botones "Compra ya" de los planes de pago). Se quitó por decisión del usuario después de que la sección quedara invisible en producción una vez desplegada (las variables `SUBSCRIPTION_BANK_*` nunca se agregaron a Vercel), lo que generó confusión — el botón "Compra ya" parecía mandar directo a registro en vez de mostrar el QR, porque la tarjeta entera no se renderizaba sin esas variables. En vez de depurar el problema de configuración, se optó por revertir la función completa: los botones de precios pagos vuelven a ir directo a `/signup`, y el dashboard solo muestra el formulario para registrar el pago (sin instrucciones de a dónde transferir, como estaba antes).

## 13. PWA — instalable en el teléfono/computadora, sin tienda de apps

El proyecto ya tenía `manifest.json` y `public/sw.js` (agregados para Web Push), pero les faltaba lo necesario para que el navegador realmente ofrezca "Agregar a pantalla de inicio":

- **Íconos completos**: solo existía un ícono de 512×512. Se generaron `icon-192.png` (Android/manifest) e `icon-180.png` (Apple touch icon) con Pillow (`/c/Python314/python`, ya que `python3` en el PATH resolvía al stub de Microsoft Store sin PIL instalado), y se agregaron entradas `purpose: "maskable"` en el manifest — el logo ya tenía suficiente margen alrededor para recortarse bien en forma de círculo/squircle sin más ajuste.
- **Meta tags de iOS**: Safari no lee el manifest igual que Chrome/Android — necesita sus propios `<meta>` (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`). Se agregaron vía el campo `appleWebApp` de la Metadata API de Next.js en `src/app/layout.tsx`, en vez de escribir los `<meta>` a mano.
- **Registro del service worker en cada carga del panel** (`src/app/dashboard/[tenant]/register-sw.tsx`): antes el service worker solo se registraba si el dueño activaba las notificaciones push desde la campanita — eso significaba que Chrome/Android no tenía señal de instalabilidad (service worker registrado) hasta que alguien tocara ese botón. Ahora se registra automáticamente al entrar al dashboard, sin pedir permiso de notificaciones — son dos cosas separadas: registrar el worker vs. suscribirse a push.
- **Botón "Instalar app"** (`src/app/dashboard/[tenant]/configuracion/install-app-card.tsx`): escucha el evento `beforeinstallprompt` (Chrome/Edge en Android y escritorio) para mostrar un botón real que dispara el diálogo nativo de instalación. iOS Safari no dispara ese evento — ahí se muestra la instrucción manual (compartir → agregar a pantalla de inicio). Detecta también si la app ya está instalada (`display-mode: standalone`) para no mostrar nada redundante.

**Deliberadamente fuera de alcance por ahora**: publicar en Google Play / App Store (requiere envolver la web en un proyecto con Capacitor, cuenta de desarrollador de pago en ambas tiendas, y revisión manual de Apple) — el usuario eligió explícitamente la ruta gratuita (PWA) primero.
