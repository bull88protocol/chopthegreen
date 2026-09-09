import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_BASE } from '../lib/layout';
import { useAuth } from '../store/auth';
import { useUser } from '../store/user';
import { radius, shadow, useColors, useStyles, type Colors } from '../theme';
import { AccountSheet } from './AccountSheet';
import { Tap, Txt } from './ui';

const K_SHOWN = 'ctg.firstSavePrompt.v1';
/** Shared with SyncNudge: dismissing that card silences this too. */
const K_NUDGE_DISMISSED = 'ctg.syncNudge.v1';

const VISIBLE_MS = 6000;

/**
 * One-time invitation to sign in, fired the moment the first recipe is saved.
 *
 * Timing is the whole point. On first launch there is no list, no plan and
 * nothing saved, so "back up your recipes" is a pitch about protecting
 * something that doesn't exist — which is why this deliberately isn't a
 * first-run dialog. The first save is the first moment the offer is actually
 * true, and it's also the first moment the user would mind losing anything.
 *
 * It's a snackbar rather than a sheet so it stays ignorable: it interrupts
 * nothing, auto-dismisses, and never appears again either way. The passive
 * cards on Saved / List / Plan (`SyncNudge`) remain the fallback for anyone
 * who lets this one slide past.
 *
 * Lives in the root layout, not the tab layout, because saving happens from
 * the recipe screen too — which is a sibling route, not a child of the tabs.
 */
export function FirstSavePrompt() {
  const { ready, saved } = useUser();
  const { available, user, status } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const s = useStyles(styles);

  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  // null until the store has hydrated; seeding it from the loaded value is
  // what stops an existing user's saves from reading as a brand-new save.
  const prevCount = useRef<number | null>(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => setVisible(false));
  }, [anim]);

  useEffect(() => {
    if (!ready) return;
    const count = saved.length;
    const before = prevCount.current;
    prevCount.current = count;
    if (before !== 0) return;          // includes the seeding pass (null)

    // `signedOut` rather than `!user`: during the cold-start auth restore the
    // status is `working` and the user is still null, and prompting someone
    // who turns out to be signed in already would be embarrassing.
    if (!available || user || status !== 'signedOut') return;

    (async () => {
      try {
        const rows = await AsyncStorage.multiGet([K_SHOWN, K_NUDGE_DISMISSED]);
        const flags = Object.fromEntries(rows);
        if (flags[K_SHOWN] === '1' || flags[K_NUDGE_DISMISSED] === '1') return;
        await AsyncStorage.setItem(K_SHOWN, '1');
      } catch {
        return;   // fail closed: a storage fault shouldn't produce a repeating prompt
      }
      setVisible(true);
    })();
  }, [ready, saved.length, available, user, status]);

  useEffect(() => {
    if (!visible) return;
    Animated.spring(anim, {
      toValue: 1, useNativeDriver: true, damping: 18, stiffness: 190, mass: 0.7,
    }).start();
    const t = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [visible, anim, hide]);

  // Signing in mid-prompt makes it moot.
  useEffect(() => { if (user && visible) hide(); }, [user, visible, hide]);

  if (!visible && !sheetOpen) return null;

  return (
    <>
      {visible ? (
        <Animated.View
          pointerEvents="box-none"
          accessibilityLiveRegion={Platform.OS === 'android' ? 'polite' : undefined}
          style={[
            s.wrap,
            { bottom: insets.bottom + TAB_BAR_BASE + 10 },
            {
              opacity: anim,
              transform: [{
                translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
              }],
            },
          ]}
        >
          <Animated.View style={s.bar}>
            <Ionicons name="bookmark" size={16} color={c.lime} />
            <Txt variant="smallMed" style={{ flex: 1 }} numberOfLines={2}>
              Saved to this phone. Sign in to back it up.
            </Txt>
            <Tap onPress={() => { hide(); setSheetOpen(true); }} hitSlop={10}
              style={s.action} accessibilityRole="button">
              <Txt variant="smallMed" color={c.lime}>Sign in</Txt>
            </Tap>
            <Tap onPress={hide} hitSlop={10} accessibilityLabel="Dismiss">
              <Ionicons name="close" size={15} color={c.textMute} />
            </Tap>
          </Animated.View>
        </Animated.View>
      ) : null}
      <AccountSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

const styles = (c: Colors) => ({
  wrap: { position: 'absolute', left: 14, right: 14 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: c.elevated,
    borderWidth: 1,
    borderColor: c.hairlineStrong,
    ...shadow.card,
  },
  action: { paddingHorizontal: 4, paddingVertical: 2 },
});
