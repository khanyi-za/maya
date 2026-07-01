import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { forgotPassword } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email.trim().toLowerCase());
      // Always succeeds whether or not the email exists (security).
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts. Wait a moment and try again.');
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
        <TouchableOpacity onPress={() => router.back()} className="mb-4 h-10 w-10 justify-center">
          <IconSymbol name="chevron.left" size={26} color={colors.foreground} />
        </TouchableOpacity>

        {sent ? (
          <>
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
              <IconSymbol name="checkmark.circle.fill" size={44} color={colors.success} />
            </View>
            <Text variant="display" className="mb-3">Check your inbox</Text>
            <Text variant="body" className="mb-6 text-muted-foreground">
              If an account exists for {email.trim()}, we&apos;ve sent a link to
              reset your password. The link is valid for one hour.
            </Text>
            <Button variant="brand" onPress={() => router.replace('/auth/login')}>
              Back to Sign In
            </Button>
          </>
        ) : (
          <>
            <Text variant="display" className="mb-3">Reset your password</Text>
            <Text variant="body" className="mb-6 text-muted-foreground">
              Enter the email you signed up with and we&apos;ll send you a reset
              link.
            </Text>

            {error && (
              <View className="mb-4 rounded-[10px] bg-danger-subtle p-3.5">
                <Text className="text-[14px] leading-[19px] text-danger">{error}</Text>
              </View>
            )}

            <Input
              className="mb-4"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              error={!!error}
            />

            <Button
              variant="brand"
              loading={submitting}
              onPress={handleSubmit}
            >
              {submitting ? 'Sending…' : 'Send Reset Link'}
            </Button>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
