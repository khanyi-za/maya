// TanStack Query hooks for the Shop tab (docs/screens/11-shop/api-contract.md).
// Brands directory caches 30min; the Categories view reuses useCategories
// from useHomeQueries (same query key — shared cache with Home).

import { useInfiniteQuery } from '@tanstack/react-query';
import { getMerchantDirectory, type GenderType } from '@/lib/api-client';

export function useMerchantDirectory(gender: GenderType | null) {
  return useInfiniteQuery({
    queryKey: ['merchants', 'directory', gender],
    queryFn: ({ pageParam }) =>
      getMerchantDirectory({
        genderType: gender ?? undefined,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30 * 60 * 1000,
    enabled: gender !== null,
  });
}
