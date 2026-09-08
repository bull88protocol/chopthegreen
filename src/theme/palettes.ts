/**
 * Two palettes, one shape. Token *roles* stay identical across modes so
 * components never branch on the theme.
 *
 * Note the split between `lime` and `brand`:
 *   - `brand` is the literal brand lime and never changes. It's a *fill*
 *     colour for large surfaces, always paired with `onBrand` text.
 *   - `lime` is the accent used for small text and icons, so it has to stay
 *     legible: bright lime on near-black, a deeper green on off-white.
 * Bright lime as 13px text on white would be roughly 1.5:1 contrast, which is
 * unreadable — hence the two tokens.
 */

export const BRAND = '#C4F542';
export const ON_BRAND = '#0A0D0B';

const dark = {
  bg: '#0A0D0B',
  surface: '#121714',
  surfaceAlt: '#1A211D',
  elevated: '#212A25',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.14)',

  brand: BRAND,
  onBrand: ON_BRAND,
  lime: '#C4F542',
  limeDim: '#9BC72F',
  limeGlow: 'rgba(196,245,66,0.16)',
  amber: '#FFB454',
  chili: '#FF6B4A',
  mint: '#63E6BE',

  text: '#F4F7F2',
  textSoft: '#A9B3AC',
  textMute: '#6E7A73',
  onLime: ON_BRAND,

  scrim: 'rgba(10,13,11,0.72)',
  /** Solid bar fill for platforms without blur (Android, web).
   *  Opaque on purpose: a translucent fill lets card text ghost through and
   *  reads as a rendering fault rather than frosting. */
  barFill: '#101613',
  blurTint: 'dark' as 'dark' | 'light',
  statusBar: 'light' as 'light' | 'dark',
};

const light: typeof dark = {
  bg: '#FAFAF6',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3EC',
  elevated: '#E8EBE1',
  hairline: 'rgba(10,13,11,0.10)',
  hairlineStrong: 'rgba(10,13,11,0.18)',

  brand: BRAND,
  onBrand: ON_BRAND,
  lime: '#4F7D08',
  limeDim: '#3F6406',
  limeGlow: 'rgba(79,125,8,0.10)',
  amber: '#A65B00',
  chili: '#C2410C',
  mint: '#0F766E',

  text: '#101410',
  textSoft: '#4B554C',
  textMute: '#78827A',
  onLime: '#FFFFFF',

  scrim: 'rgba(16,20,16,0.45)',
  barFill: '#FFFFFF',
  blurTint: 'light',
  statusBar: 'dark',
};

export const palettes = { dark, light };
export type Mode = keyof typeof palettes;
export type Colors = typeof dark;
