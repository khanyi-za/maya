// Refresh-token persistence (docs/auth-mobile-guide.md §1).
// The refresh token is the ONLY persisted credential and it lives only here:
// iOS Keychain / Android EncryptedSharedPreferences. Never AsyncStorage.

import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'yiiva.refreshToken';

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function loadRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
