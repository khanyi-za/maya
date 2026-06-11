// TanStack Query hooks for the server cart (docs/screens/03-cart/api-contract.md).
// Every mutation returns the full cart, so onSuccess writes the response
// straight into the ['cart'] cache — the client reconciles without a refetch.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCartItem,
  clearServerCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type ServerCart,
} from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const CART_KEY = ['cart'];

export function useCart() {
  const authStatus = useAuthStore((s) => s.state.status);
  return useQuery({
    queryKey: CART_KEY,
    queryFn: getCart,
    // Stock/availability are time-sensitive — always refetch on mount.
    staleTime: 0,
    // Guests get the empty shape from the server; only fetch once auth settles.
    enabled: authStatus !== 'loading',
  });
}

function useCartMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<{ cart: ServerCart }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(CART_KEY, data);
    },
  });
}

export function useAddCartItem() {
  return useCartMutation(addCartItem);
}

export function useUpdateCartItem() {
  return useCartMutation(
    ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity)
  );
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: string) => removeCartItem(itemId));
}

export function useClearCart() {
  return useCartMutation((_: void) => clearServerCart());
}
