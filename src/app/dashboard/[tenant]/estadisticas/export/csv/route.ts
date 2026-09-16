import { NextResponse } from "next/server";
import { getMonthlyStats, monthLabel, formatMoney } from "../../data";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function row(cells: (string | number)[]) {
  return cells.map((c) => csvEscape(String(c))).join(",") + "\r\n";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await params;
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const stats = await getMonthlyStats(tenant, year, month);

  let csv = "";
  csv += row(["BarberTech — Reporte mensual"]);
  csv += row([stats.barbershopName]);
  csv += row([monthLabel(month, year)]);
  csv += row([]);
  csv += row(["Resumen"]);
  csv += row(["Ingresos del mes", formatMoney(stats.totalRevenueCents)]);
  csv += row(["Citas completadas", stats.completedCount]);
  csv += row(["Ticket promedio", formatMoney(stats.avgTicketCents)]);
  csv += row(["Canceladas / no llegó", stats.cancelledCount]);
  csv += row([]);

  csv += row(["Servicios más vendidos"]);
  csv += row(["Servicio", "Citas", "Ingresos"]);
  for (const s of stats.topServices) csv += row([s.name, s.count, formatMoney(s.revenueCents)]);
  csv += row([]);

  csv += row(["Barberos con más citas"]);
  csv += row(["Barbero", "Citas", "Ingresos"]);
  for (const b of stats.topBarbers) csv += row([b.name, b.count, formatMoney(b.revenueCents)]);
  csv += row([]);

  csv += row(["Clientes que más gastaron"]);
  csv += row(["Cliente", "Gastado"]);
  for (const c of stats.topClients) csv += row([c.name, formatMoney(c.spentCents)]);

  // UTF-8 BOM so Excel renders accents/currency symbols correctly instead of
  // guessing the wrong encoding.
  const body = "﻿" + csv;
  const filename = `barbertech-${tenant}-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
