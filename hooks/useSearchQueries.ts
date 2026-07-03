// TanStack Query hooks for Search (docs/screens/07-search/api-contract.md).
// Each settled query is fresh (staleTime 0, gcTime 5min — back-navigation
// within 5min doesn't refetch). Trending tags cache for an hour. Tracking is
// fire-and-forget on the settled query only.

import { useEffect, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getSearchSuggestions,
  searchByCategory,
  searchProducts,
  trackSearch,
  type GenderType,
} from '@/lib/api-client';

/** Debounce a fast-changing value (contract: 250ms after the last keystroke). */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

export function useSearchResults(query: string, gender?: GenderType) {
  return useInfiniteQuery({
    queryKey: ['search', query, gender ?? 'all'],
    queryFn: ({ pageParam }) =>
      searchProducts({ query, genderType: gender, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    enabled: query.trim().length >= 1,
    // Keep the previous results rendered (faded) while the next query loads.
    placeholderData: keepPreviousData,
  });
}

/**
 * Category-scoped results (GET /api/search/category) — precise membership, not
 * a text match. Drives the Search browse rail's category taps.
 */
export function useCategorySearchResults(categorySlug: string | null, gender?: GenderType) {
  return useInfiniteQuery({
    queryKey: ['search', 'category', categorySlug, gender ?? 'all'],
    queryFn: ({ pageParam }) =>
      searchByCategory({ category: categorySlug!, genderType: gender, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    enabled: !!categorySlug,
    placeholderData: keepPreviousData,
  });
}

export function useSearchSuggestions() {
  return useQuery({
    queryKey: ['search', 'suggestions'],
    queryFn: getSearchSuggestions,
    staleTime: 60 * 60 * 1000,
  });
}

/** Track the settled query once its results resolve. Best-effort, deduped. */
export function useTrackSearch(
  query: string,
  gender: GenderType | undefined,
  resultCount: number | undefined
) {
  useEffect(() => {
    const q = query.trim();
    if (!q || resultCount === undefined) return;
    trackSearch({ q, genderType: gender, resultCount }).catch(() => {});
  }, [query, gender, resultCount]);
}
