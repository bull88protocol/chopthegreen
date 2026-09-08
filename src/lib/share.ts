import { Share } from 'react-native';
import type { Recipe } from '../api/types';
import { SITE } from './social';

/**
 * Share sheet for a recipe. Always points at the blog post rather than the
 * app, so a shared link works for anyone and the traffic lands on the site.
 * Falls back to the site root for the handful of recipes with no parent post.
 */
export async function shareRecipe(recipe: Recipe): Promise<void> {
  const url = recipe.link || SITE;
  try {
    await Share.share({
      // Android puts everything in `message`; iOS shows `url` as a rich preview.
      message: `${recipe.displayName} — ${url}`,
      url,
      title: recipe.displayName,
    });
  } catch {
    // User dismissed the sheet, or no share target exists. Nothing to do.
  }
}
