-- Applied to Supabase project aqdcvzyenkskfhtgkhyx via MCP; mirrored here for version control.
--
-- Only `notifications` was in the supabase_realtime publication, so
-- postgres_changes subscriptions on `appointments` (added for the live
-- Citas list) never received anything — not a client bug, the table simply
-- wasn't broadcasting.

alter publication supabase_realtime add table public.appointments;
