-- Applied to Supabase project aqdcvzyenkskfhtgkhyx via MCP; mirrored here for version control.
--
-- Backs the in-app support form (replaces the WhatsApp bubble so no personal
-- phone number is exposed). Anyone — logged in or not — can send a message;
-- inserts only happen through a server action using the service-role client.
-- Platform admins read and resolve them from /admin/soporte via RLS.

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  context text,
  message text not null check (char_length(message) between 5 and 2000),
  status text not null default 'new' check (status in ('new', 'resolved')),
  resolved_at timestamptz
);

create index idx_support_messages_status on support_messages (status, created_at desc);

alter table support_messages enable row level security;

create policy support_messages_select_admin on support_messages
  for select using (is_platform_admin());

create policy support_messages_update_admin on support_messages
  for update using (is_platform_admin()) with check (is_platform_admin());
