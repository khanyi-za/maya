// TanStack Query hooks for Product Detail (docs/screens/02-product-detail/api-contract.md).
// Detail is the critical path (2min stale — stock is time-sensitive); similar
// is non-blocking (30min stale); view tracking is fire-and-forget, debounced.

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getProductById,
  getSimilarProducts,
  recordProductView,
} from '@/lib/api-client';

export function useProductDetail(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', productId],
    queryFn: () => getProductById(productId as string),
    staleTime: 2 * 60 * 1000,
    enabled: !!productId,
  });
}

export function useSimilarProducts(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'similar', productId],
    queryFn: () => getSimilarProducts({ productId: productId as string }),
    staleTime: 30 * 60 * 1000,
    enabled: !!productId,
  });
}

// Don't re-fire for the same product within 30s (e.g. tapping a Similar item
// that bounces straight back) — contract §6.
const lastViewFiredAt = new Map<string, number>();

/** Fire the view-tracking POST once the product has loaded. Best-effort. */
export function useTrackProductView(productId: string | undefined, loaded: boolean) {
  useEffect(() => {
    if (!productId || !loaded) return;
    const last = lastViewFiredAt.get(productId) ?? 0;
    if (Date.now() - last < 30 * 1000) return;
    lastViewFiredAt.set(productId, Date.now());
    recordProductView(productId).catch(() => {});
  }, [productId, loaded]);
}
