import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe, Step } from '../../src/api/types';
import { Chip, Empty, Tap, Txt } from '../../src/components/ui';
import { detectTimer } from '../../src/lib/format';
import { mmss, useTimer } from '../../src/lib/useTimer';
import { useRecipe } from '../../src/store/recipes';
import { radius, useColors, useStyles, type Colors } from '../../src/theme';


/** One full-screen step page. */
function StepPage({ step, index, total, recipe, bottomPad, width }:
  { step: Step; index: number; total: number; recipe: Recipe; bottomPad: number; width: number }) {
  const c = useColors();
  const s = useStyles(styles);
  const uses = useMemo(
    () => recipe.ingredients.filter((i) => step.ingredientUids.includes(i.uid)),
    [recipe.ingredients, step.ingredientUids],
  );
  return (
    <View style={{ width, paddingHorizontal: 24, paddingBottom: bottomPad }}>
      <Txt variant="label" color={c.limeDim}>
        {step.group ? step.group : `Step ${index + 1} of ${total}`}
      </Txt>
      {step.imageUrl ? (
        <Image source={step.imageUrl} style={s.image} contentFit="cover" transition={220} />
      ) : null}
      <Txt style={[s.stepText, { marginTop: step.imageUrl ? 22 : 26 }]}>{step.text}</Txt>
      {uses.length ? (
        <View style={s.uses}>
          <Txt variant="label" color={c.textMute} style={{ marginBottom: 10 }}>You'll need</Txt>
          {uses.map((i) => (
            <Txt key={i.uid} variant="body" color={c.textSoft} style={{ marginBottom: 3 }}>
              <Txt variant="bodyMed" color={c.lime}>
                {[i.amount, i.unit].filter(Boolean).join(' ')}{' '}
              </Txt>
              {i.name}
            </Txt>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function CookMode() {
  const c = useColors();
  const s = useStyles(styles);
  useKeepAwake(); // the screen must not dim with flour on your hands

  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useRecipe(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Page width must track the real window, or paging desyncs on rotation.
  const { width: W } = useWindowDimensions();
  const listRef = useRef<FlatList<Step>>(null);
  const [index, setIndex] = useState(0);

  const timer = useTimer(useCallback(() => {
    Alert.alert('Timer done', 'Back to the pan.');
  }, []));

  const steps = recipe?.steps ?? [];
  const step = steps[index];
  const suggested = useMemo(() => (step ? detectTimer(step.text) : null), [step]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index;
    if (typeof first === 'number') setIndex(first);
  }).current;

  const goTo = useCallback((next: number) => {
    if (!steps.length) return;
    const clamped = Math.max(0, Math.min(steps.length - 1, next));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
  }, [steps.length]);

  if (!recipe) {
    return <Empty icon="alert-circle-outline" title="Recipe not found"
      action={<Chip label="Close" icon="close" onPress={() => router.back()} />} />;
  }

  const last = index === steps.length - 1;
  const progress = steps.length ? (index + 1) / steps.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[s.top, { paddingTop: insets.top + 10 }]}>
        <View style={s.topRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="h3" numberOfLines={1}>{recipe.displayName}</Txt>
          </View>
          <Tap onPress={() => router.back()} haptic="light" style={s.close}>
            <Ionicons name="close" size={20} color={c.text} />
          </Tap>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={steps}
        keyExtractor={(st) => String(st.uid)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        renderItem={({ item, index: i }) => (
          <StepPage step={item} index={i} total={steps.length} recipe={recipe}
            bottomPad={insets.bottom + 190} width={W} />
        )}
      />

      <LinearGradient colors={['transparent', c.bg]} style={s.fade} pointerEvents="none" />

      <View style={[s.controls, { paddingBottom: insets.bottom + 16 }]}>
        {timer.running ? (
          <Tap onPress={timer.stop} haptic="medium" style={[s.timer, s.timerOn]}>
            <Ionicons name="stop" size={16} color={c.onLime} />
            <Txt variant="num" color={c.onLime}>{mmss(timer.remaining)}</Txt>
          </Tap>
        ) : suggested ? (
          <Tap haptic="medium" style={s.timer}
            onPress={() => void timer.start(Math.round(suggested * 60), `${recipe.displayName} — step ${index + 1}`)}>
            <Ionicons name="timer-outline" size={16} color={c.lime} />
            <Txt variant="smallMed" color={c.lime}>
              Start {mmss(Math.round(suggested * 60))} timer
            </Txt>
          </Tap>
        ) : null}

        <View style={s.navRow}>
          <Tap onPress={() => goTo(index - 1)} haptic="light" disabled={index === 0}
            style={[s.nav, index === 0 && { opacity: 0.3 }]}>
            <Ionicons name="chevron-back" size={22} color={c.text} />
          </Tap>

          <Txt variant="smallMed" color={c.textMute}>{index + 1} / {steps.length}</Txt>

          {last ? (
            <Tap onPress={() => router.back()} haptic="medium" style={[s.nav, s.navDone]}>
              <Ionicons name="checkmark" size={22} color={c.onLime} />
            </Tap>
          ) : (
            <Tap onPress={() => goTo(index + 1)} haptic="light" style={[s.nav, s.navNext]}>
              <Ionicons name="chevron-forward" size={22} color={c.onLime} />
            </Tap>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = (c: Colors) => ({
  top: { paddingHorizontal: 20, paddingBottom: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  close: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairline,
  },
  track: { height: 3, borderRadius: 2, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.lime, borderRadius: 2 },
  image: { width: '100%', height: 210, borderRadius: radius.lg, marginTop: 18, backgroundColor: c.surfaceAlt },
  // Deliberately large: this has to be readable at arm's length across a bench.
  stepText: { fontFamily: 'Bricolage_600SemiBold', fontSize: 25, lineHeight: 34, letterSpacing: -0.5, color: c.text },
  uses: {
    marginTop: 26, padding: 16, borderRadius: radius.md,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline,
  },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, gap: 16 },
  timer: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairlineStrong,
  },
  timerOn: { backgroundColor: c.lime, borderColor: c.lime },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: {
    width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairline,
  },
  navNext: { backgroundColor: c.lime, borderColor: c.lime },
  navDone: { backgroundColor: c.mint, borderColor: c.mint },
});
