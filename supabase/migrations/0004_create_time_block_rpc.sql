-- Converts a local wall-clock time (in the barbershop's own timezone) to the
-- correct UTC timestamptz before inserting, the same pattern get_available_slots
-- already uses for slot generation. security invoker: RLS on time_blocks still
-- decides who may insert (owner/manager for any barber, or a barber for themself).
create or replace function public.create_time_block(
  p_tenant_id uuid,
  p_starts_at_local text,
  p_ends_at_local text,
  p_type text,
  p_barber_id uuid default null,
  p_reason text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tz text;
  v_id uuid;
begin
  select timezone into v_tz from barbershops where id = p_tenant_id;
  if v_tz is null then
    raise exception 'Barbershop not found';
  end if;

  insert into time_blocks (tenant_id, barber_id, starts_at, ends_at, type, reason)
  values (
    p_tenant_id,
    p_barber_id,
    (p_starts_at_local::timestamp) at time zone v_tz,
    (p_ends_at_local::timestamp) at time zone v_tz,
    p_type,
    nullif(p_reason, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_time_block(uuid, text, text, text, uuid, text) to authenticated;
