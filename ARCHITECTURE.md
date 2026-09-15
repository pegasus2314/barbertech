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
- Repositorio remoto en GitHub: no hay `gh` CLI ni token disponible en este entorno para crear el repo por API. Necesito que me des la URL de un repo vacío (o que lo crees tú) para hacer el primer push.
- Dominio real para producción (por ahora rutas `/[slug]` en un solo dominio, como pediste).
- Proveedor de hosting (Vercel es el objetivo natural para Next.js).
