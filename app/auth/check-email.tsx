import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{email ?? 'your email'}</Text>
          {'\n\n'}Tap the link on this device to activate your account.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={openMailApp}>
          <Text style={styles.primaryButtonText}>Open Mail App</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/auth/login')}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </TouchableOpacity>
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
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  email: {
    fontWeight: '600',
    color: '#000',
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
});
