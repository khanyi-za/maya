// TanStack Query hooks for Merchant Profile (docs/screens/08-merchant-profile/api-contract.md).
// Profile is the critical path (5min stale); the catalogue grid is cursor-
// paginated per (username, clothingType); view tracking is debounced 30s.

import { useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getMerchantByUsername,
  getMerchantProducts,
  recordMerchantView,
} from '@/lib/api-client';

export function useMerchantProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['merchants', 'profile', username],
    queryFn: () => getMerchantByUsername(username as string),
    staleTime: 5 * 60 * 1000,
    enabled: !!username,
  });
}

export function useMerchantProducts(
  username: string | undefined,
  clothingType?: string
) {
  return useInfiniteQuery({
    queryKey: ['merchants', 'products', username, clothingType ?? 'all'],
    queryFn: ({ pageParam }) =>
      getMerchantProducts(username as string, {
        clothingType,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    enabled: !!username,
  });
}

const lastViewFiredAt = new Map<string, number>();

/** Fire the profile-view POST once the merchant id is known. Best-effort. */
export function useTrackMerchantView(merchantId: string | undefined) {
  useEffect(() => {
    if (!merchantId) return;
    const last = lastViewFiredAt.get(merchantId) ?? 0;
    if (Date.now() - last < 30 * 1000) return;
    lastViewFiredAt.set(merchantId, Date.now());
    recordMerchantView(merchantId).catch(() => {});
  }, [merchantId]);
}
