// In-memory auth state (docs/auth-mobile-guide.md §1). Holds the access token
// and user; the refresh token never enters this store (SecureStore only).

import { create } from 'zustand';

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

export const useAuthStore = create<AuthStore>((set) => ({
  state: { status: 'loading' },
  setAuthenticated: (user, accessToken) =>
    set({ state: { status: 'authenticated', user, accessToken } }),
  setGuest: () => set({ state: { status: 'guest' } }),
  setLoading: () => set({ state: { status: 'loading' } }),
  updateAccessToken: (token) =>
    set((s) =>
      s.state.status === 'authenticated'
        ? { state: { ...s.state, accessToken: token } }
        : s,
    ),
}));
