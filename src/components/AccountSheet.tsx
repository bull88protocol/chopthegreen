import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/auth';
import { radius, useColors, useStyles, type Colors } from '../theme';
import { Button, Tap, Txt } from './ui';

/** Small avatar / cloud button that opens the sheet. */
export function AccountButton({ onPress }: { onPress: () => void }) {
  const { available, user, status } = useAuth();
  const c = useColors();
  const s = useStyles(styles);
  if (!available) return null;
  return (
    <Tap onPress={onPress} haptic="light" style={s.avatarBtn} accessibilityLabel="Account">
      {user?.photo ? (
        <Image source={user.photo} style={s.avatar} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name={user ? 'person' : 'cloud-outline'} size={16}
          color={user ? c.lime : c.textMute} />
      )}
      {status === 'error' ? <View style={[s.dot, { backgroundColor: c.chili }]} /> : null}
    </Tap>
  );
}

const STATUS_TEXT: Record<string, string> = {
  working: 'Syncing…',
  synced: 'Backed up',
  error: 'Sync problem',
  signedOut: 'Not signed in',
  off: '',
};

export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { available, user, status, error, signIn, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const s = useStyles(styles);
  if (!available) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Tap style={s.backdrop} onPress={onClose} accessibilityLabel="Close">
        <View />
      </Tap>
      <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={s.grabber} />

        {user ? (
          <>
            <View style={s.who}>
              {user.photo ? (
                <Image source={user.photo} style={s.bigAvatar} contentFit="cover" />
              ) : (
                <View style={[s.bigAvatar, s.avatarFallback]}>
                  <Ionicons name="person" size={22} color={c.lime} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Txt variant="h3" numberOfLines={1}>{user.name ?? 'Signed in'}</Txt>
                <Txt variant="small" color={c.textMute} numberOfLines={1}>{user.email}</Txt>
              </View>
            </View>

            <View style={s.statusRow}>
              <Ionicons
                name={status === 'synced' ? 'checkmark-circle' : status === 'error' ? 'alert-circle' : 'sync'}
                size={16}
                color={status === 'synced' ? c.mint : status === 'error' ? c.chili : c.textMute}
              />
              <Txt variant="smallMed" color={c.textSoft}>{STATUS_TEXT[status] ?? ''}</Txt>
            </View>
            {error ? <Txt variant="small" color={c.chili} style={{ marginTop: 8 }}>{error}</Txt> : null}

            <Txt variant="small" color={c.textMute} style={{ marginTop: 18 }}>
              Your saved recipes, shopping list and meal plan are backed up to your Google
              account, so they follow you to a new phone.
            </Txt>

            <Button label="Sign out" icon="log-out-outline" tone="ghost"
              style={{ marginTop: 20 }} onPress={() => { void signOut(); onClose(); }} />
            <Txt variant="small" color={c.textMute} style={{ textAlign: 'center', marginTop: 12 }}>
              Signing out leaves everything on this phone.
            </Txt>
          </>
        ) : (
          <>
            <View style={s.iconWrap}>
              <Ionicons name="cloud-upload-outline" size={26} color={c.lime} />
            </View>
            <Txt variant="h2" style={{ textAlign: 'center' }}>Keep your list safe</Txt>
            <Txt variant="body" color={c.textSoft} style={{ textAlign: 'center', marginTop: 10 }}>
              Sign in to back up your saved recipes, shopping list and meal plan — and pick
              them up on any other phone.
            </Txt>
            <Txt variant="small" color={c.textMute} style={{ textAlign: 'center', marginTop: 14 }}>
              Optional. Everything works without an account; nothing is shared, and we only
              ever store what you saved.
            </Txt>

            <Button label="Continue with Google" icon="logo-google"
              style={{ marginTop: 22 }} onPress={() => void signIn()} />
            {error ? (
              <Txt variant="small" color={c.chili} style={{ textAlign: 'center', marginTop: 12 }}>{error}</Txt>
            ) : null}
            <Tap onPress={onClose} style={{ paddingVertical: 14, marginTop: 4 }}>
              <Txt variant="smallMed" color={c.textMute} style={{ textAlign: 'center' }}>
                Not now
              </Txt>
            </Tap>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = (c: Colors) => ({
  avatarBtn: {
    width: 34, height: 34, borderRadius: 17, overflow: 'hidden' as const,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.hairline,
  },
  avatar: { width: '100%' as const, height: '100%' as const },
  dot: { position: 'absolute' as const, top: 2, right: 2, width: 7, height: 7, borderRadius: 4 },
  backdrop: { flex: 1, backgroundColor: c.scrim },
  sheet: {
    position: 'absolute' as const, left: 0, right: 0, bottom: 0,
    backgroundColor: c.surface, paddingHorizontal: 24, paddingTop: 10,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: c.hairlineStrong,
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong,
    alignSelf: 'center' as const, marginBottom: 20,
  },
  who: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
  bigAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.surfaceAlt },
  avatarFallback: { alignItems: 'center' as const, justifyContent: 'center' as const },
  statusRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, marginTop: 16 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, alignSelf: 'center' as const, marginBottom: 16,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: c.limeGlow, borderWidth: 1, borderColor: c.hairline,
  },
});
