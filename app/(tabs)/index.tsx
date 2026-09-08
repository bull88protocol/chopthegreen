import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe } from '../../src/api/types';
import { RecipeHero, RecipeTile } from '../../src/components/RecipeCard';
import { AccountButton, AccountSheet } from '../../src/components/AccountSheet';
import { SocialRow } from '../../src/components/SocialRow';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { Chip, Empty, Loading, SectionTitle, Tap, Txt } from '../../src/components/ui';
import { FACETS, pickOfTheDay } from '../../src/lib/collections';
import { greeting } from '../../src/lib/format';
import { useTabBarPadding } from '../../src/lib/layout';
import { useRecipes } from '../../src/store/recipes';
import { radius, useColors, useStyles, type Colors } from '../../src/theme';

/** Horizontal rail of tiles; renders nothing when the collection is empty. */
function Rail({ title, data, onSeeAll }:
  { title: string; data: Recipe[]; onSeeAll?: () => void }) {
  if (!data.length) return null;
  return (
    <View style={{ marginTop: 30 }}>
      <SectionTitle title={title} action={data.length > 6 ? 'See all' : undefined} onAction={onSeeAll} />
      <FlatList
        horizontal
        data={data.slice(0, 12)}
        keyExtractor={(r) => String(r.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        renderItem={({ item }) => <RecipeTile recipe={item} />}
      />
    </View>
  );
}

export default function Discover() {
  const { recipes, loading, refreshing, refresh, error, offline } = useRecipes();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useTabBarPadding();
  const c = useColors();
  const s = useStyles(styles);
  const [accountOpen, setAccountOpen] = useState(false);

  const groups = useMemo(() => {
    const by = (id: string) => {
      const f = FACETS.find((x) => x.id === id)!;
      return recipes.filter(f.test);
    };
    return {
      hero: pickOfTheDay(recipes),
      quick: by('quick'),
      instantPot: by('instant-pot'),
      airFryer: by('air-fryer'),
      protein: by('high-protein'),
      breakfast: by('breakfast'),
      withVideo: recipes.filter((r) => r.videoId),
      newest: [...recipes].sort((a, b) => (b.date > a.date ? 1 : -1)),
    };
  }, [recipes]);

  if (loading && !recipes.length) return <Loading label="Warming the pan…" />;

  if (error && !recipes.length) {
    return (
      <Empty
        icon="cloud-offline-outline"
        title="Couldn't load recipes"
        body={error}
        action={<Chip label="Try again" icon="refresh" onPress={refresh} />}
      />
    );
  }

  const go = (facet: string) => router.push({ pathname: '/search', params: { facet } });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.lime} />}
    >
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="small" color={c.textMute}>{greeting()}</Txt>
          <Txt variant="hero" style={{ marginTop: 2 }}>Chop the{'\n'}Greens</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <AccountButton onPress={() => setAccountOpen(true)} />
        </View>
      </View>

      {offline ? (
        <View style={s.offline}>
          <Ionicons name="cloud-offline-outline" size={14} color={c.amber} />
          <Txt variant="small" color={c.amber}>Offline — showing your saved copy</Txt>
        </View>
      ) : null}

      <Tap onPress={() => router.push('/search')} style={s.searchBar} haptic="light">
        <Ionicons name="search" size={17} color={c.textMute} />
        <Txt variant="body" color={c.textMute}>Search {recipes.length} recipes…</Txt>
      </Tap>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.facetRow} style={{ marginTop: 16 }}>
        {FACETS.slice(0, 8).map((f) => (
          <Chip key={f.id} label={f.label} icon={f.icon} onPress={() => go(f.id)} />
        ))}
      </ScrollView>

      {groups.hero ? (
        <View style={{ marginTop: 28 }}>
          <RecipeHero recipe={groups.hero} label="Today's pick" />
        </View>
      ) : null}

      <Rail title="Ready in 30" data={groups.quick} onSeeAll={() => go('quick')} />
      <Rail title="Watch & cook" data={groups.withVideo} />
      <Rail title="Instant Pot" data={groups.instantPot} onSeeAll={() => go('instant-pot')} />
      <Rail title="Fresh off the blog" data={groups.newest} />
      <Rail title="Air fryer crisp" data={groups.airFryer} onSeeAll={() => go('air-fryer')} />
      <Rail title="Protein packed" data={groups.protein} onSeeAll={() => go('high-protein')} />
      <Rail title="Breakfast" data={groups.breakfast} onSeeAll={() => go('breakfast')} />

      <SocialRow />

      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
    </ScrollView>
  );
}

const styles = (c: Colors) => ({
  header: {
    flexDirection: 'row' as const, alignItems: 'flex-start' as const,
    paddingHorizontal: 20, marginBottom: 18,
  },
  searchBar: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginHorizontal: 20,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.pill,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline,
  },
  facetRow: { paddingHorizontal: 20, gap: 8 },
  offline: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    alignSelf: 'flex-start' as const, marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,180,84,0.12)',
  },
});
