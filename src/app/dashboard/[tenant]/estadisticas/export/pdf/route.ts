import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getMonthlyStats, monthLabel, formatMoney } from "../../data";

const GOLD = rgb(0.78, 0.63, 0.35);
const INK = rgb(0.09, 0.09, 0.09);
const MUTED = rgb(0.45, 0.45, 0.45);
const PAGE_WIDTH = 595.28; // A4 portrait, points
const MARGIN = 50;

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

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  function text(value: string, opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {}) {
    page.drawText(value, { x: MARGIN, y, size: opts.size ?? 11, font: opts.f ?? font, color: opts.color ?? INK });
  }

  function line(gap = 20) {
    y -= gap;
  }

  function rule() {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: rgb(0.9, 0.89, 0.85) });
  }

  text("BARBERTECH", { size: 10, f: bold, color: GOLD });
  line(22);
  text(stats.barbershopName, { size: 22, f: bold });
  line(20);
  text(`Reporte mensual — ${monthLabel(month, year)}`, { size: 12, color: MUTED });
  line(30);
  rule();
  line(30);

  // Summary row
  const summary: [string, string][] = [
    ["Ingresos del mes", formatMoney(stats.totalRevenueCents)],
    ["Citas completadas", String(stats.completedCount)],
    ["Ticket promedio", formatMoney(stats.avgTicketCents)],
    ["Canceladas / no llegó", String(stats.cancelledCount)],
  ];
  const colWidth = contentWidth / summary.length;
  summary.forEach(([label, value], i) => {
    const x = MARGIN + i * colWidth;
    page.drawText(label.toUpperCase(), { x, y, size: 8, font: bold, color: MUTED });
    page.drawText(value, { x, y: y - 18, size: 15, font: bold, color: INK });
  });
  line(60);
  rule();
  line(30);

  function section(title: string, rows: string[][], empty: string) {
    text(title, { size: 13, f: bold });
    line(22);
    if (rows.length === 0) {
      text(empty, { size: 10, color: MUTED });
      line(24);
      return;
    }
    for (const cols of rows) {
      page.drawText(cols[0], { x: MARGIN, y, size: 10, font });
      if (cols[1]) page.drawText(cols[1], { x: MARGIN + 260, y, size: 10, font, color: MUTED });
      page.drawText(cols[2] ?? "", { x: PAGE_WIDTH - MARGIN - 80, y, size: 10, font: bold });
      line(18);
    }
    line(10);
  }

  section(
    "Servicios más vendidos",
    stats.topServices.map((s) => [s.name, `${s.count} citas`, formatMoney(s.revenueCents)]),
    "Sin servicios completados este mes.",
  );
  section(
    "Barberos con más citas",
    stats.topBarbers.map((b) => [b.name, `${b.count} citas`, formatMoney(b.revenueCents)]),
    "Sin citas completadas este mes.",
  );
  section(
    "Clientes que más gastaron",
    stats.topClients.map((c) => [c.name, "", formatMoney(c.spentCents)]),
    "Sin pagos registrados este mes.",
  );

  const bytes = await pdfDoc.save();
  const filename = `barbertech-${tenant}-${year}-${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
