import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { radius, useColors, useStyles, useTheme, type Colors, type Scheme } from '../theme';
import { Tap } from './ui';

const OPTIONS: Array<{ id: Scheme; icon: keyof typeof Ionicons.glyphMap; hint: string }> = [
  { id: 'light', icon: 'sunny', hint: 'Light' },
  { id: 'dark', icon: 'moon', hint: 'Dark' },
  { id: 'system', icon: 'phone-portrait', hint: 'Auto' },
];

/** Three-way segmented control: light / dark / follow the phone. */
export function ThemeToggle() {
  const { scheme, setScheme } = useTheme();
  const c = useColors();
  const s = useStyles(styles);
  return (
    <View style={s.track}>
      {OPTIONS.map((o) => {
        const on = scheme === o.id;
        return (
          <Tap key={o.id} haptic="select" onPress={() => setScheme(o.id)}
            accessibilityLabel={`${o.hint} theme`}
            accessibilityState={{ selected: on }}
            style={[s.seg, on && { backgroundColor: c.brand }]}>
            <Ionicons name={o.icon} size={14} color={on ? c.onBrand : c.textMute} />
          </Tap>
        );
      })}
    </View>
  );
}

const styles = (c: Colors) => ({
  track: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, padding: 3,
    borderRadius: radius.pill, backgroundColor: c.surfaceAlt,
    borderWidth: 1, borderColor: c.hairline,
  },
  seg: {
    width: 32, height: 28, borderRadius: radius.pill,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
});
