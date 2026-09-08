/**
 * Chop the Greens — design tokens.
 *
 * Colours are theme-dependent and come from `useTheme()` / `useStyles()`.
 * Everything exported directly here (type ramp, radii, spacing) is
 * theme-independent.
 */
export { palettes, BRAND, ON_BRAND, type Colors, type Mode } from './palettes';
export { ThemeProvider, useTheme, useColors, useStyles, type Scheme } from './ThemeProvider';

export const font = {
  display: 'Bricolage_800ExtraBold',
  displayBold: 'Bricolage_700Bold',
  displayMed: 'Bricolage_600SemiBold',
  body: 'Jakarta_400Regular',
  bodyMed: 'Jakarta_500Medium',
  bodySemi: 'Jakarta_600SemiBold',
  bodyBold: 'Jakarta_700Bold',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, xl: 30, pill: 999 } as const;

export const space = (n: number) => n * 4;

/** Type ramp. Display sizes get negative tracking; small caps get positive. */
export const type = {
  hero: { fontFamily: font.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.4 },
  h1: { fontFamily: font.display, fontSize: 30, lineHeight: 33, letterSpacing: -1 },
  h2: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  h3: { fontFamily: font.displayMed, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 23 },
  bodyMed: { fontFamily: font.bodyMed, fontSize: 15, lineHeight: 23 },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 19 },
  smallMed: { fontFamily: font.bodyMed, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: font.bodySemi, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' as const },
  num: { fontFamily: font.displayBold, fontSize: 19, letterSpacing: -0.4 },
} as const;

/** Photo scrims stay dark in both themes — white text sits on them. */
export const PHOTO_SCRIM = {
  soft: 'rgba(10,13,11,0.42)',
  hard: 'rgba(10,13,11,0.95)',
  clear: 'rgba(10,13,11,0)',
  chipBg: 'rgba(10,13,11,0.55)',
  chipBorder: 'rgba(255,255,255,0.14)',
  onPhoto: '#F4F7F2',
} as const;

export const shadow = {
  card: {
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  lift: {
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 }, elevation: 14,
  },
} as const;
