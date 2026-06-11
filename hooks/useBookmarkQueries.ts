// TanStack Query hooks for the Wishlist (docs/screens/09-wishlist/api-contract.md).

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { getBookmarks, removeBookmark } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const BOOKMARKS_KEY = ['me', 'bookmarks'];

export function useBookmarks(sort: 'newest' | 'oldest' = 'newest') {
  const authStatus = useAuthStore((s) => s.state.status);
  return useInfiniteQuery({
    queryKey: [...BOOKMARKS_KEY, sort],
    queryFn: ({ pageParam }) => getBookmarks({ sort, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60 * 1000,
    enabled: authStatus === 'authenticated',
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => removeBookmark(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKMARKS_KEY });
    },
  });
}
