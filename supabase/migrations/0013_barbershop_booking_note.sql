-- Applied to Supabase project aqdcvzyenkskfhtgkhyx via MCP; mirrored here for version control.
--
-- Optional short note a barbershop can show on the booking confirmation
-- screen and include in the WhatsApp confirmation message (e.g. "Trae
-- efectivo" or "Llega 5 minutos antes"). `theme` and `social_links` already
-- existed as unused jsonb columns — this is the one new column needed for
-- the customization pass (accent color, social links, booking note).

alter table barbershops add column booking_note text;
