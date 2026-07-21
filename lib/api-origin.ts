import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Single source of truth for the backend origin (REST /api surface, auth
 * endpoints, and the socket.io /chat namespace all build on this).
 *
 * Resolution order:
 * 1. EXPO_PUBLIC_API_URL — explicit full-origin override. Only needed for
 *    special cases now (e.g. an ngrok tunnel, or pointing a device at a
 *    backend that is NOT on the machine running Metro).
 * 2. Metro's own host (Constants.expoConfig.hostUri) + EXPO_PUBLIC_API_PORT.
 *    If this device can load the JS bundle, it can reach the same machine's
 *    backend on any network — home wifi, hotspot, cafe — with zero .env
 *    edits. This is what fixes the "content loads at home but not on other
 *    networks" failure: the old setup hardcoded the home LAN IP.
 * 3. Platform default (iOS simulator localhost / Android emulator 10.0.2.2).
 *    hostUri is undefined in production builds — those must set
 *    EXPO_PUBLIC_API_URL to the real API origin.
 *
 * EXPO_PUBLIC_* vars are baked in at bundle time — restart Metro with
 * `expo start -c` after changing .env.
 */
const BACKEND_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '3000';

function metroHost(): string | null {
  // e.g. "192.168.10.18:8081" on a device, "localhost:8081" on a simulator —
  // whatever host this device already reaches Metro on.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host || null;
}

export const API_ORIGIN: string = (() => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = metroHost();
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${BACKEND_PORT}`;
  }
  // localhost hostUri (or none): the Android emulator can't reach the host
  // machine's localhost directly — it needs the 10.0.2.2 alias.
  return Platform.select({
    android: `http://10.0.2.2:${BACKEND_PORT}`,
    default: `http://localhost:${BACKEND_PORT}`,
  });
})();
