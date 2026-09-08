import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Height of the floating tab bar, excluding the safe-area inset.
 *
 * The bar is `position: absolute`, so nothing below it reserves space and
 * every scrolling screen has to pad itself clear. Android 15 (targetSdk 35+)
 * forces edge-to-edge, which means the gesture pill sits *inside* the window
 * — a fixed pixel height would put the tab labels underneath it.
 */
export const TAB_BAR_BASE = Platform.OS === 'ios' ? 56 : 60;

/** Real on-screen height of the tab bar, gesture inset included. */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE + insets.bottom;
}

/**
 * Bottom padding for scroll content so the last row clears the tab bar.
 * `extra` is breathing room on top of the bar itself.
 */
export function useTabBarPadding(extra = 28): number {
  return useTabBarHeight() + extra;
}
