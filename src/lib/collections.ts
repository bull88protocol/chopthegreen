import { Ionicons } from '@expo/vector-icons';
import type { Recipe } from '../api/types';

export type Facet = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  test: (r: Recipe) => boolean;
};

const hasCourse = (r: Recipe, name: string) => r.courses.includes(name);
const hasEquip = (r: Recipe, name: string) => r.equipment.includes(name);

/**
 * Browsable facets. Equipment and nutrition are used in preference to the
 * hand-typed keyword taxonomy, which is far too noisy to filter on.
 */
export const FACETS: Facet[] = [
  { id: 'quick', label: 'Under 30 min', icon: 'flash-outline', test: (r) => r.total > 0 && r.total <= 30 },
  { id: 'instant-pot', label: 'Instant Pot', icon: 'timer-outline', test: (r) => hasEquip(r, 'Instant Pot') },
  { id: 'air-fryer', label: 'Air Fryer', icon: 'cloud-outline', test: (r) => hasEquip(r, 'Air Fryer') },
  { id: 'high-protein', label: 'High protein', icon: 'barbell-outline', test: (r) => r.highProtein },
  { id: 'vegan', label: 'Vegan', icon: 'leaf-outline', test: (r) => r.diets.includes('Vegan') },
  { id: 'gluten-free', label: 'Gluten free', icon: 'ellipse-outline', test: (r) => r.diets.includes('Gluten Free') },
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', test: (r) => hasCourse(r, 'Breakfast') },
  { id: 'main', label: 'Mains', icon: 'restaurant-outline', test: (r) => hasCourse(r, 'Main Course') },
  { id: 'snack', label: 'Snacks', icon: 'fast-food-outline', test: (r) => hasCourse(r, 'Snack') },
  { id: 'soup', label: 'Soups', icon: 'cafe-outline', test: (r) => hasCourse(r, 'Soup') },
  { id: 'salad', label: 'Salads', icon: 'nutrition-outline', test: (r) => hasCourse(r, 'Salad') },
  { id: 'dessert', label: 'Desserts', icon: 'ice-cream-outline', test: (r) => hasCourse(r, 'Dessert') },
  { id: 'drinks', label: 'Drinks', icon: 'wine-outline', test: (r) => hasCourse(r, 'Drinks') },
  { id: 'indian', label: 'Indian', icon: 'flame-outline', test: (r) => r.cuisines.includes('Indian') },
];

export const facetById = (id: string) => FACETS.find((f) => f.id === id);

export type Sort = 'relevance' | 'newest' | 'quickest' | 'top-rated';

export const SORTS: Array<{ id: Sort; label: string }> = [
  { id: 'relevance', label: 'Best match' },
  { id: 'newest', label: 'Newest' },
  { id: 'quickest', label: 'Quickest' },
  { id: 'top-rated', label: 'Top rated' },
];

/** Rank a recipe against a query: title hits beat ingredient hits. */
function score(r: Recipe, terms: string[]): number {
  let total = 0;
  const name = r.name.toLowerCase();
  for (const t of terms) {
    if (!r.search.includes(t)) return -1; // every term must appear somewhere
    if (name === t) total += 100;
    else if (name.startsWith(t)) total += 60;
    else if (name.includes(t)) total += 40;
    else if (r.ingredients.some((i) => i.name.toLowerCase().includes(t))) total += 12;
    else total += 4;
  }
  // Nudge well-reviewed recipes up when scores tie.
  return total + Math.min(r.rating.avg * (r.rating.count ? 1 : 0), 5);
}

export function filterRecipes(
  recipes: Recipe[],
  { query = '', facets = [], sort = 'relevance' }:
  { query?: string; facets?: string[]; sort?: Sort },
): Recipe[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const tests = facets.map(facetById).filter(Boolean) as Facet[];

  let out = recipes.filter((r) => tests.every((f) => f.test(r)));

  if (terms.length) {
    out = out
      .map((r) => ({ r, s: score(r, terms) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.r);
    if (sort === 'relevance') return out;
  }

  const sorted = [...out];
  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
      break;
    case 'quickest':
      sorted.sort((a, b) => (a.total || 1e6) - (b.total || 1e6));
      break;
    case 'top-rated':
      sorted.sort((a, b) => b.rating.avg - a.rating.avg || b.rating.count - a.rating.count);
      break;
    default:
      if (!terms.length) sorted.sort((a, b) => (b.date > a.date ? 1 : -1));
  }
  return sorted;
}

/** Deterministic "pick of the day" so the hero is stable within a day. */
export function pickOfTheDay(recipes: Recipe[]): Recipe | undefined {
  const pool = recipes.filter((r) => r.imageUrl && r.rating.avg >= 4.5);
  const source = pool.length ? pool : recipes.filter((r) => r.imageUrl);
  if (!source.length) return undefined;
  const day = Math.floor(Date.now() / 86400000);
  return source[day % source.length];
}
