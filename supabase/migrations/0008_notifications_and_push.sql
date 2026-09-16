-- In-app notification center (the dashboard bell) plus Web Push so an owner
-- gets an OS-level notification even when the dashboard tab isn't open.
-- Two tables:
--   notifications      one row per event, tenant-scoped, read/unread.
--   push_subscriptions one row per browser a member subscribed from.
-- A trigger on appointments creates the notification row automatically for
-- any appointment a client books through the public storefront (created_by
-- = 'client') — staff-created appointments don't need to notify the staff
-- who just created them.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  appointment_id uuid references appointments(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_tenant on notifications(tenant_id, created_at desc);

alter table notifications enable row level security;

create policy notifications_select_members on notifications for select using (is_member_of(tenant_id));
create policy notifications_update_members on notifications for update using (is_member_of(tenant_id)) with check (is_member_of(tenant_id));

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index idx_push_subscriptions_tenant on push_subscriptions(tenant_id);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_select_own on push_subscriptions for select using (user_id = auth.uid());
create policy push_subscriptions_insert_own on push_subscriptions for insert with check (user_id = auth.uid() and is_member_of(tenant_id));
create policy push_subscriptions_delete_own on push_subscriptions for delete using (user_id = auth.uid());

-- Actually sending a push requires the VAPID private key, which only ever
-- lives in server code (src/lib/push/send.ts), so reading subscriptions to
-- send to happens there via the service-role client — never exposed to anon
-- or authenticated through RLS/RPC.

create or replace function public.notify_new_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_name text;
  v_service_name text;
begin
  if new.created_by <> 'client' then
    return new;
  end if;

  select full_name into v_client_name from clients where id = new.client_id;
  select name into v_service_name from services where id = new.service_id;

  insert into notifications (tenant_id, type, title, body, appointment_id)
  values (
    new.tenant_id,
    'new_appointment',
    'Nueva cita',
    coalesce(v_client_name, 'Un cliente') || ' reservó ' || coalesce(v_service_name, 'un servicio') || '.',
    new.id
  );

  return new;
end;
$$;

create trigger trg_notify_new_appointment
  after insert on appointments
  for each row execute function public.notify_new_appointment();

alter publication supabase_realtime add table notifications;
