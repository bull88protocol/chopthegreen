import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../store/auth';
import { radius, useColors, useStyles, type Colors } from '../theme';
import { AccountSheet } from './AccountSheet';
import { Tap, Txt } from './ui';

const K_DISMISSED = 'ctg.syncNudge.v1';

/**
 * Per-tab copy. Each one names the thing the user is looking at right now —
 * a generic "back up your data" is easy to ignore on every screen at once.
 */
const COPY = {
  saved: {
    title: 'Saved on this phone',
    body: 'Sign in with Google to back these up, so a new phone starts with your recipes already here.',
  },
  list: {
    title: 'This list lives on this phone',
    body: 'Sign in with Google to back it up and open the same list on any of your devices.',
  },
  plan: {
    title: 'This plan lives on this phone',
    body: 'Sign in with Google to back up your week and reach it from any of your devices.',
  },
} as const;

/**
 * Invitation to sign in, shown where saving actually happens.
 *
 * Deliberately not a gate: browsing, searching, cooking, saving, the shopping
 * list and the meal plan all work signed out and offline, and this card is the
 * only place the app ever mentions an account outside Settings. It renders at
 * all only when
 *
 *   - the build has Firebase config (`available`) — otherwise sync doesn't exist;
 *   - nobody is signed in;
 *   - the card hasn't been dismissed before; and
 *   - `when` is true, which callers pass as "there is something here to lose".
 *
 * That last one matters: offering to back up an empty list is noise, and the
 * ask lands far better once the user has something they'd be annoyed to lose.
 */
export function SyncNudge({ context, when = true }: {
  context: keyof typeof COPY;
  when?: boolean;
}) {
  const { available, user } = useAuth();
  const c = useColors();
  const s = useStyles(styles);
  // null = still reading storage. Starting at `false` would flash the card in
  // and out for anyone who has already dismissed it.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!available) return;
    let alive = true;
    AsyncStorage.getItem(K_DISMISSED)
      .then((v) => { if (alive) setDismissed(v === '1'); })
      .catch(() => { if (alive) setDismissed(false); });
    return () => { alive = false; };
  }, [available]);

  const dismiss = () => {
    setDismissed(true);
    void AsyncStorage.setItem(K_DISMISSED, '1').catch(() => {});
  };

  const hidden = !available || !!user || !when || dismissed !== false;
  // A successful sign-in sets `user`, which hides the card — so the sheet has to
  // outlive it, or it would vanish at the exact moment it has something to say.
  if (hidden && !sheetOpen) return null;
  const copy = COPY[context];

  return (
    <>
      {hidden ? null : (
        <Tap haptic="light" onPress={() => setSheetOpen(true)} style={s.card}
          accessibilityRole="button"
          accessibilityLabel={`${copy.title}. ${copy.body}`}>
          <View style={s.icon}>
            <Ionicons name="cloud-upload-outline" size={17} color={c.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{copy.title}</Txt>
            <Txt variant="small" color={c.textMute} style={{ marginTop: 3 }}>{copy.body}</Txt>
            <View style={s.cta}>
              <Ionicons name="logo-google" size={13} color={c.lime} />
              <Txt variant="smallMed" color={c.lime}>Sign in with Google</Txt>
            </View>
          </View>
          <Tap onPress={dismiss} hitSlop={12} style={s.close} accessibilityLabel="Dismiss">
            <Ionicons name="close" size={15} color={c.textMute} />
          </Tap>
        </Tap>
      )}
      <AccountSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

const styles = (c: Colors) => ({
  card: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 14,
    paddingRight: 34,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.hairline,
  },
  icon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.limeGlow,
  },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  close: { position: 'absolute', top: 8, right: 8, padding: 4 },
});
