// TanStack Query hooks for Checkout (docs/screens/04-checkout/api-contract.md,
// v1 scope: auth-required, delivery-only, PayFast redirect — D1–D7).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAddress,
  getAddresses,
  getCheckoutQuote,
  placeOrder,
  type CreateAddressInput,
} from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const ADDRESSES_KEY = ['me', 'addresses'];

export function useAddresses() {
  const authStatus = useAuthStore((s) => s.state.status);
  return useQuery({
    queryKey: ADDRESSES_KEY,
    queryFn: getAddresses,
    staleTime: 5 * 60 * 1000,
    enabled: authStatus === 'authenticated',
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAddressInput) => createAddress(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY });
    },
  });
}

/** Server totals for the selected address. No client cache — rates can move. */
export function useCheckoutQuote(addressId: string | null) {
  return useQuery({
    queryKey: ['checkout', 'quote', addressId],
    queryFn: () => getCheckoutQuote(addressId as string),
    staleTime: 0,
    gcTime: 0,
    enabled: !!addressId,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      // The server cart is cleared by the commit — drop the stale cache.
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
