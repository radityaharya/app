/**
 * Deterministic colour from an arbitrary string.
 *
 * Algorithm:
 *   1. Hash the input string with djb2 → a stable 32-bit integer.
 *   2. Map to a hue in the perceptually-pleasant range (avoid red/green
 *      which clash with status colours in the app).
 *   3. Fix saturation and lightness so every colour is vivid but readable
 *      on both light and dark backgrounds.
 *
 * The KRL API already supplies a hex colour in metadata.origin.color.
 * This function is the fallback when that field is missing or empty.
 */
export function colorFromString(input: string): string {
  if (!input) return '#6B7280';

  // djb2 hash
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }

  // Spread evenly across 360° but skip 0-15° (red, clashes with alerts)
  // and 100-140° (yellow-green, clashes with status-active green).
  // We use a 300° arc starting at 20°.
  const hue = 20 + (hash % 300);

  // Fixed saturation + lightness that reads well on both themes
  const s = 68;
  const l = 44;

  return hslToHex(hue, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);

  function f(n: number) {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  }

  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Returns the API-supplied colour if valid, otherwise derives one from
 * line + destination so fallback stripes stay meaningful per route.
 */
export function lineColor(
  apiColor: string | undefined,
  lineName: string,
  destinationNameOrId?: string,
): string {
  if (apiColor && apiColor.startsWith('#') && apiColor.length >= 4) {
    return apiColor;
  }
  return colorFromString([lineName, destinationNameOrId].filter(Boolean).join(' -> '));
}
