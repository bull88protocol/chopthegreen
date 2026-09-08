import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet, useColorScheme,
  type ImageStyle, type TextStyle, type ViewStyle,
} from 'react-native';
import { palettes, type Colors, type Mode } from './palettes';

/** What the user picked. 'system' follows the phone's own setting. */
export type Scheme = 'system' | 'light' | 'dark';
const KEY = 'ctg.theme.v1';

type Value = {
  colors: Colors;
  mode: Mode;
  scheme: Scheme;
  setScheme: (s: Scheme) => void;
  /** Cycles light -> dark -> system, for a single-tap control. */
  cycle: () => void;
};

const Ctx = createContext<Value | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [scheme, setSchemeState] = useState<Scheme>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') setSchemeState(saved);
      } catch {
        // Fall back to system; not worth failing a launch over.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setScheme = useCallback((s: Scheme) => {
    setSchemeState(s);
    if (hydrated) void AsyncStorage.setItem(KEY, s).catch(() => {});
  }, [hydrated]);

  const cycle = useCallback(() => {
    setScheme(scheme === 'light' ? 'dark' : scheme === 'dark' ? 'system' : 'light');
  }, [scheme, setScheme]);

  const mode: Mode = scheme === 'system' ? (system === 'light' ? 'light' : 'dark') : scheme;

  const value = useMemo<Value>(
    () => ({ colors: palettes[mode], mode, scheme, setScheme, cycle }),
    [mode, scheme, setScheme, cycle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}

/** Convenience: just the palette. */
export const useColors = (): Colors => useTheme().colors;

/**
 * Build a themed StyleSheet. The factory re-runs only when the palette
 * changes, so styles are still created once per theme rather than per render.
 *
 * The constraint is deliberately loose. `StyleSheet.NamedStyles<T>` can't
 * contextually type a factory's object literal, so every `flexDirection: 'row'`
 * would widen to `string` and fail unless annotated `as const` at each site —
 * noisy, and easy to get wrong. Keys stay typed, so `s.missing` is still an
 * error; only individual style *values* fall back to RN's runtime validation.
 */
type AnyStyle = ViewStyle & TextStyle & ImageStyle;

export function useStyles<T extends Record<string, unknown>>(
  factory: (c: Colors) => T,
): { [K in keyof T]: AnyStyle } {
  const { colors } = useTheme();
  // factory is intentionally not a dependency: callers define it at module
  // scope, so it's stable, and including it would rebuild every render for
  // any caller that inlines one.
  return useMemo(() => StyleSheet.create(factory(colors) as any) as any, [colors]);
}
