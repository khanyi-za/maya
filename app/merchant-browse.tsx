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

import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProductCard } from '@/components/ProductCard';
import { useThemeColors } from '@/lib/theme';
import { useSocialStore } from '@/lib/social-store';
import { resolveBookmarked, useServerSocial } from '@/lib/server-social';
import { useRequireAuth, useToggleBookmark } from '@/hooks/useSocialMutations';
import { useMerchantProducts } from '@/hooks/useMerchantQueries';
import { imageSource } from '@/lib/image-source';
import { formatZAR } from '@/lib/format';
import type { Product } from '@/lib/api-client';

// Brand collection/category explorer — the full-screen sheet that slides up
// when a card on the merchant profile is tapped (presentation is configured
// in app/_layout.tsx). Products render exactly like the Home feed grid:
// same ProductCard, same 2-col pairing, same social wiring.
//
// Params: username (merchant), type ('collection' | 'category'), slug
// (StoreCollection slug or platform category slug), name (display title).

export default function MerchantBrowseScreen() {
  const params = useLocalSearchParams<{
    username: string;
    type: 'collection' | 'category';
    slug: string;
    name: string;
  }>();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const { username, type, slug, name } = params;

  const { toggleLike, isLiked } = useSocialStore();
  const { bookmarked } = useServerSocial();
  const toggleBookmark = useToggleBookmark();
  const requireAuth = useRequireAuth();

  const productsQuery = useMerchantProducts(
    username,
    type === 'collection' ? { collection: slug } : { clothingType: slug }
  );

  const products: Product[] = React.useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.products) ?? [],
    [productsQuery.data]
  );

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
    if (nearBottom && productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      productsQuery.fetchNextPage();
    }
  };

  // Home-feed grid: pair products into rows.
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header — slide-up sheet, so the affordance is a down chevron. */}
      <View
        className="flex-row items-center border-b border-border bg-card px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-start justify-center"
        >
          <IconSymbol name="chevron.down" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text variant="heading" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="micro" className="uppercase tracking-widest">
            {type === 'collection' ? 'Collection' : 'Category'}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      {productsQuery.isPending ? (
        <View className="flex-1 px-3 pt-4">
          {[0, 1].map((row) => (
            <View key={row} className="mb-3 flex-row gap-3">
              {[0, 1].map((col) => (
                <View key={col} className="flex-1">
                  <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                  <Skeleton className="mt-2 h-3.5 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : productsQuery.isError ? (
        <EmptyState
          fill
          icon="exclamationmark.triangle"
          title="Couldn't load products"
          caption="Check your connection and try again."
        >
          <TouchableOpacity onPress={() => productsQuery.refetch()}>
            <Text variant="label" className="text-brand">
              Retry
            </Text>
          </TouchableOpacity>
        </EmptyState>
      ) : products.length === 0 ? (
        <EmptyState
          fill
          icon="bag"
          title="Nothing here yet"
          caption={`No products in ${name ?? 'this section'} right now.`}
        />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isRefetching}
              tintColor={colors.mutedForeground}
              onRefresh={() => productsQuery.refetch()}
            />
          }
        >
          {rows.map((rowProducts, i) => (
            <View key={i} className="mb-3 flex-row gap-3 px-3">
              {rowProducts.map((product) => (
                <View key={product.id} className="flex-1">
                  <ProductCard
                    productImage={imageSource(product.primaryImage)}
                    artistName={product.merchant.displayName}
                    productTitle={product.name}
                    price={formatZAR(product.price)}
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
              {/* Keep a lone last card at half width. */}
              {rowProducts.length === 1 && <View className="flex-1" />}
            </View>
          ))}
          {productsQuery.isFetchingNextPage && (
            <ActivityIndicator
              size="small"
              color={colors.mutedForeground}
              className="my-4"
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}
