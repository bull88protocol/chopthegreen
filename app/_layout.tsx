import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FirstSavePrompt } from '../src/components/FirstSavePrompt';
import { RecipesProvider } from '../src/store/recipes';
import { AuthProvider } from '../src/store/auth';
import { UserProvider } from '../src/store/user';
import { ThemeProvider, useTheme } from '../src/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Bricolage_600SemiBold: BricolageGrotesque_600SemiBold,
    Bricolage_700Bold: BricolageGrotesque_700Bold,
    Bricolage_800ExtraBold: BricolageGrotesque_800ExtraBold,
    Jakarta_400Regular: PlusJakartaSans_400Regular,
    Jakarta_500Medium: PlusJakartaSans_500Medium,
    Jakarta_600SemiBold: PlusJakartaSans_600SemiBold,
    Jakarta_700Bold: PlusJakartaSans_700Bold,
  });

  // Don't hold the splash hostage if a font fails to decode.
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RecipesProvider>
          <UserProvider>
            <AuthProvider>
              <Shell />
            </AuthProvider>
          </UserProvider>
        </RecipesProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

/** Inside ThemeProvider so the navigator and system chrome follow the palette. */
function Shell() {
  const { colors } = useTheme();

  // Keeps the OS window background in step, so theme switches don't flash.
  useEffect(() => { void SystemUI.setBackgroundColorAsync(colors.bg); }, [colors.bg]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen
          name="cook/[id]"
          options={{ animation: 'fade_from_bottom', gestureEnabled: false }}
        />
      </Stack>
      {/* Above the navigator so it reaches the recipe screen too, which is a
          sibling route rather than a child of the tabs. */}
      <FirstSavePrompt />
    </GestureHandlerRootView>
  );
}
