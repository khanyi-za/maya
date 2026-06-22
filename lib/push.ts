// Expo push-token registration (docs/api/notifications.md). Best-effort and
// guarded: it no-ops on a simulator (no APNs), when permission is denied, or
// when no EAS projectId is configured — so it NEVER blocks the signed-in
// experience. Push DELIVERY is only verifiable on a physical device; the in-app
// inbox + emails work everywhere.

import { useEffect } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from './api-client';
import { useAuthStore } from './auth-store';

let registeredToken: string | null = null;

// Show pushes while the app is foregrounded. Cast keeps us version-agnostic
// across expo-notifications handler-shape changes (shouldShowAlert vs Banner).
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }) as any,
});

function resolveProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants.easConfig?.projectId as string | undefined)
  );
}

/** Acquire an Expo push token and register it with the backend. Idempotent. */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return; // simulators/emulators can't obtain a token

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId = resolveProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (!token) return;

    await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
    registeredToken = token;
  } catch {
    // Best-effort: denied permission, simulator, no projectId, or offline.
  }
}

/** Drop this device's token on sign-out so it stops receiving pushes. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await unregisterPushToken(token);
  } catch {
    // Best-effort.
  }
}

/** Register the device token whenever the session becomes authenticated. */
export function usePushRegistration(): void {
  const status = useAuthStore((s) => s.state.status);
  useEffect(() => {
    if (status === 'authenticated') void registerForPushNotifications();
  }, [status]);
}

/** Route a notification tap to the relevant order (data.orderId = maya order). */
export function usePushNotificationTaps(): void {
  const router = useRouter();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { orderId?: string }
        | undefined;
      if (data?.orderId) {
        router.push({ pathname: '/track-order', params: { orderId: data.orderId } });
      }
    });
    return () => sub.remove();
  }, [router]);
}
