/** "1 h 25 m" reads better than "85 min" on a card. */
export function formatMinutes(min: number): string {
  if (!min || min <= 0) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
}

export const pluralize = (
  n: number,
  one: string,
  // Serving units from the blog are frequently already plural ("rotis",
  // "slices"), which naive suffixing turns into "rotiss".
  many = /(s|sh|ch|x|z)$/i.test(one) ? one : `${one}s`,
) => `${n} ${n === 1 ? one : many}`;

/** Local ISO date (YYYY-MM-DD) — toISOString() would shift across timezones. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Late night cooking';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Pull a cook duration out of step text so Cook Mode can offer a timer:
 * "saute for 5-7 minutes" -> 7 min (the safe end), "cook 1 hour" -> 60.
 */
export function detectTimer(text: string): number | null {
  const re = /(\d+(?:\s*[-–—]\s*\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
  let best: number | null = null;
  for (const m of text.matchAll(re)) {
    const nums = m[1].split(/[-–—]/).map((s) => Number(s.trim())).filter(Number.isFinite);
    if (!nums.length) continue;
    const value = Math.max(...nums);
    const unit = m[2].toLowerCase();
    const minutes = unit.startsWith('h') ? value * 60 : unit.startsWith('s') ? value / 60 : value;
    if (minutes <= 0 || minutes > 24 * 60) continue;
    // Prefer the longest duration mentioned in the step.
    if (best === null || minutes > best) best = minutes;
  }
  return best;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
