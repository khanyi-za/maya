import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ email?: string; banner?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const successBanner =
    params.banner === 'reset-success'
      ? 'Password updated. Sign in with your new password.'
      : params.banner === 'claim-success'
        ? 'Your account is ready. Sign in to continue.'
        : params.banner === 'verify-success'
          ? 'Email verified. Sign in to continue.'
          : null;

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNeedsVerification(false);
    try {
      await login(email.trim().toLowerCase(), password);
      router.dismissTo('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Incorrect email or password.');
        } else if (err.status === 403 && /verify your email/i.test(err.message)) {
          setNeedsVerification(true);
        } else if (err.status === 429) {
          setError('Too many attempts. Wait a moment and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError("Couldn't reach YIIVA. Check your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: insets.top + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-4 h-10 w-10 justify-center">
          <IconSymbol name="chevron.left" size={26} color={colors.foreground} />
        </TouchableOpacity>

        <Text variant="display" className="mb-1.5">Sign in</Text>
        <Text variant="body" className="mb-7 text-muted-foreground">Welcome back to YIIVA</Text>

        {successBanner && (
          <View className="mb-4 rounded-[10px] bg-success-subtle p-3.5">
            <Text className="text-[14px] leading-[19px] text-success">{successBanner}</Text>
          </View>
        )}

        {error && (
          <View className="mb-4 rounded-[10px] bg-danger-subtle p-3.5">
            <Text className="text-[14px] leading-[19px] text-danger">{error}</Text>
          </View>
        )}

        {needsVerification ? (
          <View className="mb-4 rounded-xl bg-muted p-5">
            <Text variant="heading" className="mb-2">Verify your email first</Text>
            <Text variant="body" className="text-muted-foreground">
              We sent a verification link to {email.trim()}. Tap it on this device
              to activate your account, then sign in.
            </Text>
          </View>
        ) : (
          <>
            <Input
              className="mb-3"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Input
              className="mb-3"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            <Button
              variant="brand"
              className="mt-2 mb-4"
              loading={submitting}
              onPress={handleSubmit}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </Button>

            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
              <Text className="text-center text-brand font-medium">Forgot your password?</Text>
            </TouchableOpacity>
          </>
        )}

        <View className="mt-8 flex-row justify-center">
          <Text variant="body" className="text-muted-foreground">New to YIIVA? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/register')}>
            <Text className="text-brand font-medium">Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
