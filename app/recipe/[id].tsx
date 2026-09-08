import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Ingredient } from '../../src/api/types';
import { VideoCard } from '../../src/components/VideoCard';
import { Button, Chip, Empty, Loading, Stars, Tap, Txt } from '../../src/components/ui';
import { shareRecipe } from '../../src/lib/share';
import { formatMinutes, pluralize } from '../../src/lib/format';
import { formatNumber, scaleAmount } from '../../src/lib/amount';
import { useRecipe, useRecipes } from '../../src/store/recipes';
import { useUser } from '../../src/store/user';
import { BRAND, PHOTO_SCRIM, radius, useColors, useStyles, type Colors } from '../../src/theme';

const HERO = 360;

const NUTRIENTS: Array<[string, string, string]> = [
  ['calories', 'Calories', 'kcal'],
  ['protein', 'Protein', 'g'],
  ['carbohydrates', 'Carbs', 'g'],
  ['fat', 'Fat', 'g'],
  ['fiber', 'Fibre', 'g'],
  ['sugar', 'Sugar', 'g'],
  ['sodium', 'Sodium', 'mg'],
  ['calcium', 'Calcium', 'mg'],
  ['iron', 'Iron', 'mg'],
];

function MetaCell({ icon, value, label }:
  { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <View style={s.metaCell}>
      <Ionicons name={icon} size={15} color={c.lime} />
      <Txt variant="num" style={{ marginTop: 6 }}>{value}</Txt>
      <Txt variant="label" color={c.textMute} style={{ marginTop: 2 }}>{label}</Txt>
    </View>
  );
}

function IngredientRow({ ing, scale, checked, onToggle }:
  { ing: Ingredient; scale: number; checked: boolean; onToggle: () => void }) {
  const c = useColors();
  const s = useStyles(styles);
  const amount = scaleAmount(ing.amount, scale);
  return (
    <Tap onPress={onToggle} haptic="select" style={s.ingRow}>
      <View style={[s.check, checked && { backgroundColor: c.lime, borderColor: c.lime }]}>
        {checked ? <Ionicons name="checkmark" size={13} color={c.onLime} /> : null}
      </View>
      <Txt variant="body" style={[{ flex: 1 }, checked && s.struck]}>
        {amount || ing.unit ? (
          <Txt variant="bodyMed" color={c.lime}>
            {[amount, ing.unit].filter(Boolean).join(' ')}{' '}
          </Txt>
        ) : null}
        {ing.name}
        {ing.notes ? <Txt variant="small" color={c.textMute}>, {ing.notes}</Txt> : null}
      </Txt>
    </Tap>
  );
}

export default function RecipeDetail() {
  const c = useColors();
  const s = useStyles(styles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useRecipe(id);
  const { loading } = useRecipes();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const { isSaved, toggleSave, addRecipeToList, removeRecipeFromList, recipeInList } = useUser();

  const [tab, setTab] = useState<'ingredients' | 'method' | 'nutrition'>('ingredients');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [servings, setServings] = useState<number | null>(null);
  const scrollY = useMemo(() => new Animated.Value(0), []);

  const base = recipe?.servings || 0;
  const current = servings ?? base;
  const scale = base > 0 ? current / base : 1;

  const grouped = useMemo(() => {
    if (!recipe) return [];
    const out: Array<{ group?: string; items: Ingredient[] }> = [];
    for (const ing of recipe.ingredients) {
      const last = out[out.length - 1];
      if (last && last.group === ing.group) last.items.push(ing);
      else out.push({ group: ing.group, items: [ing] });
    }
    return out;
  }, [recipe]);

  if (loading && !recipe) return <Loading />;
  if (!recipe) {
    return <Empty icon="alert-circle-outline" title="Recipe not found"
      action={<Chip label="Go back" icon="arrow-back" onPress={() => router.back()} />} />;
  }

  const inList = recipeInList(recipe.id);
  const saved = isSaved(recipe.id);
  const nutrition = NUTRIENTS.filter(([k]) => (recipe.nutrition as any)[k] > 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Parallax hero: scales on overscroll, drifts on scroll-away. */}
        <Animated.View style={[s.hero, {
          transform: [
            { translateY: scrollY.interpolate({ inputRange: [-HERO, 0, HERO], outputRange: [-HERO / 2, 0, HERO * 0.35] }) },
            { scale: scrollY.interpolate({ inputRange: [-HERO, 0], outputRange: [2.2, 1], extrapolateRight: 'clamp' }) },
          ],
        }]}>
          <Image source={recipe.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          <LinearGradient colors={['rgba(10,13,11,0.5)', 'transparent', c.bg]}
            locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View style={{ height: HERO - 60 }} />

        <View style={s.sheet}>
          <View style={s.tagRow}>
            {[...recipe.courses.slice(0, 1), ...recipe.cuisines.slice(0, 1)].map((t) => (
              <View key={t} style={s.tag}><Txt variant="label" color={c.limeDim}>{t}</Txt></View>
            ))}
          </View>

          <Txt variant="hero" style={{ marginTop: 12 }}>{recipe.displayName}</Txt>

          {recipe.rating.avg ? (
            <View style={{ marginTop: 10 }}>
              <Stars value={recipe.rating.avg} count={recipe.rating.count} size={14} />
            </View>
          ) : null}

          {recipe.summary ? (
            <Txt variant="body" color={c.textSoft} style={{ marginTop: 12 }}>{recipe.summary}</Txt>
          ) : null}

          <View style={s.metaCard}>
            <MetaCell icon="cut-outline" value={formatMinutes(recipe.prep)} label="Prep" />
            <View style={s.divider} />
            <MetaCell icon="flame-outline" value={formatMinutes(recipe.cook)} label="Cook" />
            <View style={s.divider} />
            <MetaCell icon="time-outline" value={formatMinutes(recipe.total)} label="Total" />
          </View>

          {recipe.videoId ? (
            <View style={{ marginTop: 22 }}>
              <Txt variant="label" color={c.textMute} style={{ marginBottom: 4 }}>Watch it made</Txt>
              <VideoCard id={recipe.videoId} isShort={recipe.videoIsShort} title={recipe.displayName} />
            </View>
          ) : null}

          <View style={s.tabs}>
            {(['ingredients', 'method', 'nutrition'] as const).map((t) => {
              const on = tab === t;
              const disabled = t === 'nutrition' && !nutrition.length;
              return (
                <Tap key={t} disabled={disabled} haptic="select" onPress={() => setTab(t)}
                  style={[s.tab, on && { backgroundColor: c.lime }]}>
                  <Txt variant="smallMed" color={disabled ? c.textMute : on ? c.onLime : c.textSoft}>
                    {t === 'ingredients' ? 'Ingredients' : t === 'method' ? 'Method' : 'Nutrition'}
                  </Txt>
                </Tap>
              );
            })}
          </View>

          {tab === 'ingredients' ? (
            <View style={{ marginTop: 18 }}>
              {base > 0 ? (
                <View style={s.servings}>
                  <Txt variant="smallMed" color={c.textSoft}>
                    {pluralize(current, recipe.servingsUnit)}
                  </Txt>
                  <View style={s.stepper}>
                    <Tap hitSlop={8} haptic="light" onPress={() => setServings(Math.max(1, current - 1))}>
                      <Ionicons name="remove" size={17} color={current <= 1 ? c.textMute : c.lime} />
                    </Tap>
                    <Txt variant="bodyMed" style={{ minWidth: 26, textAlign: 'center' }}>{formatNumber(current)}</Txt>
                    <Tap hitSlop={8} haptic="light" onPress={() => setServings(current + 1)}>
                      <Ionicons name="add" size={17} color={c.lime} />
                    </Tap>
                  </View>
                </View>
              ) : null}

              {grouped.map((g, gi) => (
                <View key={gi} style={{ marginTop: gi ? 18 : 10 }}>
                  {g.group ? (
                    <Txt variant="label" color={c.limeDim} style={{ marginBottom: 8 }}>{g.group}</Txt>
                  ) : null}
                  {g.items.map((ing) => (
                    <IngredientRow key={ing.uid} ing={ing} scale={scale}
                      checked={!!checked[ing.uid]}
                      onToggle={() => setChecked((p) => ({ ...p, [ing.uid]: !p[ing.uid] }))} />
                  ))}
                </View>
              ))}

              {recipe.equipment.length ? (
                <View style={{ marginTop: 24 }}>
                  <Txt variant="label" color={c.textMute} style={{ marginBottom: 10 }}>Equipment</Txt>
                  <View style={s.equipRow}>
                    {recipe.equipment.map((e) => (
                      <View key={e} style={s.equip}><Txt variant="small" color={c.textSoft}>{e}</Txt></View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {tab === 'method' ? (
            <View style={{ marginTop: 18 }}>
              {recipe.steps.map((step, i) => (
                <View key={step.uid} style={{ marginBottom: 22 }}>
                  {step.group && (i === 0 || recipe.steps[i - 1].group !== step.group) ? (
                    <Txt variant="label" color={c.limeDim} style={{ marginBottom: 12 }}>{step.group}</Txt>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <View style={s.stepNum}>
                      <Txt variant="smallMed" color={c.onLime}>{i + 1}</Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" color={c.textSoft}>{step.text}</Txt>
                      {step.imageUrl ? (
                        <Image source={step.imageUrl} style={s.stepImage} contentFit="cover" transition={200} />
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
              {recipe.notes ? (
                <View style={s.notes}>
                  <Txt variant="label" color={c.amber} style={{ marginBottom: 8 }}>Notes from Gari</Txt>
                  <Txt variant="body" color={c.textSoft}>{recipe.notes}</Txt>
                </View>
              ) : null}
            </View>
          ) : null}

          {tab === 'nutrition' ? (
            <View style={{ marginTop: 18 }}>
              <Txt variant="small" color={c.textMute} style={{ marginBottom: 14 }}>
                Per {recipe.servingsUnit}, as published.
              </Txt>
              <View style={s.nutGrid}>
                {nutrition.map(([key, label, unit]) => (
                  <View key={key} style={[s.nutCell, { width: (W - 40 - 20) / 3 }]}>
                    <Txt variant="num">{formatNumber((recipe.nutrition as any)[key])}
                      <Txt variant="small" color={c.textMute}>{unit}</Txt>
                    </Txt>
                    <Txt variant="label" color={c.textMute} style={{ marginTop: 3 }}>{label}</Txt>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recipe.link ? (
            <Tap style={s.sourceLink} haptic="light"
              onPress={() => void WebBrowser.openBrowserAsync(recipe.link)}>
              <Ionicons name="open-outline" size={15} color={c.textSoft} />
              <Txt variant="smallMed" color={c.textSoft}>Read the full post</Txt>
            </Tap>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* Floating nav */}
      <View style={[s.navBar, { top: insets.top + 6 }]}>
        <Tap onPress={() => router.back()} haptic="light" style={s.navBtn}>
          <Ionicons name="chevron-back" size={21} color={PHOTO_SCRIM.onPhoto} />
        </Tap>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Tap onPress={() => void shareRecipe(recipe)} haptic="light" style={s.navBtn}>
            <Ionicons name={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
              size={18} color={PHOTO_SCRIM.onPhoto} />
          </Tap>
          <Tap onPress={() => toggleSave(recipe.id)} haptic="light" style={s.navBtn}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18}
              color={saved ? BRAND : PHOTO_SCRIM.onPhoto} />
          </Tap>
        </View>
      </View>

      {/* Sticky actions */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 14 }]}>
        <Button label={inList ? 'In your list' : 'Add to list'}
          icon={inList ? 'checkmark-circle' : 'cart-outline'}
          tone="ghost" style={{ flex: 1 }}
          onPress={() => (inList ? removeRecipeFromList(recipe.id) : addRecipeToList(recipe, scale))} />
        <Button label="Cook" icon="play" style={{ flex: 1 }}
          onPress={() => router.push(`/cook/${recipe.id}`)} />
      </View>
    </View>
  );
}

const styles = (c: Colors) => ({
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: HERO, backgroundColor: c.surfaceAlt },
  sheet: {
    backgroundColor: c.bg, paddingHorizontal: 20, paddingTop: 4,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
    backgroundColor: c.limeGlow, borderWidth: 1, borderColor: c.hairline,
  },
  metaCard: {
    flexDirection: 'row', marginTop: 22, paddingVertical: 16, borderRadius: radius.lg,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline,
  },
  metaCell: { flex: 1, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: c.hairlineStrong, marginVertical: 6 },
  tabs: {
    flexDirection: 'row', marginTop: 24, padding: 4, gap: 4, borderRadius: radius.pill,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  servings: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: radius.md, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.hairline,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 9 },
  check: {
    width: 21, height: 21, borderRadius: 7, marginTop: 1,
    borderWidth: 1.5, borderColor: c.hairlineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  struck: { textDecorationLine: 'line-through', color: c.textMute },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairline,
  },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: c.lime,
    alignItems: 'center', justifyContent: 'center',
  },
  stepImage: { width: '100%', height: 190, borderRadius: radius.md, marginTop: 12, backgroundColor: c.surfaceAlt },
  notes: {
    padding: 16, borderRadius: radius.md, backgroundColor: 'rgba(255,180,84,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,180,84,0.18)',
  },
  nutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutCell: {
    paddingVertical: 14, alignItems: 'center',
    borderRadius: radius.md, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.hairline,
  },
  sourceLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 30, paddingVertical: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: c.hairline,
  },
  navBar: {
    position: 'absolute', left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: PHOTO_SCRIM.chipBg, borderWidth: 1, borderColor: PHOTO_SCRIM.chipBorder,
  },
  cta: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: c.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline,
  },
});
