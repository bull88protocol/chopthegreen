import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe } from '../../src/api/types';
import { RecipeGridCard } from '../../src/components/RecipeCard';
import { SyncNudge } from '../../src/components/SyncNudge';
import { Button, Empty, Txt } from '../../src/components/ui';
import { pluralize } from '../../src/lib/format';
import { useTabBarPadding } from '../../src/lib/layout';
import { useRecipes } from '../../src/store/recipes';
import { useUser } from '../../src/store/user';
import { useColors, useStyles, type Colors } from '../../src/theme';

export default function Saved() {
  const c = useColors();
  const s = useStyles(styles);
  const { byId } = useRecipes();
  const { saved } = useUser();
  const insets = useSafeAreaInsets();
  const bottomPad = useTabBarPadding();
  const router = useRouter();

  // Keep the user's own ordering (most recently saved first).
  const recipes = useMemo(
    () => saved.map((id) => byId.get(id)).filter(Boolean) as Recipe[],
    [saved, byId],
  );

  if (!recipes.length) {
    return (
      <Empty
        icon="bookmark-outline"
        title="No saved recipes yet"
        body="Tap the bookmark on any recipe to keep it here — it stays on your phone, even offline."
        action={<Button label="Browse recipes" icon="compass-outline" onPress={() => router.push('/')} />}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={s.header}>
        <Txt variant="h1">Saved</Txt>
        <Txt variant="small" color={c.textMute} style={{ marginTop: 4 }}>
          {pluralize(recipes.length, 'recipe')}
        </Txt>
      </View>
      <FlatList
        data={recipes}
        keyExtractor={(r) => String(r.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 22, paddingTop: 6, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<SyncNudge context="saved" />}
        renderItem={({ item }) => <RecipeGridCard recipe={item} />}
      />
    </View>
  );
}

const styles = (c: Colors) => ({
  header: { paddingHorizontal: 20, marginBottom: 14 },
});
