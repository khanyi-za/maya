import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';

import { Splash } from '@/components/Splash';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FilterProvider } from '@/contexts/FilterContext';
import { useSocialStore } from '@/lib/social-store';
import { useAuthHydration, useForegroundRefresh } from '@/lib/auth';
import { usePushNotificationTaps, usePushRegistration } from '@/lib/push';
import { posthog, useScreenTracking } from '@/lib/analytics';

// Keep the native splash up until the branded JS splash (components/Splash)
// has rendered — it hides the native one itself on first layout.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Create QueryClient instance with mobile-optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes (no unnecessary refetches)
      staleTime: 5 * 60 * 1000,

      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,

      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch when user returns to app (important for mobile!)
      refetchOnWindowFocus: true,

      // Don't refetch on reconnect (we'll handle this manually if needed)
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const loadSocialState = useSocialStore((state) => state.loadState);
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  // Auth session: cold-start refresh-token hydration + foreground token renewal
  // (docs/auth-mobile-guide.md §5.1, §9).
  useAuthHydration();
  useForegroundRefresh();

  // Register the Expo push token once authenticated; route notification taps.
  usePushRegistration();
  usePushNotificationTaps();

  // PostHog screen events per route change (no-op when no API key).
  useScreenTracking();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Load persisted state on app start
  useEffect(() => {
    loadSocialState();
  }, [loadSocialState]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  const content = (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="product/[productId]" options={{ headerShown: false }} />
            {/* Brand collection/category explorer — slides up over the
                profile. Deliberately NOT presentation:'fullScreenModal':
                card screens pushed from inside a native modal (product
                detail, artist link) stack invisibly BEHIND it, and back()
                then pops those ghosts instead of closing the sheet. A card
                screen with a bottom slide keeps the sheet feel without the
                modal presentation context. */}
            <Stack.Screen
              name="merchant-browse"
              options={{ headerShown: false, animation: 'slide_from_bottom' }}
            />
            {/* New Arrivals "See All" — same slide-up-sheet treatment (and the
                same no-fullScreenModal rule) as merchant-browse. */}
            <Stack.Screen
              name="new-arrivals"
              options={{ headerShown: false, animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </FilterProvider>
    </QueryClientProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {posthog ? (
        <PostHogProvider client={posthog}>{content}</PostHogProvider>
      ) : (
        content
      )}
      {!splashDone && <Splash onDone={handleSplashDone} />}
    </GestureHandlerRootView>
  );
}
