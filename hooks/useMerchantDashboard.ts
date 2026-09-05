// TanStack Query hooks for the merchant dashboard ("Manage my store").
// Everything is gated on an authenticated MERCHANT session — the entry points
// are role-gated too, but the guard here keeps deep links from firing
// doomed requests for buyers.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelMerchantOrder,
  getMerchantConversations,
  getMerchantLowStock,
  getMerchantOrder,
  getMerchantOrders,
  getMerchantOverview,
  getMerchantStore,
  updateMerchantOrderStatus,
  type MerchantCancelReason,
  type MerchantSaleStatus,
} from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

function useIsMerchantSession(): boolean {
  return useAuthStore(
    (s) => s.state.status === 'authenticated' && s.state.user.role === 'MERCHANT'
  );
}

export function useMerchantStore() {
  const isMerchant = useIsMerchantSession();
  return useQuery({
    queryKey: ['merchant', 'store'],
    queryFn: getMerchantStore,
    enabled: isMerchant,
  });
}

export function useMerchantOverview() {
  const isMerchant = useIsMerchantSession();
  return useQuery({
    queryKey: ['merchant', 'overview'],
    queryFn: getMerchantOverview,
    staleTime: 60 * 1000,
    enabled: isMerchant,
  });
}

export function useMerchantOrders(status?: MerchantSaleStatus) {
  const isMerchant = useIsMerchantSession();
  return useInfiniteQuery({
    queryKey: ['merchant', 'orders', 'list', status ?? 'all'],
    queryFn: ({ pageParam }) => getMerchantOrders({ status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: isMerchant,
  });
}

export function useMerchantOrder(orderId: string | undefined) {
  const isMerchant = useIsMerchantSession();
  return useQuery({
    queryKey: ['merchant', 'orders', orderId],
    queryFn: () => getMerchantOrder(orderId as string),
    staleTime: 0,
    enabled: isMerchant && !!orderId,
  });
}

export function useUpdateMerchantOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: 'PROCESSING' | 'READY_FOR_DISPATCH';
    }) => updateMerchantOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'overview'] });
    },
  });
}

export function useCancelMerchantOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      reason,
      notes,
    }: {
      orderId: string;
      reason: MerchantCancelReason;
      notes?: string;
    }) => cancelMerchantOrder(orderId, { reason, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant', 'overview'] });
    },
  });
}

export function useMerchantLowStock() {
  const isMerchant = useIsMerchantSession();
  return useQuery({
    queryKey: ['merchant', 'lowStock'],
    queryFn: getMerchantLowStock,
    staleTime: 60 * 1000,
    enabled: isMerchant,
  });
}

export function useMerchantConversations() {
  const isMerchant = useIsMerchantSession();
  return useQuery({
    queryKey: ['merchant', 'conversations'],
    queryFn: getMerchantConversations,
    // Cheap unread freshness while the inbox (or dashboard badge) is mounted.
    refetchInterval: 30 * 1000,
    enabled: isMerchant,
  });
}
