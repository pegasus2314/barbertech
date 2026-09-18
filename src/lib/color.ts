// Derives lighter/darker variants of a barbershop's chosen accent color so
// one hex picked in Configuración can drive text-on-cream, text-on-dark, and
// hover states without a barbershop having to pick 4 different colors.

const DEFAULT_ACCENT = "#c7a15a";

function isValidHex(hex: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

function normalizeHex(hex: string) {
  const clean = hex.replace("#", "");
  return clean.length === 3
    ? clean
        .split("")
        .map((c) => c + c)
        .join("")
    : clean;
}

// percent > 0 mixes toward white (lighten), < 0 mixes toward black (darken).
export function shade(hex: string, percent: number): string {
  const safe = isValidHex(hex) ? hex : DEFAULT_ACCENT;
  const num = parseInt(normalizeHex(safe), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const t = percent < 0 ? 0 : 255;
  const p = Math.min(Math.abs(percent), 1);
  const mix = (c: number) => Math.round((t - c) * p) + c;
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function accentPalette(rawHex: string | null | undefined) {
  const base = rawHex && isValidHex(rawHex) ? rawHex : DEFAULT_ACCENT;
  return {
    base,
    deep: shade(base, -0.35), // readable on cream backgrounds
    light: shade(base, 0.55), // readable on dark backgrounds
  };
}

export { DEFAULT_ACCENT };
