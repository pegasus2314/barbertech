-- Lets the integration test suite (src/test/integration/) clean up after
-- itself without a service-role key. Guarded by slug prefix so it can never
-- touch a real barbershop, even if called with the wrong id by mistake.
create or replace function public.cleanup_test_barbershop(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  select slug into v_slug from barbershops where id = p_tenant_id;
  if v_slug is null or v_slug not like 'zzz-test-%' then
    raise exception 'Refusing to delete a non-test barbershop (slug: %)', v_slug;
  end if;
  delete from barbershops where id = p_tenant_id;
end;
$$;

grant execute on function public.cleanup_test_barbershop(uuid) to authenticated;
