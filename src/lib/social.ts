import { Ionicons } from '@expo/vector-icons';

/** Handles as published on chopthegreens.com. */
export const SOCIAL = [
  { id: 'youtube', label: 'YouTube', handle: '@ChopsTheGreens', url: 'https://www.youtube.com/@ChopsTheGreens', icon: 'logo-youtube', tint: '#FF0033' },
  { id: 'instagram', label: 'Instagram', handle: '@chopthegreens', url: 'https://www.instagram.com/chopthegreens/', icon: 'logo-instagram', tint: '#E1306C' },
  { id: 'pinterest', label: 'Pinterest', handle: 'Chopthegreens', url: 'https://www.pinterest.com/Chopthegreens/', icon: 'logo-pinterest', tint: '#E60023' },
  { id: 'tiktok', label: 'TikTok', handle: '@chopthegreens', url: 'https://www.tiktok.com/@chopthegreens', icon: 'logo-tiktok', tint: '#25F4EE' },
] as const satisfies ReadonlyArray<{
  id: string; label: string; handle: string; url: string;
  icon: keyof typeof Ionicons.glyphMap; tint: string;
}>;

export const SITE = 'https://chopthegreens.com';
