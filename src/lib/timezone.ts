function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return asUTC - date.getTime();
}

/** Converts a wall-clock time (no offset, e.g. "2026-09-16T00:00:00.000") as
 * read in `timeZone` into the real UTC instant it represents. Milliseconds
 * are split off before computing the offset — right at a `.999` boundary,
 * Intl's whole-second formatting can round into the next second and throw
 * the offset off by ~1s, so the offset is derived from the truncated
 * whole-second instant and the exact milliseconds are added back after. */
function zonedTime(localIso: string, timeZone: string): Date {
  const [wholeSeconds, ms = "000"] = localIso.split(".");
  const utcGuess = new Date(`${wholeSeconds}Z`);
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset + Number(ms));
}

/** The [00:00:00.000, 23:59:59.999] range of "today" as it is currently in
 * `timeZone`, not the server's own timezone. */
export function zonedDayBounds(timeZone: string, reference: Date = new Date()) {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);

  return {
    start: zonedTime(`${dateStr}T00:00:00.000`, timeZone),
    end: zonedTime(`${dateStr}T23:59:59.999`, timeZone),
  };
}

/** The [00:00:00.000, 23:59:59.999] range of a calendar month (1-12) as it
 * exists in `timeZone`. */
export function zonedMonthBounds(timeZone: string, year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    start: zonedTime(`${year}-${pad(month)}-01T00:00:00.000`, timeZone),
    end: zonedTime(`${year}-${pad(month)}-${pad(daysInMonth)}T23:59:59.999`, timeZone),
  };
}

/** "Buenos días" / "Buenas tardes" / "Buenas noches", based on the current
 * hour in `timeZone` — not the visiting browser's or server's own clock. */
export function timeOfDayGreeting(timeZone: string, reference: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(reference),
  );

  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
