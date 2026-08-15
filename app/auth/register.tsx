import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { register } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { track } from '@/lib/analytics';

// Mirrors the backend rule: min 8 chars with uppercase, lowercase, and a digit.
function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password needs an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password needs a lowercase letter.';
  if (!/\d/.test(password)) return 'Password needs a number.';
  return null;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Fill in all required fields.');
      return;
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      setError(pwProblem);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await register({
        email: cleanEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      track('sign_up_submitted');
      router.replace({ pathname: '/auth/verify-email', params: { email: cleanEmail, sent: '1' } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('This email is already registered. Try signing in instead.');
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

        <Text variant="display" className="mb-1.5">Create your account</Text>
        <Text variant="body" className="mb-7 text-muted-foreground">
          Shop South Africa&apos;s creative brands
        </Text>

        {error && (
          <View className="mb-4 rounded-[10px] bg-danger-subtle p-3.5">
            <Text className="text-[14px] leading-[19px] text-danger">{error}</Text>
          </View>
        )}

        <View className="flex-row gap-3">
          <Input
            className="mb-3 flex-1"
            placeholder="First name"
            value={firstName}
            onChangeText={setFirstName}
            textContentType="givenName"
          />
          <Input
            className="mb-3 flex-1"
            placeholder="Last name"
            value={lastName}
            onChangeText={setLastName}
            textContentType="familyName"
          />
        </View>
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
          placeholder="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
        <Input
          className="mb-3"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />
        <Text variant="caption" className="mb-3">
          At least 8 characters, with an uppercase letter, a lowercase letter and
          a number.
        </Text>

        <Button
          variant="brand"
          className="mt-2"
          loading={submitting}
          onPress={handleSubmit}
        >
          {submitting ? 'Creating account…' : 'Create Account'}
        </Button>

        <View className="mt-8 flex-row justify-center">
          <Text variant="body" className="text-muted-foreground">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text className="text-brand font-medium">Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
