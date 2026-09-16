import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { zonedMonthBounds } from "@/lib/timezone";

export type MonthlyStats = {
  barbershopName: string;
  timezone: string;
  year: number;
  month: number;
  totalRevenueCents: number;
  completedCount: number;
  cancelledCount: number;
  avgTicketCents: number;
  topServices: { name: string; count: number; revenueCents: number }[];
  topBarbers: { name: string; count: number; revenueCents: number }[];
  topClients: { name: string; spentCents: number }[];
};

export async function getMonthlyStats(
  tenant: string,
  year: number,
  month: number,
): Promise<MonthlyStats> {
  const { supabase, barbershop } = await getTenantContext(tenant);
  const { start, end } = zonedMonthBounds(barbershop.timezone, year, month);

  const [{ data: appointments }, { data: payments }] = await Promise.all([
    supabase
      .from("appointments")
      .select("status, price_cents, service_id, barber_id, services(name), barbers(display_name)")
      .eq("tenant_id", barbershop.id)
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString()),
    supabase
      .from("payments")
      .select("amount_cents, client_id, clients(full_name)")
      .eq("tenant_id", barbershop.id)
      .eq("status", "recorded")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
  ]);

  const completed = (appointments ?? []).filter((a) => a.status === "completed");
  const cancelledStatuses = new Set(["cancelled", "rejected", "no_show"]);
  const cancelledCount = (appointments ?? []).filter((a) => cancelledStatuses.has(a.status)).length;

  const totalRevenueCents = (payments ?? []).reduce((sum, p) => sum + p.amount_cents, 0);
  const avgTicketCents = completed.length > 0 ? Math.round(totalRevenueCents / completed.length) : 0;

  const serviceMap = new Map<string, { name: string; count: number; revenueCents: number }>();
  for (const a of completed) {
    const key = a.service_id;
    const entry = serviceMap.get(key) ?? { name: a.services?.name ?? "—", count: 0, revenueCents: 0 };
    entry.count += 1;
    entry.revenueCents += a.price_cents;
    serviceMap.set(key, entry);
  }

  const barberMap = new Map<string, { name: string; count: number; revenueCents: number }>();
  for (const a of completed) {
    const key = a.barber_id;
    const entry = barberMap.get(key) ?? { name: a.barbers?.display_name ?? "—", count: 0, revenueCents: 0 };
    entry.count += 1;
    entry.revenueCents += a.price_cents;
    barberMap.set(key, entry);
  }

  const clientMap = new Map<string, { name: string; spentCents: number }>();
  for (const p of payments ?? []) {
    if (!p.client_id) continue;
    const entry = clientMap.get(p.client_id) ?? { name: p.clients?.full_name ?? "—", spentCents: 0 };
    entry.spentCents += p.amount_cents;
    clientMap.set(p.client_id, entry);
  }

  return {
    barbershopName: barbershop.name,
    timezone: barbershop.timezone,
    year,
    month,
    totalRevenueCents,
    completedCount: completed.length,
    cancelledCount,
    avgTicketCents,
    topServices: [...serviceMap.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
    topBarbers: [...barberMap.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
    topClients: [...clientMap.values()].sort((a, b) => b.spentCents - a.spentCents).slice(0, 5),
  };
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function monthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}
