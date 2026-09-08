import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, type TextProps, View, type ViewProps,
} from 'react-native';
import { radius, type as T, useColors, useStyles, type Colors } from '../theme';

export function Txt({ style, variant = 'body', color, ...rest }:
  TextProps & { variant?: keyof typeof T; color?: string }) {
  const c = useColors();
  return <Text {...rest} style={[T[variant], { color: color ?? c.text }, style]} />;
}

/** Small section heading with a lime tick. */
export function SectionTitle({ title, action, onAction }:
  { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <View style={s.sectionRow}>
      <View style={s.sectionLeft}>
        <View style={s.tick} />
        <Txt variant="h2">{title}</Txt>
      </View>
      {action ? (
        <Tap onPress={onAction} hitSlop={10}>
          <Txt variant="smallMed" color={c.lime}>{action}</Txt>
        </Tap>
      ) : null}
    </View>
  );
}

/** Pressable with a subtle scale + optional haptic. */
export function Tap({ children, style, haptic, onPress, ...rest }:
  React.ComponentProps<typeof Pressable> & { haptic?: 'light' | 'medium' | 'select' }) {
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') {
          if (haptic === 'select') void Haptics.selectionAsync();
          else void Haptics.impactAsync(
            haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          );
        }
        onPress?.(e);
      }}
      style={(state) => [
        { opacity: state.pressed ? 0.72 : 1, transform: [{ scale: state.pressed ? 0.985 : 1 }] },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, small }:
  { label: string; active?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap; small?: boolean }) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <Tap onPress={onPress} haptic="select" style={[
      s.chip,
      small && s.chipSmall,
      active && { backgroundColor: c.lime, borderColor: c.lime },
    ]}>
      {icon ? (
        <Ionicons name={icon} size={small ? 12 : 14} color={active ? c.onLime : c.textSoft} />
      ) : null}
      <Txt variant={small ? 'small' : 'smallMed'} color={active ? c.onLime : c.textSoft}>
        {label}
      </Txt>
    </Tap>
  );
}

/** Filled call-to-action. Primary keeps the brand lime in both themes. */
export function Button({ label, icon, onPress, tone = 'primary', style, disabled }: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'primary' | 'ghost' | 'danger';
  style?: ViewProps['style'];
  disabled?: boolean;
}) {
  const c = useColors();
  const s = useStyles(styles);
  const bg = tone === 'primary' ? c.brand : tone === 'danger' ? 'rgba(255,107,74,0.14)' : c.surfaceAlt;
  const fg = tone === 'primary' ? c.onBrand : tone === 'danger' ? c.chili : c.text;
  return (
    <Tap onPress={onPress} disabled={disabled} haptic="medium"
      style={[s.button, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }, style]}>
      {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
      <Txt variant="bodyMed" color={fg}>{label}</Txt>
    </Tap>
  );
}

export function Stars({ value, count, size = 12 }: { value: number; count?: number; size?: number }) {
  const c = useColors();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ionicons
          key={i}
          name={value >= i + 0.75 ? 'star' : value >= i + 0.25 ? 'star-half' : 'star-outline'}
          size={size}
          color={c.amber}
        />
      ))}
      {count ? <Txt variant="small" color={c.textMute} style={{ marginLeft: 4 }}>({count})</Txt> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <View style={s.center}>
      <ActivityIndicator color={c.lime} />
      {label ? <Txt variant="small" color={c.textMute} style={{ marginTop: 12 }}>{label}</Txt> : null}
    </View>
  );
}

export function Empty({ icon = 'leaf-outline', title, body, action }: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <View style={s.center}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={26} color={c.limeDim} />
      </View>
      <Txt variant="h2" style={{ textAlign: 'center' }}>{title}</Txt>
      {body ? (
        <Txt variant="body" color={c.textMute} style={{ textAlign: 'center', marginTop: 8, maxWidth: 300 }}>
          {body}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: 20 }}>{action}</View> : null}
    </View>
  );
}

const styles = (c: Colors) => ({
  sectionRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const, paddingHorizontal: 20, marginBottom: 14,
  },
  sectionLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  tick: { width: 4, height: 18, borderRadius: 2, backgroundColor: c.lime },
  chip: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.pill, backgroundColor: c.surfaceAlt,
    borderWidth: 1, borderColor: c.hairline,
  },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 6 },
  button: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 8, paddingVertical: 15, paddingHorizontal: 20, borderRadius: radius.pill,
  },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 32 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, marginBottom: 16,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: c.limeGlow, borderWidth: 1, borderColor: c.hairline,
  },
});
