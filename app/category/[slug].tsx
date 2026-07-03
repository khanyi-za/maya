import { ProductCard } from '@/components/ProductCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCategorySearchResults } from '@/hooks/useSearchQueries';
import { useRequireAuth, useToggleBookmark } from '@/hooks/useSocialMutations';
import { useSocialStore } from '@/lib/social-store';
import { resolveBookmarked, useServerSocial } from '@/lib/server-social';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';
import { useThemeColors } from '@/lib/theme';
import type { GenderType, Product } from '@/lib/api-client';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Category Listing — destination for Shop's category cards. Products come
// from the category-scoped search endpoint (precise ProductCategory
// membership, not a text match), gender-aware like the Shop tab it came from.
export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ slug: string; name?: string; gender?: string }>();

  const slug = params.slug;
  const title = params.name ?? slug;
  const gender =
    params.gender === 'women' || params.gender === 'men' || params.gender === 'unisex'
      ? (params.gender as GenderType)
      : undefined;

  const resultsQuery = useCategorySearchResults(slug ?? null, gender);
  const { toggleLike, isLiked } = useSocialStore();
  const { bookmarked } = useServerSocial();
  const toggleBookmark = useToggleBookmark();
  const requireAuth = useRequireAuth();

  const products: Product[] =
    resultsQuery.data?.pages.flatMap((page) => page.products) ?? [];

  const handleBookmark = (product: Product) => {
    if (!requireAuth()) return;
    toggleBookmark(
      product.id,
      resolveBookmarked(bookmarked, product.id, product.isBookmarkedByMe)
    );
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const nearBottom =
      contentOffset.y + layoutMeasurement.height > contentSize.height - 600;
    if (nearBottom && resultsQuery.hasNextPage && !resultsQuery.isFetchingNextPage) {
      resultsQuery.fetchNextPage();
    }
  };

  const renderBody = () => {
    if (resultsQuery.isPending) {
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

    if (resultsQuery.isError) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load this category">
          <Button variant="brand" className="mt-4 px-10" onPress={() => resultsQuery.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    if (products.length === 0) {
      return (
        <EmptyState
          fill
          icon="square.grid.2x2"
          title="Nothing here yet"
          caption="New pieces land in this category as brands add them."
        >
          <Button variant="brand" className="mt-4 px-10" onPress={() => router.back()}>
            Keep browsing
          </Button>
        </EmptyState>
      );
    }

    const rows: Product[][] = [];
    for (let i = 0; i < products.length; i += 2) {
      rows.push(products.slice(i, i + 2));
    }

    return (
      <View className="pt-4">
        {rows.map((rowProducts) => (
          <View key={rowProducts[0].id} className="mb-3 flex-row gap-3 px-3">
            {rowProducts.map((product) => (
              <View key={product.id} className="flex-1">
                <ProductCard
                  productImage={imageSource(product.primaryImage)}
                  profileImage={imageSource(product.merchant.logo)}
                  artistName={product.merchant.displayName}
                  productTitle={product.name}
                  price={formatZAR(product.price)}
                  location={product.merchant.username}
                  productId={product.id}
                  artistId={product.merchant.username}
                  onBookmark={() => handleBookmark(product)}
                  onLike={() => toggleLike(product.id)}
                  isLiked={isLiked(product.id)}
                  isBookmarked={resolveBookmarked(
                    bookmarked,
                    product.id,
                    product.isBookmarkedByMe
                  )}
                />
              </View>
            ))}
            {rowProducts.length === 1 && <View className="flex-1" />}
          </View>
        ))}
        {resultsQuery.isFetchingNextPage && (
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
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading" numberOfLines={1} className="mx-2 flex-1 text-center">
          {title}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={resultsQuery.isRefetching && !resultsQuery.isFetchingNextPage}
            onRefresh={() => resultsQuery.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
}
