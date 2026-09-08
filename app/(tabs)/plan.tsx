import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe } from '../../src/api/types';
import { SyncNudge } from '../../src/components/SyncNudge';
import { Button, Empty, Tap, Txt } from '../../src/components/ui';
import { filterRecipes } from '../../src/lib/collections';
import { DAY_SHORT, addDays, formatMinutes, isoDate, pluralize } from '../../src/lib/format';
import { useTabBarHeight } from '../../src/lib/layout';
import { useRecipes } from '../../src/store/recipes';
import { useUser } from '../../src/store/user';
import { radius, useColors, useStyles, type Colors } from '../../src/theme';

/** Sheet for choosing a recipe to drop on a day. */
function PickerSheet({ visible, onClose, onPick, date }:
  { visible: boolean; onClose: () => void; onPick: (r: Recipe) => void; date: string }) {
  const c = useColors();
  const s = useStyles(styles);
  const { recipes } = useRecipes();
  const { saved } = useUser();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.trim()) return filterRecipes(recipes, { query }).slice(0, 40);
    // With no query, lead with saved recipes — that's what people plan from.
    const savedSet = new Set(saved);
    const first = recipes.filter((r) => savedSet.has(r.id));
    const rest = recipes.filter((r) => !savedSet.has(r.id));
    return [...first, ...rest].slice(0, 40);
  }, [recipes, saved, query]);

  const label = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }, [date]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetBackdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.grabber} />
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Txt variant="h2">Add to {label}</Txt>
            </View>
            <Tap onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <Ionicons name="close" size={19} color={c.text} />
            </Tap>
          </View>

          <View style={s.searchWrap}>
            <Ionicons name="search" size={17} color={c.textMute} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search recipes…"
              placeholderTextColor={c.textMute} style={s.input} autoCorrect={false} />
          </View>

          <FlatList
            data={results}
            keyExtractor={(r) => String(r.id)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 10 }}
            renderItem={({ item }) => (
              <Tap onPress={() => onPick(item)} haptic="light" style={s.pickRow}>
                <Image source={item.imageUrl} style={s.pickImage} contentFit="cover" transition={160} />
                <View style={{ flex: 1 }}>
                  <Txt variant="h3" numberOfLines={2}>{item.displayName}</Txt>
                  <Txt variant="small" color={c.textMute} style={{ marginTop: 3 }}>
                    {formatMinutes(item.total)}
                  </Txt>
                </View>
                <Ionicons name="add-circle" size={22} color={c.lime} />
              </Tap>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function Planner() {
  const c = useColors();
  const s = useStyles(styles);
  const { byId, recipes } = useRecipes();
  const { plan, addToPlan, removeFromPlan, clearPlan, addRecipeToList } = useUser();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarHeight();
  const router = useRouter();
  const [picking, setPicking] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // A rolling 7 days from today, not a calendar week — you cook from today.
  const days = useMemo(() => {
    const start = addDays(new Date(), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekOffset]);

  const planned = useMemo(
    () => days.flatMap((d) => (plan[isoDate(d)] ?? []).map((id) => byId.get(id)).filter(Boolean) as Recipe[]),
    [days, plan, byId],
  );

  const addWeekToList = () => {
    if (!planned.length) return;
    for (const r of planned) addRecipeToList(r);
    Alert.alert('Added to list', `${pluralize(planned.length, 'recipe')} added to your shopping list.`);
    router.push('/list');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="h1">Meal plan</Txt>
          <Txt variant="small" color={c.textMute} style={{ marginTop: 4 }}>
            {planned.length ? `${pluralize(planned.length, 'meal')} planned` : 'Next 7 days'}
          </Txt>
        </View>
        <View style={s.weekNav}>
          <Tap hitSlop={8} onPress={() => setWeekOffset((w) => w - 1)} haptic="light" style={s.iconBtn}>
            <Ionicons name="chevron-back" size={17} color={c.text} />
          </Tap>
          <Tap hitSlop={8} onPress={() => setWeekOffset((w) => w + 1)} haptic="light" style={s.iconBtn}>
            <Ionicons name="chevron-forward" size={17} color={c.text} />
          </Tap>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBar + (planned.length ? 110 : 32) }}>
        <SyncNudge context="plan" when={planned.length > 0} />
        {days.map((d) => {
          const key = isoDate(d);
          const items = (plan[key] ?? []).map((id) => byId.get(id)).filter(Boolean) as Recipe[];
          const isToday = key === isoDate(new Date());
          return (
            <View key={key} style={s.day}>
              <View style={s.dayHead}>
                <View style={[s.dayBadge, isToday && { backgroundColor: c.lime }]}>
                  <Txt variant="label" color={isToday ? c.onLime : c.textMute}>
                    {DAY_SHORT[d.getDay()]}
                  </Txt>
                  <Txt variant="h3" color={isToday ? c.onLime : c.text}>{d.getDate()}</Txt>
                </View>
                <Tap onPress={() => setPicking(key)} haptic="light" style={s.addBtn}>
                  <Ionicons name="add" size={16} color={c.lime} />
                  <Txt variant="small" color={c.lime}>Add</Txt>
                </Tap>
              </View>

              {items.length ? (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {items.map((r) => (
                    <Tap key={r.id} onPress={() => router.push(`/recipe/${r.id}`)} haptic="light" style={s.planRow}>
                      <Image source={r.imageUrl} style={s.planImage} contentFit="cover" transition={160} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyMed" numberOfLines={2}>{r.displayName}</Txt>
                        <Txt variant="small" color={c.textMute} style={{ marginTop: 2 }}>
                          {formatMinutes(r.total)}
                        </Txt>
                      </View>
                      <Tap hitSlop={10} haptic="light" onPress={() => removeFromPlan(key, r.id)}>
                        <Ionicons name="close" size={17} color={c.textMute} />
                      </Tap>
                    </Tap>
                  ))}
                </View>
              ) : (
                <Tap onPress={() => setPicking(key)} style={s.emptyDay}>
                  <Txt variant="small" color={c.textMute}>Nothing planned</Txt>
                </Tap>
              )}
            </View>
          );
        })}

        {planned.length ? (
          <Tap haptic="light" style={s.clear}
            onPress={() => Alert.alert('Clear plan', 'Remove every planned meal?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearPlan },
            ])}>
            <Txt variant="small" color={c.textMute}>Clear plan</Txt>
          </Tap>
        ) : null}
      </ScrollView>

      {planned.length ? (
        <View style={[s.cta, { paddingBottom: tabBar + 14 }]}>
          <Button label="Add week to shopping list" icon="cart-outline" onPress={addWeekToList} />
        </View>
      ) : null}

      <PickerSheet
        visible={picking !== null}
        date={picking ?? isoDate(new Date())}
        onClose={() => setPicking(null)}
        onPick={(r) => { if (picking) addToPlan(picking, r.id); setPicking(null); }}
      />
    </View>
  );
}

const styles = (c: Colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  weekNav: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairline,
  },
  day: { paddingHorizontal: 20, marginBottom: 22 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill, backgroundColor: c.surfaceAlt,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10,
    borderRadius: radius.md, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.hairline,
  },
  planImage: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.surfaceAlt },
  emptyDay: {
    marginTop: 10, paddingVertical: 18, alignItems: 'center', borderRadius: radius.md,
    borderWidth: 1, borderColor: c.hairline, borderStyle: 'dashed',
  },
  clear: { alignSelf: 'center', marginTop: 8, padding: 12 },
  cta: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: c.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline,
  },
  sheetBackdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  sheet: {
    height: '82%', backgroundColor: c.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: 20, borderTopWidth: 1, borderColor: c.hairlineStrong,
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong,
    alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 46,
    borderRadius: radius.pill, backgroundColor: c.bg, borderWidth: 1, borderColor: c.hairline,
  },
  input: { flex: 1, color: c.text, fontFamily: 'Jakarta_400Regular', fontSize: 15, height: '100%' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  pickImage: { width: 52, height: 52, borderRadius: 12, backgroundColor: c.surfaceAlt },
});
