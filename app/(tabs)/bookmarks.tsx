import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBookmarks } from '@/hooks/useBookmarkQueries';
import { useToggleBookmark } from '@/hooks/useSocialMutations';
import { useAuthStore } from '@/lib/auth-store';
import { useSocialStore } from '@/lib/social-store';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';
import { useThemeColors } from '@/lib/theme';
import type { Bookmark } from '@/lib/api-client';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

function savedAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

// Home-style 2-col grid rows.
function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function BookmarksScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const authStatus = useAuthStore((s) => s.state.status);
  const { toggleLike, isLiked } = useSocialStore();

  const bookmarksQuery = useBookmarks();
  // Shared toggle keeps the server-social overlay in sync so Home/Search
  // cards un-bookmark instantly too.
  const toggleBookmark = useToggleBookmark();

  const bookmarks: Bookmark[] =
    bookmarksQuery.data?.pages.flatMap((page) => page.bookmarks) ?? [];

  const handleBookmarkRemove = (productId: string) => {
    toggleBookmark(productId, true);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const nearBottom =
      contentOffset.y + layoutMeasurement.height > contentSize.height - 600;
    if (nearBottom && bookmarksQuery.hasNextPage && !bookmarksQuery.isFetchingNextPage) {
      bookmarksQuery.fetchNextPage();
    }
  };

  const renderBody = () => {
    if (authStatus === 'guest') {
      return (
        <EmptyState
          fill
          icon="bookmark"
          title="Sign in to see your wishlist"
          caption="Your saved products live in your YIIVA account"
        >
          <Button variant="brand" className="mt-4 px-10" onPress={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </EmptyState>
      );
    }

    if (bookmarksQuery.isPending || authStatus === 'loading') {
      // Mirrors the real grid anatomy (2:3 card + caption line), like Home.
      return (
        <View className="pt-4">
          {[0, 1].map((r) => (
            <View key={r} className="mb-3 flex-row gap-3 px-3">
              {[0, 1].map((c) => (
                <View key={c} className="flex-1 gap-2">
                  <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                  <Skeleton className="h-3 w-3/5" />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    if (bookmarksQuery.isError) {
      return (
        <EmptyState
          fill
          icon="wifi.slash"
          title="Couldn't load your wishlist"
          caption="Check your connection and try again."
        >
          <Button variant="brand" className="mt-4 px-10" onPress={() => bookmarksQuery.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    if (bookmarks.length === 0) {
      return (
        <EmptyState
          fill
          icon="bookmark"
          title="No bookmarks yet"
          caption="Save products you love by tapping the bookmark icon"
        >
          <Button variant="brand" className="mt-4 px-10" onPress={() => router.replace('/(tabs)')}>
            Start exploring
          </Button>
        </EmptyState>
      );
    }

    return (
      <View className="pt-4">
        {chunkPairs(bookmarks).map((row) => (
          <View key={row[0].product.id} className="mb-3 flex-row gap-3 px-3">
            {row.map((bookmark) => {
              const { product } = bookmark;
              return (
                <View key={product.id} className="flex-1">
                  <ProductCard
                    productImage={imageSource(product.primaryImage)}
                    profileImage={imageSource(product.merchant.logo)}
                    artistName={product.merchant.displayName}
                    productTitle={product.name}
                    price={formatZAR(product.price)}
                    productId={product.id}
                    artistId={product.merchant.username}
                    onBookmark={() => handleBookmarkRemove(product.id)}
                    onLike={() => toggleLike(product.id)}
                    isLiked={isLiked(product.id)}
                    isBookmarked={true}
                  />
                  <View className="mt-1.5 gap-0.5 pl-1">
                    <Text variant="caption">Saved {savedAgo(bookmark.bookmarkedAt)}</Text>
                    {!product.available && (
                      <Text variant="caption" className="font-semibold text-danger">
                        No longer available
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
            {/* Keep an odd last card at half width */}
            {row.length === 1 && <View className="flex-1" />}
          </View>
        ))}
        {bookmarksQuery.isFetchingNextPage && (
          <ActivityIndicator
            size="small"
            color={colors.mutedForeground}
            style={{ marginVertical: 16 }}
          />
        )}
      </View>
    );
  };

  const savedCount = bookmarks.length;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-end justify-between border-b border-border px-5 pb-4 pt-16">
        <Text variant="title">Wishlist</Text>
        {authStatus === 'authenticated' && savedCount > 0 && !bookmarksQuery.hasNextPage && (
          <Text variant="caption" className="mb-1 text-muted-foreground">
            {savedCount} saved
          </Text>
        )}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={bookmarksQuery.isRefetching}
            onRefresh={() => bookmarksQuery.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
}
