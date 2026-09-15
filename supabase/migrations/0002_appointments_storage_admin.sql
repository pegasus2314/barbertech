-- BarberTech Fase 3+: reserva pública (consulta/cancelación), Storage para galería/logo,
-- suscripción de prueba automática al crear la barbería, estadísticas derivadas de clientes.

-- ============ Public lookup + cancellation RPCs ============

create or replace function public.get_client_appointments(
  p_tenant_id uuid,
  p_phone text
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  service_name text,
  barber_name text,
  price_cents integer
)
language sql
security definer
set search_path = public
stable
as $$
  select a.id, a.starts_at, a.ends_at, a.status, s.name, b.display_name, a.price_cents
  from appointments a
  join clients c on c.id = a.client_id
  join services s on s.id = a.service_id
  join barbers b on b.id = a.barber_id
  where a.tenant_id = p_tenant_id
    and c.phone = p_phone
  order by a.starts_at desc
  limit 20;
$$;

grant execute on function public.get_client_appointments(uuid, text) to anon, authenticated;

create or replace function public.cancel_public_appointment(
  p_appointment_id uuid,
  p_phone text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean := false;
begin
  update appointments a
  set status = 'cancelled'
  from clients c
  where a.id = p_appointment_id
    and a.client_id = c.id
    and c.phone = p_phone
    and a.status in ('pending', 'confirmed')
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

grant execute on function public.cancel_public_appointment(uuid, text) to anon, authenticated;

-- ============ Barbershop bootstrap: also start a trial subscription ============

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
    values (v_id, v_basic_plan_id, 'trial', now() + interval '14 days');
  end if;

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

-- ============ Storage: gallery / logo / cover images ============
--
-- Objects are stored under "<tenant_id>/..." — this is the ONLY tenant boundary enforced,
-- so every policy below parses the first path segment and checks membership against it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barbershop-media', 'barbershop-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy storage_barbershop_media_read on storage.objects for select
  using (bucket_id = 'barbershop-media');

create policy storage_barbershop_media_write on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'barbershop-media'
    and has_role((storage.foldername(name))[1]::uuid, array['owner','manager'])
  );

create policy storage_barbershop_media_update on storage.objects for update
  to authenticated
  using (
    bucket_id = 'barbershop-media'
    and has_role((storage.foldername(name))[1]::uuid, array['owner','manager'])
  )
  with check (
    bucket_id = 'barbershop-media'
    and has_role((storage.foldername(name))[1]::uuid, array['owner','manager'])
  );

create policy storage_barbershop_media_delete on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'barbershop-media'
    and has_role((storage.foldername(name))[1]::uuid, array['owner','manager'])
  );

-- ============ Client derived stats (total spent, last visit) ============

create or replace function public.recalculate_client_spend()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  v_client_id := coalesce(new.client_id, old.client_id);
  if v_client_id is null then
    return coalesce(new, old);
  end if;

  update clients
  set total_spent_cents = coalesce((
    select sum(amount_cents) from payments
    where client_id = v_client_id and status = 'recorded'
  ), 0)
  where id = v_client_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalculate_client_spend on payments;
create trigger trg_recalculate_client_spend
  after insert or update of status, amount_cents, client_id or delete on payments
  for each row execute function public.recalculate_client_spend();

create or replace function public.update_client_last_visit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    update clients
    set last_visit_at = new.starts_at
    where id = new.client_id and (last_visit_at is null or last_visit_at < new.starts_at);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_client_last_visit on appointments;
create trigger trg_update_client_last_visit
  after update of status on appointments
  for each row execute function public.update_client_last_visit();
