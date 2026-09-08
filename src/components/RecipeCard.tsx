import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Recipe } from '../api/types';
import { formatMinutes } from '../lib/format';
import { useUser } from '../store/user';
import { BRAND, PHOTO_SCRIM, radius, shadow, useColors, useStyles, type Colors } from '../theme';
import { Stars, Tap, Txt } from './ui';

const BLUR = 'L2A9-K00~q00%M00WBof00%M00%M'; // neutral dark placeholder

/** Time + rating strip shared by the card variants. */
function Meta({ recipe, onPhoto }: { recipe: Recipe; onPhoto?: boolean }) {
  const c = useColors();
  const tint = onPhoto ? PHOTO_SCRIM.onPhoto : c.textSoft;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name="time-outline" size={12} color={onPhoto ? PHOTO_SCRIM.onPhoto : c.lime} />
      <Txt variant="small" color={tint}>{formatMinutes(recipe.total)}</Txt>
      {recipe.rating.avg ? (
        <>
          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: tint, marginHorizontal: 2, opacity: 0.6 }} />
          <Stars value={recipe.rating.avg} size={11} />
        </>
      ) : null}
      {recipe.videoId ? (
        <>
          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: tint, marginHorizontal: 2, opacity: 0.6 }} />
          <Ionicons name="logo-youtube" size={12} color={onPhoto ? PHOTO_SCRIM.onPhoto : c.chili} />
        </>
      ) : null}
    </View>
  );
}

function SaveButton({ id }: { id: number }) {
  const { isSaved, toggleSave } = useUser();
  const saved = isSaved(id);
  return (
    <Tap onPress={() => toggleSave(id)} haptic="light" hitSlop={8} style={photo.save}>
      <Ionicons
        name={saved ? 'bookmark' : 'bookmark-outline'}
        size={16}
        color={saved ? PHOTO_SCRIM.onPhoto : PHOTO_SCRIM.onPhoto}
        style={saved ? undefined : { opacity: 0.9 }}
      />
      {saved ? <View style={photo.savedDot} /> : null}
    </Tap>
  );
}

/** Full-bleed hero used for the featured slot. */
export function RecipeHero({ recipe, label }: { recipe: Recipe; label?: string }) {
  const router = useRouter();
  const s = useStyles(styles);
  const c = useColors();
  return (
    <Tap onPress={() => router.push(`/recipe/${recipe.id}`)} haptic="light" style={[s.hero, shadow.lift]}>
      <Image source={recipe.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover"
        placeholder={{ blurhash: BLUR }} transition={220} />
      {/* Scrim starts low so the dish stays visible; only the title needs cover. */}
      <LinearGradient colors={[PHOTO_SCRIM.clear, PHOTO_SCRIM.soft, PHOTO_SCRIM.hard]}
        locations={[0.4, 0.74, 1]} style={StyleSheet.absoluteFill} />
      <View style={s.heroTop}>
        {label ? (
          <View style={[s.badge, { backgroundColor: c.brand }]}>
            <Txt variant="label" color={c.onBrand}>{label}</Txt>
          </View>
        ) : <View />}
        <SaveButton id={recipe.id} />
      </View>
      <View style={s.heroBody}>
        <Txt variant="h1" numberOfLines={2} color={PHOTO_SCRIM.onPhoto}>{recipe.displayName}</Txt>
        <Meta recipe={recipe} onPhoto />
      </View>
    </Tap>
  );
}

/** Portrait tile for horizontal rails. */
export function RecipeTile({ recipe, width = 168 }: { recipe: Recipe; width?: number }) {
  const router = useRouter();
  const s = useStyles(styles);
  return (
    <Tap onPress={() => router.push(`/recipe/${recipe.id}`)} haptic="light" style={{ width }}>
      <View style={[s.tileImage, { width, height: width * 1.18 }, shadow.card]}>
        <Image source={recipe.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover"
          placeholder={{ blurhash: BLUR }} transition={200} />
        <LinearGradient colors={[PHOTO_SCRIM.clear, PHOTO_SCRIM.hard]} locations={[0.45, 1]}
          style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', top: 8, right: 8 }}><SaveButton id={recipe.id} /></View>
        <View style={photo.tileTime}>
          <Ionicons name="time-outline" size={11} color={PHOTO_SCRIM.onPhoto} />
          <Txt variant="small" style={{ fontSize: 11 }} color={PHOTO_SCRIM.onPhoto}>
            {formatMinutes(recipe.total)}
          </Txt>
          {recipe.videoId ? (
            <Ionicons name="logo-youtube" size={12} color={PHOTO_SCRIM.onPhoto} style={{ marginLeft: 2 }} />
          ) : null}
        </View>
      </View>
      <Txt variant="h3" numberOfLines={2} style={{ marginTop: 10 }}>{recipe.displayName}</Txt>
      {recipe.rating.avg ? (
        <View style={{ marginTop: 4 }}><Stars value={recipe.rating.avg} count={recipe.rating.count} size={11} /></View>
      ) : null}
    </Tap>
  );
}

/** Half-width card for grids. */
export function RecipeGridCard({ recipe }: { recipe: Recipe }) {
  // Measured live: a module-scope Dimensions read is stale on first paint and
  // never updates on rotation or split-screen.
  const { width } = useWindowDimensions();
  return <RecipeTile recipe={recipe} width={(width - 20 * 2 - 14) / 2} />;
}

/** Compact horizontal row for lists and the planner. */
export function RecipeRow({ recipe, onPress, right }:
  { recipe: Recipe; onPress?: () => void; right?: React.ReactNode }) {
  const router = useRouter();
  const s = useStyles(styles);
  const c = useColors();
  return (
    <Tap onPress={onPress ?? (() => router.push(`/recipe/${recipe.id}`))} haptic="light" style={s.row}>
      <Image source={recipe.imageUrl} style={s.rowImage} contentFit="cover"
        placeholder={{ blurhash: BLUR }} transition={180} />
      <View style={{ flex: 1, gap: 3 }}>
        <Txt variant="h3" numberOfLines={2}>{recipe.displayName}</Txt>
        <Meta recipe={recipe} />
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={c.textMute} />}
    </Tap>
  );
}

/** Fixed styles that sit on top of photography, so they don't vary by theme. */
const photo = StyleSheet.create({
  save: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: PHOTO_SCRIM.chipBg, borderWidth: 1, borderColor: PHOTO_SCRIM.chipBorder,
  },
  savedDot: {
    position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2,
    backgroundColor: BRAND,
  },
  tileTime: {
    position: 'absolute', left: 10, bottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
});

const styles = (c: Colors) => ({
  hero: {
    height: 400, borderRadius: radius.xl, overflow: 'hidden' as const,
    marginHorizontal: 20, justifyContent: 'space-between' as const,
    backgroundColor: c.surfaceAlt,
  },
  heroTop: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const, padding: 16,
  },
  heroBody: { padding: 20, gap: 10 },
  badge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill },
  tileImage: { borderRadius: radius.lg, overflow: 'hidden' as const, backgroundColor: c.surfaceAlt },
  row: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  rowImage: { width: 66, height: 66, borderRadius: radius.md, backgroundColor: c.surfaceAlt },
});
