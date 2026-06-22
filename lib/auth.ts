// Auth actions + lifecycle hooks (docs/auth-mobile-guide.md §5, §9).
// Screens call these; they own the SecureStore + Zustand transitions.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  api,
  ensureFreshAccessToken,
  isJwtExpired,
  type AuthTokensResponse,
} from './api';
import { useAuthStore } from './auth-store';
import {
  loadRefreshToken,
  saveRefreshToken,
  clearRefreshToken,
} from './secure-storage';
import { unregisterPushNotifications } from './push';

export interface RegisterFields {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/** POST /auth/register — no tokens returned; user must verify email first. */
export async function register(fields: RegisterFields): Promise<void> {
  await api('/auth/register', { method: 'POST', auth: 'none', body: fields });
}

/** POST /auth/login — stores the session on success. */
export async function login(email: string, password: string): Promise<void> {
  const res = await api<AuthTokensResponse>('/auth/login', {
    method: 'POST',
    auth: 'none',
    body: { email, password },
  });
  await saveRefreshToken(res.refreshToken);
  useAuthStore.getState().setAuthenticated(res.user, res.accessToken);
}

/** POST /auth/verify-email — auto-login on success. */
export async function verifyEmail(token: string): Promise<void> {
  const res = await api<AuthTokensResponse>('/auth/verify-email', {
    method: 'POST',
    auth: 'none',
    body: { token },
  });
  await saveRefreshToken(res.refreshToken);
  useAuthStore.getState().setAuthenticated(res.user, res.accessToken);
}

/** Optimistic logout — local state clears instantly, API fires best-effort. */
export async function logout(): Promise<void> {
  const refresh = await loadRefreshToken();

  // Drop the push token while still authenticated (the DELETE needs the token).
  await unregisterPushNotifications();

  await clearRefreshToken();
  useAuthStore.getState().setGuest();

  if (refresh) {
    void api('/auth/logout', {
      method: 'POST',
      body: { refreshToken: refresh },
    }).catch((err) => {
      console.warn('[auth] background logout failed', err);
    });
  }
}

/** POST /auth/forgot-password — always 200s (never reveals registration). */
export async function forgotPassword(email: string): Promise<void> {
  await api('/auth/forgot-password', {
    method: 'POST',
    auth: 'none',
    body: { email },
  });
}

/** POST /auth/reset-password — revokes all sessions; does NOT auto-login. */
export async function resetPassword(token: string, password: string): Promise<void> {
  await api('/auth/reset-password', {
    method: 'POST',
    auth: 'none',
    body: { token, password },
  });
}

/** POST /auth/claim — guest checkout account → real account. No auto-login. */
export async function claimAccount(email: string, password: string): Promise<void> {
  await api('/auth/claim', {
    method: 'POST',
    auth: 'none',
    body: { email, password },
  });
}

// ── Lifecycle (guide §5.1, §9) ──

/** Cold-start hydration: refresh-token round-trip before protected UI renders. */
export function useAuthHydration() {
  useEffect(() => {
    void hydrate();
  }, []);
}

async function hydrate() {
  const { setGuest, setLoading } = useAuthStore.getState();
  setLoading();

  const refresh = await loadRefreshToken();
  if (!refresh) {
    setGuest();
    return;
  }

  try {
    // Goes through the single-flight guard — an early /api request's optional
    // auth header may already be refreshing, and two parallel refreshes would
    // revoke each other (single-use rotation).
    await ensureFreshAccessToken();
  } catch {
    // 401 paths already cleared the session; on network errors fall back to
    // guest so the UI never hangs on 'loading'.
    if (useAuthStore.getState().state.status === 'loading') setGuest();
  }
}

/** Foreground refresh: renew a stale access token when the app reactivates. */
export function useForegroundRefresh() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void maybeRefreshOnForeground();
      }
    });
    return () => sub.remove();
  }, []);
}

async function maybeRefreshOnForeground() {
  const { state } = useAuthStore.getState();
  if (state.status !== 'authenticated') return;
  if (!isJwtExpired(state.accessToken)) return;

  try {
    await ensureFreshAccessToken();
  } catch {
    // Refresh failed — ensureFreshAccessToken already cleared the session.
  }
}
