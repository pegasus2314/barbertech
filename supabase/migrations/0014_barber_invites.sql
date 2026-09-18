-- Applied to Supabase project aqdcvzyenkskfhtgkhyx via MCP; mirrored here for version control.
--
-- Backs "invite a barber by email" (Configuración de personalización pass
-- also covered the "Invite user" auth email template, which had no feature
-- behind it until now). Matching the accepting user against a pending row
-- here by their *verified, authenticated* email — rather than trusting
-- anything from Supabase's user_metadata, which the user can edit themselves
-- via auth.updateUser() — is what makes accept-invite safe to run with the
-- service-role client bypassing RLS.

create table barber_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  email text not null,
  display_name text not null,
  service_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index idx_barber_invites_tenant on barber_invites(tenant_id);
create index idx_barber_invites_email_status on barber_invites(email, status);

alter table barber_invites enable row level security;

create policy barber_invites_select_member on barber_invites for select using (is_member_of(tenant_id));
create policy barber_invites_write_managers on barber_invites for all
  using (has_role(tenant_id, array['owner', 'manager']))
  with check (has_role(tenant_id, array['owner', 'manager']));
