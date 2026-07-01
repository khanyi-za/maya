import { MasonryGrid } from '@/components/MasonryGrid';
import { ProductCard } from '@/components/ProductCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
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
import React, { useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
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

export default function BookmarksScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
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

  const renderCenteredState = (
    icon: string,
    title: string,
    text: string,
    action?: { label: string; onPress: () => void }
  ) => (
    <View className="flex-1 items-center justify-center px-10 pt-24">
      <IconSymbol name={icon as any} size={64} color={colors.mutedForeground} />
      <Text variant="title" className="mb-2 mt-4 text-center">
        {title}
      </Text>
      <Text variant="body" className="text-center text-muted-foreground">
        {text}
      </Text>
      {action && (
        <Button variant="brand" className="mt-6 px-10" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </View>
  );

  const renderBody = () => {
    if (authStatus === 'guest') {
      return renderCenteredState(
        'bookmark',
        'Sign in to see your wishlist',
        'Your saved products live in your YIIVA account',
        { label: 'Sign In', onPress: () => router.push('/auth/login') }
      );
    }

    if (bookmarksQuery.isPending || authStatus === 'loading') {
      return (
        <View className="flex-row flex-wrap gap-3 px-5 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 flex-1 basis-[45%] rounded-xl" />
          ))}
        </View>
      );
    }

    if (bookmarksQuery.isError) {
      return renderCenteredState(
        'bookmark',
        "Couldn't load your wishlist",
        'Check your connection and try again.',
        { label: 'Retry', onPress: () => bookmarksQuery.refetch() }
      );
    }

    if (bookmarks.length === 0) {
      return renderCenteredState(
        'bookmark',
        'No bookmarks yet',
        'Save products you love by tapping the bookmark icon',
        { label: 'Start exploring', onPress: () => router.replace('/(tabs)') }
      );
    }

    return (
      <View className="flex-1">
        {viewMode === 'list' ? (
          // List view with ProductCards
          <View className="px-5 pt-4">
            {bookmarks.map((bookmark) => {
              const { product } = bookmark;
              return (
                <View key={product.id} className="mb-4">
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
                  <View className="mt-2 flex-row items-center gap-3 pl-1">
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
          </View>
        ) : (
          // Grid view with MasonryGrid
          <View className="px-5 pt-4">
            <MasonryGrid
              data={bookmarks.map((bookmark) => ({
                id: bookmark.product.id,
                image: imageSource(bookmark.product.primaryImage),
                brand: bookmark.product.merchant.displayName,
                title: bookmark.product.name,
                price: formatZAR(bookmark.product.price),
                height: Math.floor(Math.random() * 100) + 200,
              }))}
              onItemPress={(item) => router.push(`/product/${item.id}`)}
              spacing={12}
              columns={2}
            />
          </View>
        )}
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

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border px-5 pb-4 pt-16">
        <Text variant="title">Wishlist</Text>

        {/* Segmented list/grid toggle */}
        <View className="flex-row rounded-lg bg-muted p-1">
          {(['list', 'grid'] as const).map((mode) => {
            const active = viewMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                activeOpacity={0.7}
                className={`h-8 w-9 items-center justify-center rounded-md ${
                  active ? 'bg-card' : ''
                }`}
              >
                <IconSymbol
                  name={mode === 'list' ? 'list.bullet' : 'square.grid.2x2'}
                  size={18}
                  color={active ? colors.foreground : colors.mutedForeground}
                />
              </TouchableOpacity>
            );
          })}
        </View>
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
