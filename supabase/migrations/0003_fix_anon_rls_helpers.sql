-- Critical fix: these helper functions are called INSIDE RLS policy expressions that
-- apply to every role, including anon (e.g. barbershops_select_member OR
-- barbershops_select_public). Postgres must be able to EVALUATE every permissive policy
-- on a table to compute the OR, even ones that end up false — if the evaluating role
-- lacks EXECUTE on a function referenced by ANY applicable policy, the whole query fails
-- with "permission denied", regardless of whether a different policy would have granted
-- access. Revoking EXECUTE from anon (migration 011) broke public/anonymous access to
-- every table with a "member OR public" policy pair (barbershops, services, barbers,
-- barber_services, business_hours, barber_hours, gallery_images) — the storefront never
-- actually worked for a real signed-out visitor, only for logged-in testers. Internally
-- these functions already return false/null for anon (auth.uid() is null), so granting
-- EXECUTE is safe: it does not let anon prove membership or admin status, it just lets
-- the false result be computed instead of erroring.
grant execute on function public.is_member_of(uuid) to anon;
grant execute on function public.has_role(uuid, text[]) to anon;
grant execute on function public.current_barber_id(uuid) to anon;
grant execute on function public.is_platform_admin() to anon;
