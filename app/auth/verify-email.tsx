import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyEmail } from '@/lib/auth';

// Universal-link target: https://yiiva.co.za/auth/verify-email?token=...
// (docs/auth-mobile-guide.md §5.3). Auto-logs the user in on success.
export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        {state === 'verifying' ? (
          <>
            <ActivityIndicator size="large" color="#333" />
            <Text style={styles.title}>Verifying your email…</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>This link didn&apos;t work</Text>
            <Text style={styles.body}>
              The verification link is invalid or has expired. Links are valid
              for 24 hours — try registering again to get a fresh one.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
