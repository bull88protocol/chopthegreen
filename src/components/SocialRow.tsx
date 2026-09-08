import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { SOCIAL } from '../lib/social';
import { radius, useColors, useStyles, type Colors } from '../theme';
import { Tap, Txt } from './ui';

/**
 * Sits at the very bottom of Discover — reachable for anyone who wants it,
 * never in the way of someone who just wants to cook.
 */
export function SocialRow() {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <View style={s.wrap}>
      <Txt variant="label" color={c.textMute} style={{ marginBottom: 14 }}>Follow along</Txt>
      <View style={s.row}>
        {SOCIAL.map((n) => (
          <Tap key={n.id} haptic="light" style={s.btn}
            onPress={() => void WebBrowser.openBrowserAsync(n.url).catch(() => {})}>
            <Ionicons name={n.icon} size={20} color={n.tint} />
            <Txt variant="small" color={c.textSoft} style={{ fontSize: 11 }}>{n.label}</Txt>
          </Tap>
        ))}
      </View>
      <Txt variant="small" color={c.textMute} style={{ textAlign: 'center', marginTop: 18 }}>
        Recipes by Gari · chopthegreens.com
      </Txt>
    </View>
  );
}

const styles = (c: Colors) => ({
  wrap: { marginTop: 44, paddingHorizontal: 20, alignItems: 'center' as const },
  row: { flexDirection: 'row' as const, gap: 10, justifyContent: 'center' as const, flexWrap: 'wrap' as const },
  btn: {
    alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6,
    width: 74, paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline,
  },
});
