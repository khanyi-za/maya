// TanStack Query hooks for the Home screen (docs/screens/01-home/api-contract.md).
// Cache strategy per the contract: feed = mobile default (5min), new-arrivals
// 10min, trending 30min, categories 24h.

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getCategories,
  getNewArrivals,
  getProductFeed,
  getTrendingMerchants,
  type GenderType,
} from '@/lib/api-client';

/**
 * Cursor-paginated product feed. Pass `gender: null` when the active tab has
 * no backend taxonomy yet (home-lifestyle, open-questions §P-4) — the query
 * stays disabled and the screen renders its placeholder.
 */
export function useProductFeed(gender: GenderType | null, category?: string) {
  return useInfiniteQuery({
    queryKey: ['products', 'feed', gender, category ?? 'all'],
    queryFn: ({ pageParam }) =>
      getProductFeed({
        genderType: gender as GenderType,
        category,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: gender !== null,
  });
}

export function useNewArrivals(gender: GenderType | null) {
  return useQuery({
    queryKey: ['products', 'new-arrivals', gender],
    queryFn: () => getNewArrivals({ genderType: gender as GenderType }),
    staleTime: 10 * 60 * 1000,
    enabled: gender !== null,
  });
}

export function useTrendingMerchants(gender: GenderType | null) {
  return useQuery({
    queryKey: ['merchants', 'trending', gender],
    queryFn: () => getTrendingMerchants({ genderType: gender ?? undefined }),
    staleTime: 30 * 60 * 1000,
    enabled: gender !== null,
  });
}

export function useCategories(gender: GenderType | null) {
  return useQuery({
    queryKey: ['categories', gender],
    queryFn: () => getCategories({ genderType: gender as GenderType }),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: gender !== null,
  });
}

/**
 * All categories regardless of gender — for surfaces with no gender context
 * (the brand page's Categories rail). Separate from useCategories so Home's
 * null-means-disabled contract (home-lifestyle tab) stays untouched.
 */
export function useAllCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => getCategories({}),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
