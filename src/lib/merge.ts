import type { ListItem, ListPart, Plan } from '../store/user';

export type SyncState = {
  saved: number[];
  list: ListItem[];
  plan: Plan;
  /** Epoch ms of the last local change; drives last-write-wins. */
  updatedAt: number;
};

const partKey = (p: ListPart) => `${p.recipeId}|${p.amount}|${p.unit}`;

/** Saved ids: union, keeping the local order first so nothing jumps around. */
export function mergeSaved(local: number[], remote: number[]): number[] {
  const seen = new Set(local);
  return [...local, ...remote.filter((id) => !seen.has(id))];
}

/**
 * Shopping list: union by ingredient key. An item ticked on either device
 * stays ticked — re-buying something is worse than a stale tick.
 */
export function mergeList(local: ListItem[], remote: ListItem[]): ListItem[] {
  const byKey = new Map<string, ListItem>();
  for (const item of local) byKey.set(item.key, { ...item, parts: [...item.parts] });

  for (const item of remote) {
    const existing = byKey.get(item.key);
    if (!existing) {
      byKey.set(item.key, { ...item, parts: [...item.parts] });
      continue;
    }
    const seen = new Set(existing.parts.map(partKey));
    existing.parts.push(...item.parts.filter((p) => !seen.has(partKey(p))));
    existing.checked = existing.checked || item.checked;
  }
  return [...byKey.values()];
}

/** Meal plan: per-day union of recipe ids. */
export function mergePlan(local: Plan, remote: Plan): Plan {
  const out: Plan = {};
  for (const date of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const ids = local[date] ?? [];
    const seen = new Set(ids);
    out[date] = [...ids, ...(remote[date] ?? []).filter((id) => !seen.has(id))];
  }
  return out;
}

/**
 * Union everything. Used the first time a device signs in, so linking an
 * account can never silently drop what was already on either side.
 */
export function unionStates(local: SyncState, remote: SyncState): SyncState {
  return {
    saved: mergeSaved(local.saved, remote.saved),
    list: mergeList(local.list, remote.list),
    plan: mergePlan(local.plan, remote.plan),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt, Date.now()),
  };
}

/**
 * Routine reconciliation once an account is already linked: newest wins.
 *
 * Union-merging on every load would resurrect deleted rows — clear a ticked
 * item on one phone and the other phone's stale copy would put it straight
 * back. Last-write-wins makes deletions stick, and the union above still
 * protects the one moment where both sides hold unique data.
 */
export function reconcile(local: SyncState, remote: SyncState | null, firstLink: boolean): SyncState {
  if (!remote) return local;
  if (firstLink) return unionStates(local, remote);
  return remote.updatedAt > local.updatedAt ? remote : local;
}
