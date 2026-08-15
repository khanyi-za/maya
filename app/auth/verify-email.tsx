import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { resendVerification, verifyEmail } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const RESEND_COOLDOWN_S = 60;

// 6-digit code entry after registration (or from the login "verify first"
// prompt). Auto-logs the user in on success. `sent=1` means a code was just
// emailed (register flow) so the resend cooldown starts full; without it the
// resend button is available immediately.
export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { email, sent } = useLocalSearchParams<{ email?: string; sent?: string }>();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(sent === '1' ? RESEND_COOLDOWN_S : 0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleSubmit = async () => {
    if (!email) {
      router.replace('/auth/login');
      return;
    }
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await verifyEmail(email, code);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && /invalid or expired/i.test(err.message)) {
          setError('That code is invalid or has expired. Request a new one below.');
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

  const handleResend = async () => {
    if (!email) return;
    setError(null);
    setNotice(null);
    try {
      await resendVerification(email);
      setCode('');
      setResendIn(RESEND_COOLDOWN_S);
      setNotice('If your account is unverified, a new code is on its way.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts. Wait a moment and try again.');
      } else {
        setError("Couldn't reach YIIVA. Check your connection.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
        <Text variant="display" className="mb-3">
          Check your email
        </Text>
        <Text variant="body" className="mb-6 text-muted-foreground">
          Enter the 6-digit code we sent to{' '}
          <Text variant="label" className="text-foreground">
            {email ?? 'your email'}
          </Text>{' '}
          to activate your account. Codes expire after 10 minutes.
        </Text>

        {error && (
          <View className="mb-4 rounded-[10px] bg-danger-subtle p-3.5">
            <Text className="text-[14px] leading-[19px] text-danger">{error}</Text>
          </View>
        )}
        {notice && (
          <View className="mb-4 rounded-[10px] bg-info-subtle p-3.5">
            <Text className="text-[14px] leading-[19px] text-foreground">{notice}</Text>
          </View>
        )}

        <Input
          className="mb-4"
          placeholder="000000"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          error={!!error}
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: '600' }}
        />

        <Button
          variant="brand"
          className="mb-5"
          loading={submitting}
          disabled={code.length !== 6}
          onPress={handleSubmit}
        >
          {submitting ? 'Verifying…' : 'Verify Email'}
        </Button>

        {resendIn > 0 ? (
          <Text variant="caption" className="text-center text-muted-foreground">
            Didn&apos;t get it? Resend available in {resendIn}s
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text variant="caption" className="text-center text-brand underline">
              Resend code
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity className="mt-5" onPress={() => router.replace('/auth/login')}>
          <Text variant="caption" className="text-center text-brand underline">
            Back to sign in
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
