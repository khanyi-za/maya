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
import { forgotPassword, resetPassword } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const RESEND_COOLDOWN_S = 60;

// Second step of the reset flow: the 6-digit code from the email + the new
// password. Arrives from forgot-password with the email as a param (a code
// was just sent, so the resend cooldown starts full). Success revokes all
// sessions; the user signs in again with the new password.
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleSubmit = async () => {
    if (!email) {
      router.replace('/auth/forgot-password');
      return;
    }
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await resetPassword(email, code, password);
      router.replace({ pathname: '/auth/login', params: { banner: 'reset-success' } });
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
      await forgotPassword(email);
      setCode('');
      setResendIn(RESEND_COOLDOWN_S);
      setNotice('If an account with that email exists, a new code is on its way.');
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
        <Text variant="display" className="mb-3">Choose a new password</Text>
        <Text variant="body" className="mb-6 text-muted-foreground">
          Enter the 6-digit code we sent to{' '}
          <Text variant="label" className="text-foreground">
            {email ?? 'your email'}
          </Text>{' '}
          and your new password. Codes expire after 10 minutes.
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
          className="mb-3"
          placeholder="000000"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          error={!!error}
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: '600' }}
        />
        <Input
          className="mb-3"
          placeholder="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          error={!!error}
        />
        <Input
          className="mb-3"
          placeholder="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          textContentType="newPassword"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          error={!!error}
        />

        <Button
          variant="brand"
          className="mt-2 mb-5"
          loading={submitting}
          onPress={handleSubmit}
        >
          {submitting ? 'Updating…' : 'Update Password'}
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
      </View>
    </KeyboardAvoidingView>
  );
}
