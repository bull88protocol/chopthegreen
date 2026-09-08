import type { Ingredient, Nutrition, Recipe, Step } from './types';

/** WP delivers rendered HTML in summaries, notes and step text. */
export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    // WP Recipe Maker embeds ingredient references inside step text as
    // [wprm-ingredient text="2 tbsp Olive Oil" uid="16"]. A handful of them
    // have a stray <wprm-ingredient> tag *inside* the text attribute, whose
    // quotes would break attribute matching -- drop those tags first so the
    // attribute is quote-free and a non-greedy match stays inside one
    // shortcode (steps often contain several).
    .replace(/<wprm-[^>]*>/gi, '')
    .replace(/\[wprm-ingredient\s+text="([^"]*)"\s+uid="\d+"\s*\]/gi, (_m, label: string) =>
      // A few labels carry an *escaped* stray tag inside the attribute
      // (&lt;wprm-ingredient ...&gt;) which would otherwise come back to life
      // when entities are decoded further down. Kill it here, in both forms.
      label.replace(/&lt;.*?&gt;/gi, '').replace(/<[^>]*>/g, '').trim())
    .replace(/\[wprm-[a-z-]*[^\]]*\]/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\u2022 ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&rsquo;/g, '\u2019')
    .replace(/&#8216;|&lsquo;/g, '\u2018')
    .replace(/&#8220;|&ldquo;/g, '\u201c')
    .replace(/&#8221;|&rdquo;/g, '\u201d')
    .replace(/&#8211;|&ndash;/g, '\u2013')
    .replace(/&#8212;|&mdash;/g, '\u2014')
    .replace(/&frac12;/g, '\u00bd')
    .replace(/&frac14;/g, '\u00bc')
    .replace(/&frac34;/g, '\u00be')
    .replace(/&deg;/g, '\u00b0')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Generic numeric + hex entities (&#039; &#39; &#x27; all appear here).
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // &amp; last so "&amp;lt;" cannot resurrect into a tag.
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/**
 * The site's taxonomy terms are hand-typed and inconsistent: trailing commas
 * ("Brunch,"), several terms crammed into one ("lunch, dinner,"), casing drift
 * ("vegan"/"Vegan") and outright typos ("Desset", "veagan"). Everything below
 * exists to turn that into a set of facets a user can actually browse.
 */
const TERM_FIXES: Record<string, string> = {
  desset: 'Dessert',
  veagan: 'Vegan',
  snacks: 'Snack',
  entree: 'Main Course',
  'drinks/ beverages': 'Drinks',
  beverages: 'Drinks',
  'instant pot recipes': 'Instant Pot',
  'instant pot recipe': 'Instant Pot',
  instantpot: 'Instant Pot',
  'mediterrean': 'Mediterranean',
  'korean-inspired': 'Korean',
  'chinese noodles': 'Chinese',
  tacos: 'Mexican',
  'rice recipes': 'Rice',
  'rice recipe': 'Rice',
  'soup recipes': 'Soup',
  'easy recipe': 'Easy',
  'summer recipe': 'Summer',
  'breakfast recipe': 'Breakfast',
  'instant pot2': 'Instant Pot',
};

/** Terms too vague to be worth showing as a browsable facet. */
const TERM_DROP = new Set([
  'global', 'healthy', 'international', 'fusion', 'holiday', 'foodie’s fun',
  "foodie's fun", 'vegetarian', 'recipe', 'recipes', 'food', 'easy',
]);

const titleCase = (s: string) =>
  // Capitalise across hyphens too, so "egg-free" becomes "Egg-Free".
  s.replace(/[^\s-]+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

/** Split a raw term on commas/slashes, repair each piece, drop the junk. */
export function normalizeTerms(raw: unknown[], opts: { drop?: boolean } = {}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of raw ?? []) {
    const name = typeof t === 'string' ? t : ((t as any)?.name ?? '');
    for (const piece of String(name).split(/[,/]/)) {
      const trimmed = piece.trim().replace(/[,.\s]+$/, '');
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (opts.drop !== false && TERM_DROP.has(key)) continue;
      const fixed = TERM_FIXES[key] ?? titleCase(trimmed);
      const dedupe = fixed.toLowerCase();
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push(fixed);
    }
  }
  return out;
}

/**
 * Blog titles carry SEO tails that read badly on a card:
 * "Instant Pot Dal Makhani (Creamy Restaurant-Style)" or
 * "Restaurant Style Shahi Paneer Recipe". Trim them for display only --
 * the full name still feeds search.
 */
export function toDisplayName(name: string): string {
  let out = name.trim();
  // Drop a trailing parenthetical or bracketed aside.
  out = out.replace(/\s*[([][^)\]]*[)\]]\s*$/, '').trim();
  // Drop a trailing " | tail" or " - tail" tagline.
  out = out.replace(/\s*[|–—]\s*[^|–—]+$/, '').trim();
  // Drop a dangling "Recipe" / "Recipes" suffix.
  out = out.replace(/\s+recipes?\s*$/i, '').trim();
  out = out.replace(/[\s,:-]+$/, '').trim();
  // If trimming ate the title, keep the original.
  out = out.length >= 4 ? out : name.trim();
  return deshout(out);
}

/** Words that stay lowercase inside a title. */
const SMALL = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'de']);

/**
 * A chunk of the blog's titles are typed in caps lock. Left alone they shout
 * next to the rest of the feed, so title-case anything that's almost entirely
 * uppercase. Mixed-case titles are never touched.
 */
function deshout(title: string): string {
  const letters = title.replace(/[^A-Za-z]/g, '');
  if (letters.length < 6) return title;
  const upper = title.replace(/[^A-Z]/g, '').length;
  if (upper / letters.length < 0.8) return title;

  return title
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (i > 0 && SMALL.has(word)) return word;
      // Capitalise across hyphens and slashes: "one-pot", "paneer/cheese".
      return word.replace(/[^\s\-/]+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
    })
    .join(' ');
}

/**
 * The feed's `video_id` field is literally "0" on every record — the real
 * reference lives in `video_embed`, in four different shapes across the 97
 * recipes that have one:
 *   <iframe ... src=".../embed/ID?...">   (71)
 *   https://youtu.be/ID?si=...            (17)
 *   https://youtube.com/watch?v=ID        (8)
 *   https://youtube.com/shorts/ID?si=...  (1)
 * A YouTube id is 11 chars of [A-Za-z0-9_-].
 */
const YT_ID = '([A-Za-z0-9_-]{11})';
const YT_PATTERNS = [
  new RegExp(`youtube\\.com/embed/${YT_ID}`, 'i'),
  new RegExp(`youtube\\.com/shorts/${YT_ID}`, 'i'),
  new RegExp(`youtu\\.be/${YT_ID}`, 'i'),
  new RegExp(`youtube\\.com/watch\\?(?:[^"']*&)?v=${YT_ID}`, 'i'),
];

export function parseYouTube(embed?: string | null): { id: string; short: boolean } | null {
  const raw = (embed ?? '').trim();
  if (!raw) return null;
  for (const re of YT_PATTERNS) {
    const m = raw.match(re);
    if (m?.[1]) return { id: m[1], short: /youtube\.com\/shorts\//i.test(raw) };
  }
  return null;
}

function toIngredients(flat: any[]): Ingredient[] {
  const out: Ingredient[] = [];
  let group: string | undefined;
  for (const row of flat ?? []) {
    if (row?.type === 'group') {
      group = stripHtml(row.name) || undefined;
      continue;
    }
    const name = stripHtml(row?.name);
    if (!name) continue;
    out.push({
      uid: Number(row.uid ?? out.length),
      amount: String(row.amount ?? '').trim(),
      unit: stripHtml(row.unit),
      name,
      notes: stripHtml(row.notes),
      group,
    });
  }
  return out;
}

function toSteps(flat: any[]): Step[] {
  const out: Step[] = [];
  let group: string | undefined;
  for (const row of flat ?? []) {
    if (row?.type === 'group') {
      group = stripHtml(row.name) || undefined;
      continue;
    }
    const text = stripHtml(row?.text) || stripHtml(row?.name);
    if (!text) continue;
    out.push({
      uid: Number(row.uid ?? out.length),
      text,
      imageUrl: row?.image_url || undefined,
      group,
      ingredientUids: Array.isArray(row?.ingredients) ? row.ingredients.map(Number) : [],
    });
  }
  return out;
}

function toNutrition(n: any): Nutrition {
  const out: Nutrition = {};
  if (!n || typeof n !== 'object') return out;
  for (const [k, v] of Object.entries(n)) {
    const val = num(v);
    if (val > 0) (out as any)[k] = val;
  }
  return out;
}

/** Map one WP `wprm_recipe` post onto our Recipe shape. */
export function normalizeRecipe(post: any): Recipe | null {
  const r = post?.recipe;
  if (!r?.name) return null;

  const prep = num(r.prep_time);
  const cook = num(r.cook_time);
  const stated = num(r.total_time);
  // 26 of 235 recipes have a total_time that is missing or smaller than
  // prep + cook. Trust the parts over the (clearly mistyped) whole.
  const total = stated >= prep + cook && stated > 0 ? stated : prep + cook;

  const tags = r.tags ?? {};
  const courses = normalizeTerms(tags.course ?? []);
  const cuisines = normalizeTerms(tags.cuisine ?? []);
  const diets = normalizeTerms(tags.suitablefordiet ?? [], { drop: false });
  const keywords = normalizeTerms(tags.keyword ?? []);
  const equipment = normalizeTerms(r.equipment ?? [], { drop: false });

  const ingredients = toIngredients(r.ingredients_flat);
  const steps = toSteps(r.instructions_flat);
  const nutrition = toNutrition(r.nutrition);
  const name = stripHtml(r.name);
  const summary = stripHtml(r.summary);
  const video = parseYouTube(r.video_embed);

  return {
    id: Number(r.id ?? post.id),
    slug: String(r.slug ?? post.slug ?? ''),
    name,
    displayName: toDisplayName(name),
    summary,
    imageUrl: r.image_url || undefined,
    link: post?.link && !String(post.link).includes('/wprm_recipe/') ? String(post.link) : '',
    prep,
    cook,
    total,
    servings: num(r.servings) || 0,
    servingsUnit: stripHtml(r.servings_unit) || 'serving',
    rating: { avg: num(r.rating?.average), count: num(r.rating?.count) },
    courses,
    cuisines,
    diets,
    keywords,
    equipment,
    ingredients,
    steps,
    notes: stripHtml(r.notes),
    nutrition,
    videoId: video?.id,
    videoIsShort: video?.short ?? false,
    date: String(r.date ?? post.date ?? ''),
    highProtein: (nutrition.protein ?? 0) >= 15,
    search: [name, summary, ...courses, ...cuisines, ...diets, ...keywords, ...equipment,
      ...ingredients.map((i) => i.name)].join(' ').toLowerCase(),
  };
}
