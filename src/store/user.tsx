import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Recipe } from '../api/types';
import { aisleFor, isPantryStaple, type Aisle } from '../lib/aisles';
import { canonicalUnit, formatNumber, ingredientKey, parseAmount, scaleAmount } from '../lib/amount';

export type ListPart = {
  recipeId: number;
  recipeName: string;
  amount: string;
  unit: string;
};

export type ListItem = {
  key: string;
  label: string;
  aisle: Aisle;
  checked: boolean;
  parts: ListPart[];
};

/** Meal plan: ISO date (YYYY-MM-DD) -> recipe ids, in the order added. */
export type Plan = Record<string, number[]>;

type State = {
  ready: boolean;
  saved: number[];
  isSaved: (id: number) => boolean;
  toggleSave: (id: number) => void;
  list: ListItem[];
  addRecipeToList: (recipe: Recipe, scale?: number) => number;
  removeRecipeFromList: (recipeId: number) => void;
  recipeInList: (id: number) => boolean;
  toggleItem: (key: string) => void;
  removeItem: (key: string) => void;
  clearChecked: () => void;
  clearList: () => void;
  plan: Plan;
  addToPlan: (date: string, id: number) => void;
  removeFromPlan: (date: string, id: number) => void;
  clearPlan: () => void;
  /** Epoch ms of the last local change; drives sync's last-write-wins. */
  updatedAt: number;
  /** Everything sync cares about, in one object. */
  snapshot: () => { saved: number[]; list: ListItem[]; plan: Plan; updatedAt: number };
  /** Replace local state wholesale with a reconciled payload from sync. */
  applyRemote: (next: { saved: number[]; list: ListItem[]; plan: Plan; updatedAt: number }) => void;
};

const Ctx = createContext<State | null>(null);
const K_SAVED = 'ctg.saved.v1';
const K_LIST = 'ctg.list.v1';
const K_PLAN = 'ctg.plan.v1';
const K_AT = 'ctg.updatedAt.v1';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  const [list, setList] = useState<ListItem[]>([]);
  const [plan, setPlan] = useState<Plan>({});
  const [updatedAt, setUpdatedAt] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const rows = await AsyncStorage.multiGet([K_SAVED, K_LIST, K_PLAN, K_AT]);
        const map = Object.fromEntries(rows);
        if (map[K_SAVED]) setSaved(JSON.parse(map[K_SAVED]!));
        if (map[K_LIST]) setList(JSON.parse(map[K_LIST]!));
        if (map[K_PLAN]) setPlan(JSON.parse(map[K_PLAN]!));
        if (map[K_AT]) setUpdatedAt(Number(map[K_AT]) || 0);
      } catch {
        // Corrupt storage: start clean rather than crash on launch.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Persist after hydration only, so we never write [] over real data.
  useEffect(() => { if (ready) void AsyncStorage.setItem(K_SAVED, JSON.stringify(saved)); }, [saved, ready]);
  useEffect(() => { if (ready) void AsyncStorage.setItem(K_LIST, JSON.stringify(list)); }, [list, ready]);
  useEffect(() => { if (ready) void AsyncStorage.setItem(K_PLAN, JSON.stringify(plan)); }, [plan, ready]);
  useEffect(() => { if (ready) void AsyncStorage.setItem(K_AT, String(updatedAt)); }, [updatedAt, ready]);

  /** Stamp a local edit. Every mutator below calls this. */
  const touch = useCallback(() => setUpdatedAt(Date.now()), []);

  const toggleSave = useCallback((id: number) => {
    touch();
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }, [touch]);

  const addRecipeToList = useCallback((recipe: Recipe, scale = 1) => {
    touch();
    let added = 0;
    setList((prev) => {
      const next = prev.filter((i) => !i.parts.some((p) => p.recipeId === recipe.id));
      const index = new Map(next.map((i) => [i.key, i]));
      for (const ing of recipe.ingredients) {
        if (isPantryStaple(ing.name)) continue;
        const key = ingredientKey(ing.name) || ing.name.toLowerCase();
        const part: ListPart = {
          recipeId: recipe.id,
          recipeName: recipe.displayName,
          amount: scale === 1 ? ing.amount : scaleAmount(ing.amount, scale),
          unit: ing.unit,
        };
        const existing = index.get(key);
        if (existing) {
          existing.parts = [...existing.parts, part];
        } else {
          const item: ListItem = {
            key,
            label: ing.name,
            aisle: aisleFor(ing.name),
            checked: false,
            parts: [part],
          };
          index.set(key, item);
          next.push(item);
        }
        added += 1;
      }
      return [...next];
    });
    return added;
  }, [touch]);

  const removeRecipeFromList = useCallback((recipeId: number) => {
    touch();
    setList((prev) =>
      prev
        .map((i) => ({ ...i, parts: i.parts.filter((p) => p.recipeId !== recipeId) }))
        .filter((i) => i.parts.length > 0),
    );
  }, [touch]);

  const recipeInList = useCallback(
    (id: number) => list.some((i) => i.parts.some((p) => p.recipeId === id)),
    [list],
  );

  const toggleItem = useCallback((key: string) => {
    touch();
    setList((prev) => prev.map((i) => (i.key === key ? { ...i, checked: !i.checked } : i)));
  }, [touch]);
  const removeItem = useCallback((key: string) => {
    touch();
    setList((prev) => prev.filter((i) => i.key !== key));
  }, [touch]);
  const clearChecked = useCallback(() => { touch(); setList((prev) => prev.filter((i) => !i.checked)); }, [touch]);
  const clearList = useCallback(() => { touch(); setList([]); }, [touch]);

  const addToPlan = useCallback((date: string, id: number) => {
    touch();
    setPlan((prev) => {
      const day = prev[date] ?? [];
      if (day.includes(id)) return prev;
      return { ...prev, [date]: [...day, id] };
    });
  }, [touch]);
  const removeFromPlan = useCallback((date: string, id: number) => {
    touch();
    setPlan((prev) => {
      const day = (prev[date] ?? []).filter((x) => x !== id);
      const next = { ...prev };
      if (day.length) next[date] = day;
      else delete next[date];
      return next;
    });
  }, [touch]);
  const clearPlan = useCallback(() => { touch(); setPlan({}); }, [touch]);

  const isSaved = useCallback((id: number) => saved.includes(id), [saved]);

  const snapshot = useCallback(
    () => ({ saved, list, plan, updatedAt }), [saved, list, plan, updatedAt]);

  const applyRemote = useCallback(
    (next: { saved: number[]; list: ListItem[]; plan: Plan; updatedAt: number }) => {
      setSaved(next.saved);
      setList(next.list);
      setPlan(next.plan);
      setUpdatedAt(next.updatedAt);
    }, []);

  const value = useMemo<State>(() => ({
    ready, saved, isSaved, toggleSave,
    list, addRecipeToList, removeRecipeFromList, recipeInList, toggleItem, removeItem, clearChecked, clearList,
    plan, addToPlan, removeFromPlan, clearPlan,
    updatedAt, snapshot, applyRemote,
  }), [ready, saved, isSaved, toggleSave, list, addRecipeToList, removeRecipeFromList,
       recipeInList, toggleItem, removeItem, clearChecked, clearList, plan, addToPlan, removeFromPlan, clearPlan, updatedAt, snapshot, applyRemote]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUser must be used inside <UserProvider>');
  return v;
}

/**
 * Sum a list item's contributions into readable totals, one per unit family,
 * e.g. "3 tbsp + 1 cup". Ranges shop for the top end, and amounts that aren't
 * numbers at all ("a few strands") are listed verbatim.
 */
export function summarizeParts(parts: ListPart[]): string {
  const byUnit = new Map<string, { total: number; unit: string; extras: string[] }>();
  for (const p of parts) {
    const unit = canonicalUnit(p.unit);
    const slot = byUnit.get(unit) ?? { total: 0, unit: p.unit || unit, extras: [] };
    const parsed = parseAmount(p.amount);
    if (parsed.kind === 'number') slot.total += parsed.value;
    else if (parsed.kind === 'range') slot.total += parsed.high;
    else if (p.amount.trim()) slot.extras.push(p.amount.trim());
    byUnit.set(unit, slot);
  }
  const chunks: string[] = [];
  for (const slot of byUnit.values()) {
    const suffix = slot.unit ? ` ${slot.unit}` : '';
    if (slot.total > 0) chunks.push(`${formatNumber(slot.total)}${suffix}`);
    for (const extra of slot.extras) chunks.push(`${extra}${suffix}`);
  }
  return chunks.join(' + ');
}
