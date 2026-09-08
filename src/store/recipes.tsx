import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAllRecipes, isStale, readCache, writeCache } from '../api/client';
import type { Recipe } from '../api/types';

type State = {
  recipes: Recipe[];
  byId: Map<number, Recipe>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** True when we're showing cached data because the network failed. */
  offline: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const pull = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const fresh = await fetchAllRecipes();
      if (!mounted.current) return;
      setRecipes(fresh);
      setError(null);
      setOffline(false);
      void writeCache(fresh);
    } catch (e: any) {
      if (!mounted.current) return;
      // Only surface an error if we have nothing at all to show.
      setRecipes((prev) => {
        if (!prev.length) setError(e?.message ?? 'Could not reach chopthegreens.com');
        else setOffline(true);
        return prev;
      });
    } finally {
      if (mounted.current) { setRefreshing(false); setLoading(false); }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readCache();
      if (cancelled) return;
      if (cached) {
        // Paint instantly from cache, then revalidate only if it's gone stale.
        setRecipes(cached.recipes);
        setLoading(false);
        if (isStale(cached.at)) void pull(false);
      } else {
        void pull(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pull]);

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const value = useMemo<State>(
    () => ({ recipes, byId, loading, refreshing, error, offline, refresh: () => pull(true) }),
    [recipes, byId, loading, refreshing, error, offline, pull],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecipes(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRecipes must be used inside <RecipesProvider>');
  return v;
}

export function useRecipe(id: number | string | undefined): Recipe | undefined {
  const { byId } = useRecipes();
  return id === undefined ? undefined : byId.get(Number(id));
}
