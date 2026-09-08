import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_BASE } from '../../src/lib/layout';
import { useUser } from '../../src/store/user';
import { font, useTheme } from '../../src/theme';

export default function TabLayout() {
  const { list } = useUser();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const unchecked = list.filter((i) => !i.checked).length;

  /**
   * Frosted bar that floats over content instead of boxing it in.
   * Only iOS gets the real blur: Android's is expensive and inconsistent
   * across OEM skins, and on web it renders as plain transparency, which
   * leaves the labels sitting unreadably on top of the content.
   */
  const TabBackground = () =>
    Platform.OS === 'ios' ? (
      <BlurView intensity={40} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
    ) : (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.barFill }]} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textMute,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.hairline,
          backgroundColor: 'transparent',
          elevation: 0,
          // Grow by the gesture inset rather than sitting under it.
          height: TAB_BAR_BASE + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarBackground: TabBackground,
        tabBarLabelStyle: { fontFamily: font.bodyMed, fontSize: 10.5, marginTop: 2 },
        tabBarBadgeStyle: {
          backgroundColor: colors.brand, color: colors.onBrand,
          fontFamily: font.bodyBold, fontSize: 10, minWidth: 17, height: 17, lineHeight: 13,
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Discover',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'compass' : 'compass-outline'} size={23} color={color} />),
      }} />
      <Tabs.Screen name="search" options={{
        title: 'Search',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />),
      }} />
      <Tabs.Screen name="plan" options={{
        title: 'Plan',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />),
      }} />
      <Tabs.Screen name="list" options={{
        title: 'List',
        tabBarBadge: unchecked || undefined,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'cart' : 'cart-outline'} size={23} color={color} />),
      }} />
      <Tabs.Screen name="saved" options={{
        title: 'Saved',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={21} color={color} />),
      }} />
    </Tabs>
  );
}
