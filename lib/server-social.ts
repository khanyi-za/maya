// In-memory overlay for server-backed social state (bookmarks + follows).
//
// List responses carry the personalised truth (isBookmarkedByMe /
// isFollowedByMe) at fetch time; this overlay records the user's toggles since
// then so every visible card agrees without surgically patching each cached
// infinite-query page. Card state = overlay value ?? server field ?? false.
// Cleared on sign-out (state is meaningless across accounts).
//
// Likes deliberately do NOT live here — they're local-only in v1 (no server
// model, open-questions §S-1) and stay in social-store.ts.

import { create } from 'zustand';
import { useAuthStore } from './auth-store';

interface ServerSocialState {
  bookmarked: Record<string, boolean>;
  followed: Record<string, boolean>;
  setBookmarked: (productId: string, value: boolean) => void;
  setFollowed: (merchantId: string, value: boolean) => void;
  reset: () => void;
}

export const useServerSocial = create<ServerSocialState>((set) => ({
  bookmarked: {},
  followed: {},
  setBookmarked: (productId, value) =>
    set((s) => ({ bookmarked: { ...s.bookmarked, [productId]: value } })),
  setFollowed: (merchantId, value) =>
    set((s) => ({ followed: { ...s.followed, [merchantId]: value } })),
  reset: () => set({ bookmarked: {}, followed: {} }),
}));

// Sign-out invalidates the overlay.
useAuthStore.subscribe((state) => {
  if (state.state.status === 'guest') {
    useServerSocial.getState().reset();
  }
});

/** Resolve a card's bookmark state: overlay wins over the fetched field. */
export function resolveBookmarked(
  overlay: Record<string, boolean>,
  productId: string,
  serverValue: boolean | undefined
): boolean {
  return overlay[productId] ?? serverValue ?? false;
}

/** Resolve a card's follow state: overlay wins over the fetched field. */
export function resolveFollowed(
  overlay: Record<string, boolean>,
  merchantId: string,
  serverValue: boolean | undefined
): boolean {
  return overlay[merchantId] ?? serverValue ?? false;
}
