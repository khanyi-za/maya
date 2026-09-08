import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useThemeColors } from '@/lib/theme';
import { deleteAccount } from '@/lib/auth';
import { APIError } from '@/lib/api-client';
import { ApiError } from '@/lib/api';

/**
 * Permanent account deletion (App Store requirement). Two safeguards:
 * password re-entry (a valid session alone must not be able to destroy the
 * account) and a final native confirm. Server refuses deletion for store
 * owners and while orders are in flight — those errors surface inline with
 * the server's own explanation. On success the local session is already
 * cleared by lib/auth.deleteAccount; we route home and say goodbye.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const runDelete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteAccount(password);
      router.dismissAll();
      router.replace('/');
      Alert.alert('Account deleted', 'Your account and personal data have been removed.');
    } catch (err) {
      if (err instanceof APIError || err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't reach YIIVA. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = () => {
    if (!password) {
      setError('Enter your password to continue.');
      return;
    }
    Alert.alert(
      'Delete your account?',
      'This is permanent. Your profile, saved addresses, wishlist and notifications will be removed and you will be signed out everywhere.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: () => void runDelete() },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: insets.top + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-4 h-10 w-10 justify-center">
          <IconSymbol name="chevron.left" size={26} color={colors.foreground} />
        </TouchableOpacity>

        <Text variant="display" className="mb-1.5">
          Delete account
        </Text>
        <Text variant="body" className="mb-7 text-muted-foreground">
          This permanently removes your YIIVA account. It can't be undone.
        </Text>

        <View className="mb-6 rounded-xl bg-muted p-5">
          <Text variant="heading" className="mb-2">
            What happens
          </Text>
          <Text variant="body" className="mb-1.5 text-muted-foreground">
            • Your profile and personal details are erased
          </Text>
          <Text variant="body" className="mb-1.5 text-muted-foreground">
            • Saved addresses, wishlist and notifications are removed
          </Text>
          <Text variant="body" className="mb-1.5 text-muted-foreground">
            • You're signed out on every device
          </Text>
          <Text variant="body" className="text-muted-foreground">
            • Records of completed purchases are kept, without your personal details, as
            required for financial record-keeping
          </Text>
        </View>

        {error && (
          <View className="mb-4 rounded-[10px] bg-danger-subtle p-3.5">
            <Text className="text-[14px] leading-[19px] text-danger">{error}</Text>
          </View>
        )}

        <Text variant="caption" className="mb-1.5">
          Confirm your password
        </Text>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          placeholder="Password"
        />

        <Button
          variant="outline"
          className="mt-6 border-danger"
          textClassName="text-danger"
          loading={submitting}
          onPress={confirmDelete}
        >
          Delete my account
        </Button>

        <Button variant="ghost" className="mt-3" onPress={() => router.back()}>
          Cancel
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
