// TanStack Query hooks for orders (docs/screens/05-order-success/api-contract.md).
// While the order is PENDING_PAYMENT the query polls every 5s for up to two
// minutes (the PayFast ITN can take a moment to land server-side).

import { useRef } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  APIError,
  cancelOrder,
  getOrder,
  getOrders,
  getOrderTracking,
} from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const POLL_INTERVAL_MS = 5_000;
const POLL_WINDOW_MS = 2 * 60 * 1000;

/**
 * The buyer's order history (Account → My Orders), cursor-paginated infinite
 * scroll. Auth-gated — guests never reach the screen body.
 */
export function useOrders() {
  const authStatus = useAuthStore((s) => s.state.status);
  return useInfiniteQuery({
    queryKey: ['orders', 'list'],
    queryFn: ({ pageParam }) => getOrders({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: authStatus === 'authenticated',
  });
}

export function useOrder(orderId: string | undefined) {
  const pollStartedAt = useRef(Date.now());

  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => getOrder(orderId as string),
    staleTime: 0,
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      if (
        status === 'PENDING_PAYMENT' &&
        Date.now() - pollStartedAt.current < POLL_WINDOW_MS
      ) {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });
}

/**
 * Courier tracking. 404 TRACKING_NOT_AVAILABLE is an expected state (courier
 * hasn't collected) — don't burn retries on it; the screen renders it as the
 * "not collected yet" notice.
 */
export function useOrderTracking(orderId: string | undefined) {
  return useQuery({
    queryKey: ['orders', orderId, 'tracking'],
    queryFn: () => getOrderTracking(orderId as string),
    staleTime: 60 * 1000,
    enabled: !!orderId,
    retry: (failureCount, error) => {
      if (error instanceof APIError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      cancelOrder(orderId, reason),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders', vars.orderId] });
    },
  });
}
