import React, { useState } from 'react';
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
import { resetPassword } from '@/lib/auth';
import { ApiError } from '@/lib/api';

// Universal-link target: https://yiiva.co.za/auth/reset-password?token=...
// (docs/auth-mobile-guide.md §5.7). Success revokes all sessions; the user
// signs in again with the new password.
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!token) {
      setError('This reset link is invalid. Request a new one.');
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
    try {
      await resetPassword(token, password);
      router.replace({ pathname: '/auth/login', params: { banner: 'reset-success' } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && /invalid or expired/i.test(err.message)) {
          setError('This reset link has expired. Request a new one.');
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
      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24 }}>
        <Text variant="display" className="mb-3">Choose a new password</Text>
        <Text variant="body" className="mb-6 text-muted-foreground">
          At least 8 characters, with an uppercase letter, a lowercase letter
          and a number.
        </Text>

        {error && (
          <View className="mb-4 rounded-[10px] bg-danger-subtle p-3.5">
            <Text className="text-[14px] leading-[19px] text-danger">{error}</Text>
          </View>
        )}

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
          className="mt-2 mb-4"
          loading={submitting}
          onPress={handleSubmit}
        >
          {submitting ? 'Updating…' : 'Update Password'}
        </Button>

        <TouchableOpacity onPress={() => router.replace('/auth/forgot-password')}>
          <Text className="text-center text-brand font-medium">Request a new link</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
