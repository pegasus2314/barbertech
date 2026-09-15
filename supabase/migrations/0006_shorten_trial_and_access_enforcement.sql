-- Shortens the free trial from 14 to 6 days, and adds real enforcement for
-- what happens once it (or a paid period) lapses: a 3-day grace window, then
-- blocked. The grace/blocked computation itself lives in application code
-- (src/lib/subscription/access.ts) for the dashboard, computed at read time
-- from trial_ends_at/current_period_end rather than a stored status a cron
-- would need to flip — no scheduled job required. This migration adds the
-- public-safe mirror of that same logic for the anonymous booking flow,
-- which cannot read the subscriptions table (members/admin-only by RLS).
-- Keep the day thresholds here in sync with TRIAL_DAYS/GRACE_DAYS in that file.

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
  v_basic_plan_id uuid;
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

  select id into v_basic_plan_id from plans where key = 'basic' limit 1;
  if v_basic_plan_id is not null then
    update barbershops set plan_id = v_basic_plan_id where id = v_id;
    insert into subscriptions (tenant_id, plan_id, status, trial_ends_at)
    values (v_id, v_basic_plan_id, 'trial', now() + interval '6 days');
  end if;

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

-- Public-safe boolean the storefront/booking flow can check without needing
-- SELECT on subscriptions. security definer so it can read that table
-- regardless of caller.
create or replace function public.is_barbershop_active(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_barbershop_status text;
  v_sub_status text;
  v_trial_ends_at timestamptz;
  v_period_end timestamptz;
  v_anchor timestamptz;
begin
  select status into v_barbershop_status from barbershops where id = p_tenant_id;
  if v_barbershop_status is null then
    return false;
  end if;
  if v_barbershop_status = 'suspended' then
    return false;
  end if;

  select status, trial_ends_at, current_period_end
    into v_sub_status, v_trial_ends_at, v_period_end
    from subscriptions where tenant_id = p_tenant_id;

  if v_sub_status = 'active' and v_period_end is not null and v_period_end > now() then
    return true;
  end if;

  if v_trial_ends_at is not null and v_trial_ends_at > now() then
    return true;
  end if;

  v_anchor := coalesce(v_period_end, v_trial_ends_at);
  if v_anchor is null then
    return true;
  end if;

  return now() <= v_anchor + interval '3 days';
end;
$$;

grant execute on function public.is_barbershop_active(uuid) to anon, authenticated;

-- The real enforcement point: even if someone bypasses the booking UI and
-- calls the RPC directly, a suspended shop can no longer create appointments.
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

  if not is_barbershop_active(p_tenant_id) then
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
