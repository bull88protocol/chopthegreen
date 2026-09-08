/**
 * Recipe amounts on the site are free text: "2", "1/2", "1 1/2", "2-3",
 * "¼", "few strands of". Anything we can turn into a number gets scaled with
 * the servings stepper and summed in the shopping list; anything else is
 * carried through untouched.
 */

const VULGAR: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

export type ParsedAmount =
  | { kind: 'number'; value: number }
  /** A range like "2-3": both ends scale, and we re-render it as a range. */
  | { kind: 'range'; low: number; high: number }
  | { kind: 'text' };

export function parseAmount(raw: string): ParsedAmount {
  const s = (raw ?? '').trim();
  if (!s) return { kind: 'text' };

  const one = (part: string): number | null => {
    const t = part.trim().replace(/\s+/g, ' ');
    if (!t) return null;
    // "1 1/2" or "1 ½"
    const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
    const mixedV = t.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
    if (mixedV) return Number(mixedV[1]) + VULGAR[mixedV[2]];
    const frac = t.match(/^(\d+)\/(\d+)$/);
    if (frac) return Number(frac[1]) / Number(frac[2]);
    if (VULGAR[t] !== undefined) return VULGAR[t];
    const dec = t.match(/^\d*\.?\d+$/);
    if (dec) return Number(t);
    return null;
  };

  const range = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (range) {
    const low = one(range[1]);
    const high = one(range[2]);
    if (low !== null && high !== null) return { kind: 'range', low, high };
  }
  const single = one(s);
  if (single !== null) return { kind: 'number', value: single };
  return { kind: 'text' };
}

const NEAREST: Array<[number, string]> = [
  [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'],
  [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞'],
];

/** Render a number the way a cook would write it: 0.5 -> ½, 1.5 -> 1 ½. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = Math.round(n * 1000) / 1000;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  if (frac < 0.02) return String(whole);
  for (const [value, glyph] of NEAREST) {
    if (Math.abs(frac - value) < 0.03) return whole ? `${whole} ${glyph}` : glyph;
  }
  const dp = rounded < 10 ? 2 : 1;
  return String(Number(rounded.toFixed(dp)));
}

/** Scale a raw amount string by a factor, preserving ranges and free text. */
export function scaleAmount(raw: string, factor: number): string {
  const parsed = parseAmount(raw);
  if (parsed.kind === 'number') return formatNumber(parsed.value * factor);
  if (parsed.kind === 'range') {
    return `${formatNumber(parsed.low * factor)}–${formatNumber(parsed.high * factor)}`;
  }
  return raw ?? '';
}

/** Units that mean the same thing, so "tbsp" and "tablespoons" can sum. */
const UNIT_ALIASES: Record<string, string> = {
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', tbsp: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
  cup: 'cup', cups: 'cup',
  gram: 'g', grams: 'g', g: 'g', gm: 'g', gms: 'g',
  kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
  milliliter: 'ml', milliliters: 'ml', ml: 'ml',
  liter: 'l', liters: 'l', litre: 'l', l: 'l',
  clove: 'clove', cloves: 'clove',
  inch: 'inch', inches: 'inch',
  pinch: 'pinch', pinches: 'pinch',
  handful: 'handful', handfuls: 'handful',
  can: 'can', cans: 'can',
  slice: 'slice', slices: 'slice',
  sprig: 'sprig', sprigs: 'sprig',
  stick: 'stick', sticks: 'stick',
  bunch: 'bunch', bunches: 'bunch',
};

export const canonicalUnit = (unit: string): string => {
  const u = (unit ?? '').trim().toLowerCase().replace(/\./g, '');
  return UNIT_ALIASES[u] ?? u;
};

/** Loose key for merging "Onions" with "onion" across recipes. */
export function ingredientKey(name: string): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\b(fresh|freshly|chopped|diced|minced|sliced|grated|crushed|ground|large|small|medium|whole|raw|optional|to taste|finely|roughly)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?:es|s)$/, '');
}
