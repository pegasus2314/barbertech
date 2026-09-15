-- Response to Supabase security advisor findings (2026-09-15).
--
-- 1. public_bucket_allows_listing: `storage_barbershop_media_read` let anyone
--    (including anon) SELECT every row of storage.objects for this bucket,
--    which enables listing/browsing all files across all tenants via the
--    Storage API's list() call. Public buckets already serve individual
--    objects to anyone through the unauthenticated
--    /storage/v1/object/public/... endpoint, which does not consult RLS at
--    all — so this SELECT policy was not needed for getPublicUrl() access,
--    only for browsing.
--
--    Replaced with a policy scoped to the owner/manager of the tenant that
--    owns the folder (mirrors the existing INSERT/UPDATE/DELETE policies).
--    This is still required: the app's upload({ upsert: true }) call for
--    logo/cover replacement does an existence check that needs SELECT to
--    succeed, even though the app never lists the bucket. A blanket revert
--    to the original public-read policy was tried and rejected — verified
--    the narrower policy fixes both the upload flow and the listing
--    exposure (anon list() now returns []).
drop policy if exists storage_barbershop_media_read on storage.objects;

create policy storage_barbershop_media_read_owner on storage.objects for select
  to authenticated
  using (
    bucket_id = 'barbershop-media'
    and has_role((storage.foldername(name))[1]::uuid, array['owner','manager'])
  );

-- 2. anon_security_definer_function_executable (create_barbershop_with_owner):
--    the function already raises "Authentication required" when auth.uid()
--    is null, so anon could never do anything with this grant — but it
--    shouldn't have had EXECUTE at all. No behavior change for the app
--    (onboarding always calls this authenticated).
revoke execute on function public.create_barbershop_with_owner(text, text) from anon;

-- Deliberately NOT changed, despite advisor WARNs:
--
-- - create_public_appointment / cancel_public_appointment / get_available_slots /
--   get_client_appointments executable by anon: this is the entire point of
--   these functions — the public booking flow has no accounts. Each does its
--   own authorization internally (phone match for cancel/lookup, tenant/
--   service/barber validation for booking) instead of relying on auth.uid().
--
-- - has_role / is_member_of / is_platform_admin / current_barber_id
--   executable by anon: REQUIRED. These are called from inside RLS SELECT
--   policies on barbershops/services/barbers/barber_services/business_hours/
--   barber_hours/gallery_images. When a table has multiple permissive SELECT
--   policies, Postgres must evaluate every one of them to compute the OR —
--   it does not short-circuit — so if anon lacks EXECUTE on a function used
--   in ANY applicable policy, the whole query throws "permission denied",
--   even though a different policy on the same table would have granted
--   access. This is exactly the bug fixed in migration
--   0003_fix_anon_rls_helpers.sql (the public storefront 404'd for real
--   anonymous visitors). Revoking these grants would reintroduce it.
