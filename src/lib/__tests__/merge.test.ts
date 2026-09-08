import { mergeSaved, mergeList, mergePlan, reconcile, type SyncState }
  from '../merge.ts';

import { test } from 'node:test';
import assert from 'node:assert/strict';

const eq = (name: string, got: unknown, want: unknown) =>
  test(name, () => assert.deepEqual(got, want));

// --- saved ---
eq('saved: union keeps local order', mergeSaved([3, 1], [1, 9]), [3, 1, 9]);
eq('saved: empty local adopts remote', mergeSaved([], [5, 6]), [5, 6]);
eq('saved: no duplicates', mergeSaved([1, 2], [2, 1]), [1, 2]);

// --- list ---
const item = (key: string, checked = false, parts: any[] = []) =>
  ({ key, label: key, aisle: 'Produce', checked, parts } as any);
const part = (recipeId: number, amount = '1', unit = 'cup') =>
  ({ recipeId, recipeName: 'R' + recipeId, amount, unit });

eq('list: disjoint keys both survive',
  mergeList([item('onion')], [item('garlic')]).map((i: any) => i.key), ['onion', 'garlic']);
eq('list: ticked on either side stays ticked',
  mergeList([item('onion', false)], [item('onion', true)])[0].checked, true);
eq('list: parts union, no dupes',
  mergeList([item('onion', false, [part(1)])], [item('onion', false, [part(1), part(2)])])[0].parts.length, 2);

// --- plan ---
eq('plan: per-day union',
  mergePlan({ '2026-09-06': [1] }, { '2026-09-06': [1, 2], '2026-09-07': [3] }),
  { '2026-09-06': [1, 2], '2026-09-07': [3] });

// --- reconcile ---
const S = (saved: number[], updatedAt: number): SyncState => ({ saved, list: [], plan: {}, updatedAt });
eq('reconcile: no remote -> local', reconcile(S([1], 5), null, false).saved, [1]);
eq('reconcile: first link unions', reconcile(S([1], 5), S([2], 1), true).saved, [1, 2]);
eq('reconcile: newer remote wins', reconcile(S([1], 5), S([2], 9), false).saved, [2]);
eq('reconcile: newer local wins', reconcile(S([1], 9), S([2], 5), false).saved, [1]);

// The behaviour that motivates LWW: a deletion must stick.
const afterDelete = S([], 10);          // user cleared saves on this device
const stale = S([1, 2], 3);             // other device still has them
eq('reconcile: deletion is not resurrected', reconcile(afterDelete, stale, false).saved, []);
