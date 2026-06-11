// Authenticated HTTP wrapper for the auth surface and any non-/api endpoint
// (docs/auth-mobile-guide.md §3). Attaches Authorization, refreshes silently
// (single-flight), and distinguishes the four 401 variants.
//
// The /api (mobile envelope) endpoints keep using lib/api-client.ts — it pulls
// its optional auth header from getOptionalAuthHeader() below.

import { Platform } from 'react-native';
import { useAuthStore, type AuthUser } from './auth-store';
import {
  loadRefreshToken,
  saveRefreshToken,
  clearRefreshToken,
} from './secure-storage';

/** Auth endpoints live at the server root (no /api prefix). */
export const AUTH_BASE = Platform.select({
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class UnauthenticatedError extends Error {}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Single-flight guard for refresh. If two requests both need a refresh
 * simultaneously, the second waits on the first's promise instead of firing
 * its own (which would consume + revoke the same single-use refresh token).
 */
let refreshInFlight: Promise<string> | null = null;

export async function ensureFreshAccessToken(): Promise<string> {
  const stored = useAuthStore.getState().state;
  if (stored.status === 'authenticated' && !isJwtExpired(stored.accessToken)) {
    return stored.accessToken;
  }
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = await loadRefreshToken();
    if (!refresh) throw new UnauthenticatedError();
    const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) {
      await clearRefreshToken();
      useAuthStore.getState().setGuest();
      throw new UnauthenticatedError();
    }
    const data: AuthTokensResponse = await res.json();
    // Rotation is atomic: persist the NEW refresh token before anyone can
    // consume the response — the old one is already revoked server-side.
    await saveRefreshToken(data.refreshToken);
    useAuthStore.getState().setAuthenticated(data.user, data.accessToken);
    return data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Best-effort Authorization header for auth-optional endpoints (the /api
 * surface's personalised fields). Returns {} when signed out or refresh fails.
 */
export async function getOptionalAuthHeader(): Promise<Record<string, string>> {
  const stored = useAuthStore.getState().state;
  if (stored.status === 'guest') return {};
  try {
    const token = await ensureFreshAccessToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export function isJwtExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(decodeBase64Url(payload));
    // exp is seconds since epoch. Treat as expired within 30s of now — a
    // margin to refresh before the next request actually fails.
    return decoded.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

// JWTs use base64url (RFC 4648 §5): `-` and `_` instead of `+/`, and padding
// may be omitted. `atob` only accepts standard base64, so translate first.
function decodeBase64Url(input: string): string {
  const normalised = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalised.length % 4 === 0 ? '' : '='.repeat(4 - (normalised.length % 4));
  return atob(normalised + pad);
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: 'required' | 'optional' | 'none';
  signal?: AbortSignal;
};

export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = 'required', signal } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth !== 'none') {
    try {
      const token = await ensureFreshAccessToken();
      headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      if (auth === 'required') throw err;
      // 'optional' — fall through with no Authorization header
    }
  }

  const res = await fetch(`${AUTH_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (res.ok) return parsed as T;

  // Only act on 401s for calls that ASKED for auth. For 'optional'/'none', a
  // 401 means the endpoint required auth we didn't attach — not a session
  // problem to react to.
  if (res.status === 401 && auth === 'required') {
    const msg = (parsed as { message?: string })?.message ?? '';
    if (msg === 'Access token has expired') {
      // Our isJwtExpired() disagreed with the server. Force-refresh, retry once.
      refreshInFlight = null;
      const token = await ensureFreshAccessToken();
      const retry = await fetch(`${AUTH_BASE}${path}`, {
        method,
        headers: { ...headers, Authorization: `Bearer ${token}` },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
      if (retry.ok) {
        const retryText = await retry.text();
        return safeJson(retryText) as T;
      }
    }
    // Any other 401 on a required call — hard sign-out.
    await clearRefreshToken();
    useAuthStore.getState().setGuest();
  }

  throw new ApiError(
    res.status,
    parsed,
    extractMessage(parsed) ?? `HTTP ${res.status}`,
  );
}

// NestJS validation errors carry message as string[]; normalise for display.
function extractMessage(parsed: unknown): string | undefined {
  const msg = (parsed as { message?: string | string[] })?.message;
  if (Array.isArray(msg)) return msg.join('\n');
  return msg;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
