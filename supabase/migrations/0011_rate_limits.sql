-- Applied to Supabase project aqdcvzyenkskfhtgkhyx via MCP; mirrored here for version control.
--
-- Backs simple rate limiting on the public booking flow (reserve/cancel/lookup
-- an appointment) — anyone can hit those without an account, so nothing stops
-- a script from spamming a barbershop's agenda with fake appointments today.
-- Only ever written/read via the service-role admin client (server-only), so
-- RLS is enabled with no policies — that's an explicit deny for anon/authenticated.

create table rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limits_lookup on rate_limits (key, action, created_at desc);

alter table rate_limits enable row level security;
