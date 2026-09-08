import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeRecipe } from './normalize';
import type { Recipe } from './types';

const SITE = 'https://chopthegreens.com';
const ENDPOINT = `${SITE}/wp-json/wp/v2/wprm_recipe`;
const PER_PAGE = 100;
const CACHE_KEY = 'ctg.recipes.v1';
const CACHE_AT = 'ctg.recipes.at.v1';
/** Refresh in the background once the cache is older than this. */
const STALE_MS = 1000 * 60 * 60 * 12;

export type LoadResult = { recipes: Recipe[]; fromCache: boolean; stale: boolean };

async function fetchPage(page: number, signal?: AbortSignal): Promise<{ posts: any[]; totalPages: number }> {
  const res = await fetch(`${ENDPOINT}?per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Recipe feed returned ${res.status}`);
  const totalPages = Number(res.headers.get('x-wp-totalpages') ?? '1') || 1;
  return { posts: await res.json(), totalPages };
}

/** Pull every recipe. Page 1 tells us how many more to request, then fan out. */
export async function fetchAllRecipes(signal?: AbortSignal): Promise<Recipe[]> {
  const first = await fetchPage(1, signal);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => fetchPage(i + 2, signal)),
  );
  const posts = [first, ...rest].flatMap((p) => p.posts);

  const seen = new Set<number>();
  const recipes: Recipe[] = [];
  for (const post of posts) {
    const r = normalizeRecipe(post);
    // Skip drafts and the two stub records with no ingredient list -- they
    // would render as an empty recipe card.
    if (!r || seen.has(r.id) || !r.ingredients.length || !r.steps.length) continue;
    seen.add(r.id);
    recipes.push(r);
  }
  return recipes;
}

export async function readCache(): Promise<{ recipes: Recipe[]; at: number } | null> {
  try {
    const [raw, at] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY),
      AsyncStorage.getItem(CACHE_AT),
    ]);
    if (!raw) return null;
    const recipes = JSON.parse(raw) as Recipe[];
    if (!Array.isArray(recipes) || !recipes.length) return null;
    return { recipes, at: Number(at ?? 0) };
  } catch {
    return null;
  }
}

export async function writeCache(recipes: Recipe[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEY, JSON.stringify(recipes)],
      [CACHE_AT, String(Date.now())],
    ]);
  } catch {
    // A full disk shouldn't take the app down; we just lose offline support.
  }
}

export const isStale = (at: number) => Date.now() - at > STALE_MS;
export { SITE };
