// Server-backed bookmark + follow toggles (docs/api/social.md §2-3).
// Optimistic: the overlay flips immediately and reverts on failure. Guests
// never reach these — screens prompt sign-in first.

import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  addBookmark,
  followMerchant,
  removeBookmark,
  unfollowMerchant,
} from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useServerSocial } from '@/lib/server-social';

/** Shared guest gate: prompts sign-in, returns true when the tap may proceed. */
export function useRequireAuth(): () => boolean {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.state.status);
  return () => {
    if (authStatus === 'authenticated') return true;
    Alert.alert('Sign in to save', 'Bookmarks and follows live in your YIIVA account.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Sign In', onPress: () => router.push('/auth/login') },
    ]);
    return false;
  };
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  const { setBookmarked } = useServerSocial();

  const mutation = useMutation({
    mutationFn: ({ productId, next }: { productId: string; next: boolean }) =>
      next ? addBookmark(productId) : removeBookmark(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'bookmarks'] });
    },
    onError: (_err, vars) => {
      setBookmarked(vars.productId, !vars.next);
    },
  });

  return (productId: string, current: boolean) => {
    const next = !current;
    setBookmarked(productId, next);
    mutation.mutate({ productId, next });
  };
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  const { setFollowed } = useServerSocial();

  const mutation = useMutation({
    mutationFn: ({ merchantId, next }: { merchantId: string; next: boolean }) =>
      next ? followMerchant(merchantId) : unfollowMerchant(merchantId),
    onSuccess: () => {
      // followerCount on profiles/trending refreshes on the next stale fetch.
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
    onError: (_err, vars) => {
      setFollowed(vars.merchantId, !vars.next);
    },
  });

  return (merchantId: string, current: boolean) => {
    const next = !current;
    setFollowed(merchantId, next);
    mutation.mutate({ merchantId, next });
  };
}
