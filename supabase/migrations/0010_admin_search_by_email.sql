-- Applied to Supabase project aqdcvzyenkskfhtgkhyx via MCP; mirrored here for version control.
--
-- Lets the Super Admin panel search barbershops by an owner/staff email, not just
-- by business name or slug. auth.users isn't reachable from the regular PostgREST
-- client, so this has to be a SECURITY DEFINER function (same pattern as
-- is_platform_admin()) that checks the caller is a platform admin before touching it.

create or replace function public.admin_search_barbershops(search text default null)
returns table (
  id uuid,
  name text,
  slug text,
  status text,
  is_published boolean,
  created_at timestamptz,
  plan_id uuid,
  plan_name text,
  plan_price_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'forbidden';
  end if;

  return query
    select distinct b.id, b.name, b.slug, b.status, b.is_published, b.created_at,
           b.plan_id, p.name as plan_name, p.price_cents as plan_price_cents
    from barbershops b
    left join plans p on p.id = b.plan_id
    left join memberships m on m.tenant_id = b.id
    left join auth.users u on u.id = m.user_id
    where search is null or search = ''
       or b.name ilike '%' || search || '%'
       or b.slug ilike '%' || search || '%'
       or u.email ilike '%' || search || '%'
    order by b.created_at desc
    limit 100;
end;
$$;

revoke execute on function public.admin_search_barbershops(text) from public;
grant execute on function public.admin_search_barbershops(text) to authenticated;
