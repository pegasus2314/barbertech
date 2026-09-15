-- BarberTech initial schema: multi-tenant core, RLS, availability engine, booking RPC.
-- Applied to Supabase project aqdcvzyenkskfhtgkhyx via MCP; mirrored here for version control.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ============ Core tenant tables ============

create table plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  price_cents integer not null default 0,
  currency text not null default 'DOP',
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

create table barbershops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  address text,
  social_links jsonb not null default '{}'::jsonb,
  timezone text not null default 'America/Santo_Domingo',
  currency text not null default 'DOP',
  status text not null default 'trial' check (status in ('trial','active','past_due','grace','suspended')),
  plan_id uuid references plans(id),
  is_published boolean not null default false,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_barbershops_slug on barbershops(slug);
create index idx_barbershops_plan on barbershops(plan_id);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','barber','staff')),
  status text not null default 'active' check (status in ('active','invited','disabled')),
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);
create index idx_memberships_user on memberships(user_id);
create index idx_memberships_tenant on memberships(tenant_id);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'trial' check (status in ('trial','active','past_due','grace','suspended')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_subscriptions_tenant on subscriptions(tenant_id);
create index idx_subscriptions_plan on subscriptions(plan_id);

create table subscription_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  amount_cents integer not null,
  method text not null check (method in ('cash','transfer')),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  reference text,
  notes text,
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_subscription_payments_tenant on subscription_payments(tenant_id);
create index idx_subscription_payments_subscription on subscription_payments(subscription_id);
create index idx_subscription_payments_confirmed_by on subscription_payments(confirmed_by);
create index idx_subscription_payments_created_by on subscription_payments(created_by);

-- ============ Barbershop resources ============

create table barbers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  membership_id uuid references memberships(id) on delete set null,
  display_name text not null,
  photo_url text,
  bio text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_barbers_tenant on barbers(tenant_id);
create index idx_barbers_membership on barbers(membership_id);

create table services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_services_tenant on services(tenant_id);

create table barber_services (
  tenant_id uuid not null references barbershops(id) on delete cascade,
  barber_id uuid not null references barbers(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (barber_id, service_id)
);
create index idx_barber_services_tenant on barber_services(tenant_id);

create table business_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  unique(tenant_id, weekday)
);

create table barber_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  barber_id uuid not null references barbers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time,
  close_time time,
  is_off boolean not null default false,
  unique(barber_id, weekday)
);
create index idx_barber_hours_tenant on barber_hours(tenant_id);

create table time_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  barber_id uuid references barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  reason text,
  type text not null default 'other' check (type in ('lunch','meeting','vacation','day_off','event','other')),
  created_at timestamptz not null default now()
);
create index idx_time_blocks_tenant on time_blocks(tenant_id, barber_id, starts_at, ends_at);

create table gallery_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_gallery_images_tenant on gallery_images(tenant_id);

-- ============ Clients, appointments, payments, audit ============

create table clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  last_visit_at timestamptz,
  total_spent_cents integer not null default 0,
  unique(tenant_id, phone)
);
create index idx_clients_tenant on clients(tenant_id);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  barber_id uuid not null references barbers(id) on delete cascade,
  service_id uuid not null references services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'pending' check (status in ('pending','confirmed','in_progress','completed','cancelled','rejected','no_show')),
  price_cents integer not null,
  notes text,
  created_by text not null default 'client' check (created_by in ('client','owner','manager','barber')),
  created_at timestamptz not null default now(),
  constraint no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status not in ('cancelled','rejected','no_show'))
);
create index idx_appointments_tenant_barber_start on appointments(tenant_id, barber_id, starts_at);
create index idx_appointments_tenant_start on appointments(tenant_id, starts_at);
create index idx_appointments_client on appointments(client_id);
create index idx_appointments_service on appointments(service_id);

create table appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  tenant_id uuid not null references barbershops(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  note text
);
create index idx_appt_status_history_appt on appointment_status_history(appointment_id);
create index idx_appt_status_history_changed_by on appointment_status_history(changed_by);
create index idx_appt_status_history_tenant on appointment_status_history(tenant_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  amount_cents integer not null,
  method text not null check (method in ('cash','transfer')),
  status text not null default 'recorded' check (status in ('recorded','voided')),
  reference text,
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_payments_tenant on payments(tenant_id);
create index idx_payments_appointment on payments(appointment_id);
create index idx_payments_client on payments(client_id);
create index idx_payments_recorded_by on payments(recorded_by);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references barbershops(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_log_tenant on audit_log(tenant_id, created_at desc);
create index idx_audit_log_actor on audit_log(actor_id);

-- ============ Auth/RLS helper functions (SECURITY DEFINER, avoid RLS recursion) ============

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

create or replace function public.is_member_of(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where tenant_id = p_tenant_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_role(p_tenant_id uuid, p_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where tenant_id = p_tenant_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(p_roles)
  );
$$;

create or replace function public.current_barber_id(p_tenant_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select b.id from barbers b
  join memberships m on m.id = b.membership_id
  where b.tenant_id = p_tenant_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS ============

alter table plans enable row level security;
alter table platform_admins enable row level security;
alter table profiles enable row level security;
alter table barbershops enable row level security;
alter table memberships enable row level security;
alter table subscriptions enable row level security;
alter table subscription_payments enable row level security;
alter table barbers enable row level security;
alter table services enable row level security;
alter table barber_services enable row level security;
alter table business_hours enable row level security;
alter table barber_hours enable row level security;
alter table time_blocks enable row level security;
alter table gallery_images enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table appointment_status_history enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

create policy plans_select_all on plans for select using (true);
create policy plans_write_admin on plans for all using (is_platform_admin()) with check (is_platform_admin());

create policy platform_admins_select_self on platform_admins for select using (is_platform_admin());

create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_update_own on profiles for update using (id = auth.uid());
create policy profiles_insert_own on profiles for insert with check (id = auth.uid());

create policy barbershops_select_member on barbershops for select using (is_member_of(id));
create policy barbershops_select_public on barbershops for select using (is_published = true);
create policy barbershops_select_admin on barbershops for select using (is_platform_admin());
create policy barbershops_insert_authenticated on barbershops for insert to authenticated with check (auth.uid() is not null);
create policy barbershops_update_owner on barbershops for update using (has_role(id, array['owner','manager'])) with check (has_role(id, array['owner','manager']));
create policy barbershops_update_admin on barbershops for update using (is_platform_admin()) with check (is_platform_admin());

create policy memberships_select_own on memberships for select using (user_id = auth.uid());
create policy memberships_select_managers on memberships for select using (has_role(tenant_id, array['owner','manager']));
create policy memberships_select_admin on memberships for select using (is_platform_admin());
create policy memberships_write_owner on memberships for all using (has_role(tenant_id, array['owner'])) with check (has_role(tenant_id, array['owner']));
create policy memberships_insert_self_owner on memberships for insert with check (
  user_id = auth.uid() and role = 'owner'
  and not exists (select 1 from memberships m2 where m2.tenant_id = memberships.tenant_id)
);

create policy subscriptions_select_member on subscriptions for select using (is_member_of(tenant_id));
create policy subscriptions_select_admin on subscriptions for select using (is_platform_admin());
create policy subscriptions_write_admin on subscriptions for all using (is_platform_admin()) with check (is_platform_admin());

create policy sub_payments_select_member on subscription_payments for select using (has_role(tenant_id, array['owner','manager']));
create policy sub_payments_select_admin on subscription_payments for select using (is_platform_admin());
create policy sub_payments_insert_owner on subscription_payments for insert with check (
  has_role(tenant_id, array['owner','manager']) and created_by = auth.uid() and status = 'pending'
);
create policy sub_payments_write_admin on subscription_payments for update using (is_platform_admin()) with check (is_platform_admin());

create policy barbers_select_member on barbers for select using (is_member_of(tenant_id));
create policy barbers_select_public on barbers for select using (
  is_active = true and exists (select 1 from barbershops b where b.id = tenant_id and b.is_published = true)
);
create policy barbers_write_managers on barbers for all using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']));

create policy services_select_member on services for select using (is_member_of(tenant_id));
create policy services_select_public on services for select using (
  is_active = true and exists (select 1 from barbershops b where b.id = tenant_id and b.is_published = true)
);
create policy services_write_managers on services for all using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']));

create policy barber_services_select_member on barber_services for select using (is_member_of(tenant_id));
create policy barber_services_select_public on barber_services for select using (
  exists (select 1 from barbershops b where b.id = tenant_id and b.is_published = true)
);
create policy barber_services_write_managers on barber_services for all using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']));

create policy business_hours_select_member on business_hours for select using (is_member_of(tenant_id));
create policy business_hours_select_public on business_hours for select using (
  exists (select 1 from barbershops b where b.id = tenant_id and b.is_published = true)
);
create policy business_hours_write_managers on business_hours for all using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']));

create policy barber_hours_select_member on barber_hours for select using (is_member_of(tenant_id));
create policy barber_hours_select_public on barber_hours for select using (
  exists (select 1 from barbershops b where b.id = tenant_id and b.is_published = true)
);
create policy barber_hours_write_managers on barber_hours for all using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']));
create policy barber_hours_write_barber_self on barber_hours for update using (
  barber_id = current_barber_id(tenant_id)
) with check (barber_id = current_barber_id(tenant_id));

create policy time_blocks_select_member on time_blocks for select using (is_member_of(tenant_id));
create policy time_blocks_write_managers on time_blocks for all using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']));
create policy time_blocks_write_barber_self on time_blocks for all using (
  barber_id is not null and barber_id = current_barber_id(tenant_id)
) with check (barber_id is not null and barber_id = current_barber_id(tenant_id));

create policy gallery_select_member on gallery_images for select using (is_member_of(tenant_id));
create policy gallery_select_public on gallery_images for select using (
  exists (select 1 from barbershops b where b.id = tenant_id and b.is_published = true)
);
create policy gallery_write_managers on gallery_images for all using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']));

create policy clients_select_member on clients for select using (is_member_of(tenant_id));
create policy clients_write_managers on clients for all using (has_role(tenant_id, array['owner','manager','staff'])) with check (has_role(tenant_id, array['owner','manager','staff']));

create policy appointments_select_managers on appointments for select using (has_role(tenant_id, array['owner','manager','staff']));
create policy appointments_select_barber_self on appointments for select using (barber_id = current_barber_id(tenant_id));
create policy appointments_write_managers on appointments for all using (has_role(tenant_id, array['owner','manager','staff'])) with check (has_role(tenant_id, array['owner','manager','staff']));
create policy appointments_update_barber_self on appointments for update using (barber_id = current_barber_id(tenant_id)) with check (barber_id = current_barber_id(tenant_id));

create policy appt_history_select_managers on appointment_status_history for select using (has_role(tenant_id, array['owner','manager','staff']));
create policy appt_history_select_barber on appointment_status_history for select using (
  exists (select 1 from appointments a where a.id = appointment_id and a.barber_id = current_barber_id(tenant_id))
);
create policy appt_history_insert on appointment_status_history for insert with check (
  has_role(tenant_id, array['owner','manager','staff'])
  or exists (select 1 from appointments a where a.id = appointment_id and a.barber_id = current_barber_id(tenant_id))
);

create policy payments_select_managers on payments for select using (has_role(tenant_id, array['owner','manager']));
create policy payments_insert_managers on payments for insert with check (has_role(tenant_id, array['owner','manager']));
create policy payments_update_void_managers on payments for update using (has_role(tenant_id, array['owner','manager'])) with check (has_role(tenant_id, array['owner','manager']) and status = 'voided');

create policy audit_log_select_managers on audit_log for select using (tenant_id is not null and has_role(tenant_id, array['owner','manager']));
create policy audit_log_select_admin on audit_log for select using (is_platform_admin());
create policy audit_log_insert on audit_log for insert with check (
  actor_id = auth.uid() and (tenant_id is null or is_member_of(tenant_id) or is_platform_admin())
);

-- ============ Appointment status transitions + audit triggers ============

create or replace function public.enforce_appointment_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allowed jsonb := '{
    "pending": ["confirmed","cancelled","rejected"],
    "confirmed": ["in_progress","cancelled","no_show"],
    "in_progress": ["completed","cancelled"],
    "completed": [],
    "cancelled": [],
    "rejected": [],
    "no_show": []
  }'::jsonb;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (allowed -> old.status) ? new.status then
      raise exception 'Invalid appointment status transition: % -> %', old.status, new.status;
    end if;
    insert into appointment_status_history (appointment_id, tenant_id, from_status, to_status, changed_by)
    values (new.id, new.tenant_id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointment_status_transition on appointments;
create trigger trg_appointment_status_transition
  before update on appointments
  for each row execute function public.enforce_appointment_status_transition();

create or replace function public.log_appointment_created()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into audit_log (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  values (new.tenant_id, auth.uid(), 'created_appointment', 'appointment', new.id,
          jsonb_build_object('status', new.status, 'starts_at', new.starts_at));
  return new;
end;
$$;

drop trigger if exists trg_log_appointment_created on appointments;
create trigger trg_log_appointment_created
  after insert on appointments
  for each row execute function public.log_appointment_created();

-- ============ Public availability + booking RPCs ============

create or replace function public.get_available_slots(
  p_tenant_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_day date,
  p_slot_increment_minutes integer default 15
)
returns table(slot_start timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_duration integer;
  v_weekday smallint := extract(dow from p_day);
  v_open time;
  v_close time;
  v_is_closed boolean;
  v_tz text;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_cursor timestamptz;
  v_candidate_end timestamptz;
begin
  select duration_minutes into v_duration from services
    where id = p_service_id and tenant_id = p_tenant_id and is_active = true;
  if v_duration is null then
    return;
  end if;

  select timezone into v_tz from barbershops where id = p_tenant_id and is_published = true;
  if v_tz is null then
    return;
  end if;

  select open_time, close_time, is_off into v_open, v_close, v_is_closed
    from barber_hours where barber_id = p_barber_id and weekday = v_weekday;

  if not found then
    select open_time, close_time, is_closed into v_open, v_close, v_is_closed
      from business_hours where tenant_id = p_tenant_id and weekday = v_weekday;
  end if;

  if v_open is null or v_close is null or coalesce(v_is_closed, false) then
    return;
  end if;

  v_window_start := (p_day::text || ' ' || v_open::text)::timestamp at time zone v_tz;
  v_window_end := (p_day::text || ' ' || v_close::text)::timestamp at time zone v_tz;

  v_cursor := v_window_start;
  while v_cursor + (v_duration || ' minutes')::interval <= v_window_end loop
    v_candidate_end := v_cursor + (v_duration || ' minutes')::interval;

    if not exists (
      select 1 from time_blocks tb
      where tb.tenant_id = p_tenant_id
        and (tb.barber_id = p_barber_id or tb.barber_id is null)
        and tstzrange(tb.starts_at, tb.ends_at) && tstzrange(v_cursor, v_candidate_end)
    ) and not exists (
      select 1 from appointments a
      where a.tenant_id = p_tenant_id
        and a.barber_id = p_barber_id
        and a.status not in ('cancelled','rejected','no_show')
        and tstzrange(a.starts_at, a.ends_at) && tstzrange(v_cursor, v_candidate_end)
    ) then
      slot_start := v_cursor;
      return next;
    end if;

    v_cursor := v_cursor + (p_slot_increment_minutes || ' minutes')::interval;
  end loop;
end;
$$;

grant execute on function public.get_available_slots to anon, authenticated;

create or replace function public.create_public_appointment(
  p_tenant_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration integer;
  v_price integer;
  v_ends_at timestamptz;
  v_client_id uuid;
  v_appointment_id uuid;
  v_is_published boolean;
begin
  select is_published into v_is_published from barbershops where id = p_tenant_id;
  if not coalesce(v_is_published, false) then
    raise exception 'Barbershop is not accepting bookings';
  end if;

  select duration_minutes, price_cents into v_duration, v_price
    from services where id = p_service_id and tenant_id = p_tenant_id and is_active = true;
  if v_duration is null then
    raise exception 'Invalid or inactive service';
  end if;

  if not exists (select 1 from barbers where id = p_barber_id and tenant_id = p_tenant_id and is_active = true) then
    raise exception 'Invalid or inactive barber';
  end if;

  if not exists (
    select 1 from barber_services where barber_id = p_barber_id and service_id = p_service_id and tenant_id = p_tenant_id
  ) then
    raise exception 'This barber does not offer the selected service';
  end if;

  v_ends_at := p_starts_at + (v_duration || ' minutes')::interval;

  insert into clients (tenant_id, full_name, phone, email)
  values (p_tenant_id, p_client_name, p_client_phone, p_client_email)
  on conflict (tenant_id, phone) do update set full_name = excluded.full_name
  returning id into v_client_id;

  insert into appointments (tenant_id, client_id, barber_id, service_id, starts_at, ends_at, price_cents, notes, created_by, status)
  values (p_tenant_id, v_client_id, p_barber_id, p_service_id, p_starts_at, v_ends_at, v_price, p_notes, 'client', 'pending')
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

grant execute on function public.create_public_appointment to anon, authenticated;

insert into plans (key, name, price_cents, currency, limits, features, sort_order) values
  ('basic', 'Basic', 0, 'DOP', '{"max_barbers":2,"max_services":10,"max_gallery_images":10}', '{"public_storefront":true,"appointments":true}', 1),
  ('pro', 'Pro', 99900, 'DOP', '{"max_barbers":6,"max_services":30,"max_gallery_images":40}', '{"public_storefront":true,"appointments":true,"advanced_reports":true}', 2),
  ('premium', 'Premium', 199900, 'DOP', '{"max_barbers":20,"max_services":100,"max_gallery_images":150}', '{"public_storefront":true,"appointments":true,"advanced_reports":true,"priority_support":true}', 3)
on conflict (key) do nothing;

-- ============ Security hardening ============

create schema if not exists extensions;
alter extension btree_gist set schema extensions;

revoke execute on function public.is_member_of(uuid) from public;
revoke execute on function public.has_role(uuid, text[]) from public;
revoke execute on function public.current_barber_id(uuid) from public;
revoke execute on function public.is_platform_admin() from public;

grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.has_role(uuid, text[]) to authenticated;
grant execute on function public.current_barber_id(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============ Barbershop bootstrap (barbershop + owner membership + default hours) ============
--
-- INSERT ... RETURNING requires the SELECT policy to allow visibility of the new row.
-- A freshly created barbershop has no membership yet, so no SELECT policy on barbershops
-- permits the creator to see it back, and PostgREST/Postgres report that as a generic
-- RLS violation on the INSERT itself. Bootstrapping (barbershop + owner membership +
-- default hours) must happen atomically, server-side, as one trusted SECURITY DEFINER
-- call instead of separate client-driven inserts.
create or replace function public.create_barbershop_with_owner(p_name text, p_base_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := p_base_slug;
  v_id uuid;
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  loop
    begin
      insert into barbershops (name, slug) values (p_name, v_slug) returning id into v_id;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        raise exception 'Could not generate a unique slug';
      end if;
      v_slug := p_base_slug || '-' || substr(md5(random()::text), 1, 4);
    end;
  end loop;

  insert into memberships (tenant_id, user_id, role) values (v_id, auth.uid(), 'owner');

  insert into business_hours (tenant_id, weekday, open_time, close_time, is_closed)
  select v_id, w,
         case when w = 0 then null else '09:00'::time end,
         case when w = 0 then null else '19:00'::time end,
         w = 0
  from generate_series(0, 6) as w;

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

revoke execute on function public.create_barbershop_with_owner(text, text) from public;
grant execute on function public.create_barbershop_with_owner(text, text) to authenticated;
