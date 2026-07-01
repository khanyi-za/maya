import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/lib/theme';
import { verifyEmail } from '@/lib/auth';

// Universal-link target: https://yiiva.co.za/auth/verify-email?token=...
// (docs/auth-mobile-guide.md §5.3). Auto-logs the user in on success.
export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<'verifying' | 'error'>('verifying');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    verifyEmail(token)
      .then(() => router.replace('/(tabs)'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 24 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center gap-4 px-8 pb-20">
        {state === 'verifying' ? (
          <>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text variant="title" className="text-center">
              Verifying your email…
            </Text>
          </>
        ) : (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-danger-subtle">
              <Text className="text-danger" style={{ fontSize: 36, fontWeight: '700' }}>
                !
              </Text>
            </View>
            <Text variant="title" className="text-center">
              This link didn&apos;t work
            </Text>
            <Text variant="body" className="text-center text-muted-foreground">
              The verification link is invalid or has expired. Links are valid
              for 24 hours — try registering again to get a fresh one.
            </Text>
            <Button
              variant="brand"
              className="mt-2 px-12"
              onPress={() => router.replace('/auth/login')}
            >
              Back to Sign In
            </Button>
          </>
        )}
      </View>
    </View>
  );
}
