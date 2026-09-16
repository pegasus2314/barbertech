-- notify_new_appointment is a trigger function only — nobody should be able
-- to call it directly as an RPC (PostgREST auto-exposes public functions by
-- default). Same pattern as 0005_security_hardening.sql for internal helpers.
revoke execute on function public.notify_new_appointment() from anon, authenticated;
