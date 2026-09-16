import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getMonthlyStats, monthLabel, formatMoney } from "../../data";

const INK = rgb(0.09, 0.09, 0.09);
const DARK = rgb(0.09, 0.09, 0.09);
const GOLD = rgb(0.78, 0.63, 0.35);
const GOLD_LIGHT = rgb(0.89, 0.76, 0.5);
const CREAM = rgb(0.969, 0.965, 0.949);
const BORDER = rgb(0.906, 0.890, 0.855);
const MUTED = rgb(0.45, 0.45, 0.45);
const WHITE = rgb(1, 1, 1);

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

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
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const origin = new URL(request.url).origin;
  let logoImage = null;
  try {
    const logoRes = await fetch(`${origin}/icon.png`);
    if (logoRes.ok) logoImage = await pdfDoc.embedPng(await logoRes.arrayBuffer());
  } catch {
    // A missing logo shouldn't block the report — the rest still renders fine.
  }

  // ---------- helpers ----------
  function textAt(
    value: string,
    x: number,
    yPos: number,
    opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {},
  ) {
    page.drawText(value, { x, y: yPos, size: opts.size ?? 11, font: opts.f ?? font, color: opts.color ?? INK });
  }

  function textRightAt(value: string, xRight: number, yPos: number, opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {}) {
    const size = opts.size ?? 11;
    const f = opts.f ?? font;
    const w = f.widthOfTextAtSize(value, size);
    textAt(value, xRight - w, yPos, opts);
  }

  function box(x: number, yTop: number, w: number, h: number, fill: ReturnType<typeof rgb>, border?: ReturnType<typeof rgb>) {
    page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: fill, borderColor: border, borderWidth: border ? 0.75 : 0 });
  }

  // ---------- header band ----------
  const headerH = 110;
  box(0, PAGE_HEIGHT, PAGE_WIDTH, headerH, DARK);

  if (logoImage) {
    const logoSize = 36;
    page.drawImage(logoImage, { x: MARGIN, y: PAGE_HEIGHT - headerH / 2 - logoSize / 2, width: logoSize, height: logoSize });
    textAt("BARBERTECH", MARGIN + logoSize + 12, PAGE_HEIGHT - headerH / 2 + 3, { size: 15, f: bold, color: WHITE });
  } else {
    textAt("BARBERTECH", MARGIN, PAGE_HEIGHT - headerH / 2 + 3, { size: 15, f: bold, color: WHITE });
  }

  textRightAt("REPORTE MENSUAL", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 42, { size: 9, f: bold, color: GOLD_LIGHT });
  textRightAt(monthLabel(month, year), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 60, { size: 14, f: bold, color: WHITE });

  // ---------- title ----------
  let y = PAGE_HEIGHT - headerH - 40;
  textAt(stats.barbershopName, MARGIN, y, { size: 22, f: bold });
  y -= 34;

  // ---------- summary cards ----------
  const summary: { label: string; value: string; hero?: boolean }[] = [
    { label: "Ingresos del mes", value: formatMoney(stats.totalRevenueCents), hero: true },
    { label: "Citas completadas", value: String(stats.completedCount) },
    { label: "Ticket promedio", value: formatMoney(stats.avgTicketCents) },
    { label: "Canceladas / no llegó", value: String(stats.cancelledCount) },
  ];
  const gap = 10;
  const cardW = (CONTENT_WIDTH - gap * (summary.length - 1)) / summary.length;
  const cardH = 62;

  summary.forEach((s, i) => {
    const x = MARGIN + i * (cardW + gap);
    box(x, y, cardW, cardH, s.hero ? DARK : CREAM, s.hero ? undefined : BORDER);
    textAt(s.label.toUpperCase(), x + 12, y - 20, { size: 7.5, f: bold, color: s.hero ? GOLD_LIGHT : MUTED });
    textAt(s.value, x + 12, y - 44, { size: 16, f: bold, color: s.hero ? WHITE : INK });
  });
  y -= cardH + 36;

  // ---------- ranking sections ----------
  function section(title: string, rows: [string, string, string][], empty: string) {
    textAt(title.toUpperCase(), MARGIN, y, { size: 10, f: bold, color: GOLD });
    y -= 18;

    const rowH = 24;
    const headerRowH = 20;
    const bodyH = rows.length > 0 ? rows.length * rowH : 30;
    const tableH = headerRowH + bodyH;

    box(MARGIN, y, CONTENT_WIDTH, tableH, WHITE, BORDER);
    box(MARGIN, y, CONTENT_WIDTH, headerRowH, CREAM);
    page.drawLine({
      start: { x: MARGIN, y: y - headerRowH },
      end: { x: MARGIN + CONTENT_WIDTH, y: y - headerRowH },
      thickness: 0.75,
      color: BORDER,
    });

    const col1X = MARGIN + 14;
    const col2X = MARGIN + CONTENT_WIDTH * 0.55;
    const col3RightX = MARGIN + CONTENT_WIDTH - 14;

    textAt("Nombre", col1X, y - 14, { size: 8, f: bold, color: MUTED });
    textAt("Detalle", col2X, y - 14, { size: 8, f: bold, color: MUTED });
    textRightAt("Total", col3RightX, y - 14, { size: 8, f: bold, color: MUTED });

    let rowY = y - headerRowH - 16;

    if (rows.length === 0) {
      textAt(empty, col1X, y - headerRowH - 12, { size: 9.5, color: MUTED });
    } else {
      rows.forEach(([name, detail, value], i) => {
        if (i > 0) {
          page.drawLine({
            start: { x: MARGIN, y: rowY + 8 },
            end: { x: MARGIN + CONTENT_WIDTH, y: rowY + 8 },
            thickness: 0.5,
            color: BORDER,
          });
        }
        textAt(name, col1X, rowY, { size: 10, f: bold });
        if (detail) textAt(detail, col2X, rowY, { size: 9.5, color: MUTED });
        textRightAt(value, col3RightX, rowY, { size: 10, f: bold, color: GOLD });
        rowY -= rowH;
      });
    }

    y -= tableH + 26;
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

  // ---------- footer ----------
  const generatedAt = new Date().toLocaleString("es-DO", { timeZone: stats.timezone, dateStyle: "medium", timeStyle: "short" });
  page.drawLine({ start: { x: MARGIN, y: 60 }, end: { x: PAGE_WIDTH - MARGIN, y: 60 }, thickness: 0.5, color: BORDER });
  textAt(`Generado el ${generatedAt}`, MARGIN, 44, { size: 8, color: MUTED });
  textRightAt("BarberTech", PAGE_WIDTH - MARGIN, 44, { size: 8, f: bold, color: MUTED });

  const bytes = await pdfDoc.save();
  const filename = `barbertech-${tenant}-${year}-${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
