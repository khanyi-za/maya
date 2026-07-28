// In-memory auth state (docs/auth-mobile-guide.md §1). Holds the access token
// and user; the refresh token never enters this store (SecureStore only).

import { create } from 'zustand';

import { identifyUser, resetAnalytics } from './analytics';

/**
 * The user object as auth endpoints actually return it (login / verify-email /
 * refresh all return this slim shape). The full profile — accountStatus,
 * emailVerified, isGuestAccount, phone — lives on GET /auth/me.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'MERCHANT' | 'ADMIN';
  avatarUrl: string | null;
}

export type AuthState =
  | { status: 'loading' } // cold-start, before refresh resolves
  | { status: 'authenticated'; user: AuthUser; accessToken: string }
  | { status: 'guest' }; // signed out or never signed in

interface AuthStore {
  state: AuthState;
  setAuthenticated: (user: AuthUser, accessToken: string) => void;
  setGuest: () => void;
  setLoading: () => void;
  updateAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: { status: 'loading' },
  setAuthenticated: (user, accessToken) => {
    // Analytics identify seam — this setter is the single choke point for
    // every session-establishment path (login, verify-email auto-login,
    // cold-start refresh in lib/api.ts, foreground refresh).
    identifyUser(user);
    set({ state: { status: 'authenticated', user, accessToken } });
  },
  setGuest: () => {
    // Reset analytics identity ONLY on sign-out (authenticated→guest).
    // Cold-start guest resolution also lands here — resetting then would
    // rotate the anonymous id and break guest→signup journey stitching.
    if (get().state.status === 'authenticated') resetAnalytics();
    set({ state: { status: 'guest' } });
  },
  setLoading: () => set({ state: { status: 'loading' } }),
  updateAccessToken: (token) =>
    set((s) =>
      s.state.status === 'authenticated'
        ? { state: { ...s.state, accessToken: token } }
        : s,
    ),
}));
