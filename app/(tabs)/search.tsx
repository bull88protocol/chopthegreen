import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecipeGridCard } from '../../src/components/RecipeCard';
import { Chip, Empty, Loading, Tap, Txt } from '../../src/components/ui';
import { FACETS, SORTS, filterRecipes, type Sort } from '../../src/lib/collections';
import { pluralize } from '../../src/lib/format';
import { useTabBarPadding } from '../../src/lib/layout';
import { useRecipes } from '../../src/store/recipes';
import { radius, useColors, useStyles, type Colors } from '../../src/theme';

export default function Search() {
  const { recipes, loading } = useRecipes();
  const insets = useSafeAreaInsets();
  const bottomPad = useTabBarPadding();
  const c = useColors();
  const s = useStyles(styles);
  const params = useLocalSearchParams<{ facet?: string }>();

  const [query, setQuery] = useState('');
  const [facets, setFacets] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('relevance');
  const [showSort, setShowSort] = useState(false);

  // Deep link from Discover's category chips.
  useEffect(() => {
    if (params.facet) setFacets([params.facet]);
  }, [params.facet]);

  const results = useMemo(
    () => filterRecipes(recipes, { query, facets, sort }),
    [recipes, query, facets, sort],
  );

  const toggle = (id: string) =>
    setFacets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (loading && !recipes.length) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={c.textMute} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Paneer, dal, 20 minute dinner…"
          placeholderTextColor={c.textMute}
          style={s.input}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query ? (
          <Tap onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={17} color={c.textMute} />
          </Tap>
        ) : null}
      </View>

      {/*
        flexGrow/flexShrink 0 rather than a fixed maxHeight: this row sits in a
        flex column, so without it the ScrollView expands and pushes the results
        off screen. A hard maxHeight did stop that, but it also clipped the
        chips whenever they rendered taller than the guess — which is exactly
        what happens at larger system font sizes. Sizing to content can't clip.
      */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0, marginTop: 12 }}
        contentContainerStyle={s.chips}>
        {facets.length ? (
          <Chip label="Clear" icon="close" onPress={() => setFacets([])} />
        ) : null}
        {FACETS.map((f) => (
          <Chip key={f.id} label={f.label} icon={f.icon}
            active={facets.includes(f.id)} onPress={() => toggle(f.id)} />
        ))}
      </ScrollView>

      <View style={s.countRow}>
        <Txt variant="smallMed" color={c.textSoft}>
          {pluralize(results.length, 'recipe')}
        </Txt>
        <Tap onPress={() => setShowSort((v) => !v)} haptic="select" style={s.sortBtn}>
          <Ionicons name="swap-vertical" size={14} color={c.lime} />
          <Txt variant="small" color={c.lime}>
            {SORTS.find((x) => x.id === sort)!.label}
          </Txt>
        </Tap>
      </View>

      {showSort ? (
        <View style={s.sortPanel}>
          {SORTS.map((o) => (
            <Tap key={o.id} haptic="select"
              onPress={() => { setSort(o.id); setShowSort(false); }} style={s.sortItem}>
              <Txt variant="bodyMed" color={sort === o.id ? c.lime : c.text}>{o.label}</Txt>
              {sort === o.id ? <Ionicons name="checkmark" size={16} color={c.lime} /> : null}
            </Tap>
          ))}
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(r) => String(r.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 22, paddingTop: 14, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <RecipeGridCard recipe={item} />}
        ListEmptyComponent={
          <Empty
            icon="search-outline"
            title="Nothing matches"
            body={query ? `No recipe mentions “${query}”. Try a single ingredient, or drop a filter.` : 'Try loosening your filters.'}
          />
        }
      />
    </View>
  );
}

const styles = (c: Colors) => ({
  searchWrap: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginHorizontal: 20,
    paddingHorizontal: 16, height: 50, borderRadius: radius.pill,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline,
  },
  input: { flex: 1, color: c.text, fontFamily: 'Jakarta_400Regular', fontSize: 15, height: '100%' as const },
  chips: { paddingHorizontal: 20, gap: 8, alignItems: 'center' as const },
  countRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    paddingHorizontal: 20, marginTop: 14,
  },
  sortBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
  sortPanel: {
    marginHorizontal: 20, marginTop: 10, borderRadius: radius.md, overflow: 'hidden' as const,
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairline,
  },
  sortItem: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    paddingHorizontal: 16, paddingVertical: 13,
  },
});
