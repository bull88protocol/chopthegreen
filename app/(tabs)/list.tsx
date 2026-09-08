import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SyncNudge } from '../../src/components/SyncNudge';
import { Button, Empty, Tap, Txt } from '../../src/components/ui';
import { aisleRank } from '../../src/lib/aisles';
import { pluralize } from '../../src/lib/format';
import { useTabBarHeight } from '../../src/lib/layout';
import { summarizeParts, useUser, type ListItem } from '../../src/store/user';
import { radius, useColors, useStyles, type Colors } from '../../src/theme';

export default function ShoppingList() {
  const c = useColors();
  const s = useStyles(styles);
  const { list, toggleItem, removeItem, clearChecked, clearList } = useUser();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarHeight();
  const router = useRouter();

  // Group by aisle, unchecked first inside each, so the list stays shoppable.
  const sections = useMemo(() => {
    const byAisle = new Map<string, ListItem[]>();
    for (const item of list) {
      const arr = byAisle.get(item.aisle) ?? [];
      arr.push(item);
      byAisle.set(item.aisle, arr);
    }
    return [...byAisle.entries()]
      .sort((a, b) => aisleRank(a[0]) - aisleRank(b[0]))
      .map(([title, data]) => ({
        title,
        data: [...data].sort((a, b) =>
          Number(a.checked) - Number(b.checked) || a.label.localeCompare(b.label)),
      }));
  }, [list]);

  const checked = list.filter((i) => i.checked).length;
  const recipeCount = new Set(list.flatMap((i) => i.parts.map((p) => p.recipeId))).size;

  if (!list.length) {
    return (
      <Empty
        icon="cart-outline"
        title="Your list is empty"
        body="Add a recipe's ingredients from any recipe page, or roll a whole week in from your plan."
        action={<Button label="Find recipes" icon="search" onPress={() => router.push('/search')} />}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="h1">Shopping list</Txt>
          <Txt variant="small" color={c.textMute} style={{ marginTop: 4 }}>
            {pluralize(list.length, 'item')} · {pluralize(recipeCount, 'recipe')} · {checked} done
          </Txt>
        </View>
        <Tap haptic="light" hitSlop={8} style={s.iconBtn}
          onPress={() => Alert.alert('Clear list', 'Remove everything from your shopping list?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear all', style: 'destructive', onPress: clearList },
          ])}>
          <Ionicons name="trash-outline" size={18} color={c.textSoft} />
        </Tap>
      </View>

      <View style={s.track}>
        <View style={[s.fill, { width: `${list.length ? (checked / list.length) * 100 : 0}%` }]} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.key}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBar + 90, paddingTop: 8 }}
        ListHeaderComponent={<SyncNudge context="list" />}
        renderSectionHeader={({ section }) => (
          <Txt variant="label" color={c.limeDim} style={s.aisle}>{section.title}</Txt>
        )}
        renderItem={({ item }) => {
          const amount = summarizeParts(item.parts);
          const from = [...new Set(item.parts.map((p) => p.recipeName))];
          return (
            <Tap onPress={() => toggleItem(item.key)} onLongPress={() => removeItem(item.key)}
              haptic="select" style={s.row}>
              <View style={[s.check, item.checked && { backgroundColor: c.lime, borderColor: c.lime }]}>
                {item.checked ? <Ionicons name="checkmark" size={13} color={c.onLime} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMed" style={item.checked ? s.struck : undefined}>
                  {item.label}
                  {amount ? <Txt variant="body" color={c.textMute}>  {amount}</Txt> : null}
                </Txt>
                {from.length > 1 ? (
                  <Txt variant="small" color={c.textMute} numberOfLines={1} style={{ marginTop: 2 }}>
                    {from.length} recipes
                  </Txt>
                ) : null}
              </View>
            </Tap>
          );
        }}
      />

      {checked > 0 ? (
        <View style={[s.footer, { paddingBottom: tabBar + 14 }]}>
          <Button label={`Clear ${checked} checked`} icon="checkmark-done" tone="ghost" onPress={clearChecked} />
        </View>
      ) : null}
    </View>
  );
}

const styles = (c: Colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairline,
  },
  track: { height: 3, marginHorizontal: 20, borderRadius: 2, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.lime, borderRadius: 2 },
  aisle: { paddingHorizontal: 20, marginTop: 24, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 11 },
  check: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: c.hairlineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  struck: { textDecorationLine: 'line-through', color: c.textMute },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: c.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline,
  },
});
