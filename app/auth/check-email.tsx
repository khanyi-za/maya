import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

export default function CheckEmailScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const openMailApp = async () => {
    try {
      await Linking.openURL('message://'); // iOS Mail
    } catch {
      try {
        await Linking.openURL('mailto:'); // Android fallback
      } catch {
        // No mail app — nothing to do.
      }
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 24 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center px-8 pb-20">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-info-subtle">
          <Text style={{ fontSize: 40 }}>📬</Text>
        </View>
        <Text variant="title" className="mb-4 text-center">
          Check your inbox
        </Text>
        <Text variant="body" className="mb-8 text-center text-muted-foreground">
          We sent a verification link to{'\n'}
          <Text variant="label" className="text-foreground">
            {email ?? 'your email'}
          </Text>
          {'\n\n'}Tap the link on this device to activate your account.
        </Text>

        <Button variant="brand" className="mb-5 px-12" onPress={openMailApp}>
          Open Mail App
        </Button>

        <TouchableOpacity onPress={() => router.replace('/auth/login')}>
          <Text variant="caption" className="text-brand underline">
            Back to sign in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
