import { CategoryFilter } from '@/components/CategoryFilter';
import { FeedTabs } from '@/components/FeedTabs';
import { ProductCard } from '@/components/ProductCard';
import { RowProductList } from '@/components/RowProductList';
import { YiivaHeader } from '@/components/YiivaHeader';
import { SideMenu } from '@/components/SideMenu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFilter } from '@/contexts/FilterContext';
import { useSocialStore } from '@/lib/social-store';
import { resolveBookmarked, resolveFollowed, useServerSocial } from '@/lib/server-social';
import { useRequireAuth, useToggleBookmark, useToggleFollow } from '@/hooks/useSocialMutations';
import { imageSource } from '@/lib/image-source';
import { formatZAR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/theme';
import {
  useCategories,
  useNewArrivals,
  useProductFeed,
  useTrendingMerchants,
} from '@/hooks/useHomeQueries';
import type { GenderType, Product } from '@/lib/api-client';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  View,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries';
import { Avatar } from '@/components/ui/avatar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { haptics } from '@/lib/haptics';

// Skeleton mirrors the real ProductCard proportions (2:3 media + text lines)
// so the loading → loaded swap doesn't jump.
function SkeletonCard() {
  return (
    <View className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <View className="gap-2 px-3 pb-3 pt-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </View>
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View className="pt-5">
      {[0, 1].map((r) => (
        <View key={r} className="mb-3 flex-row gap-3 px-3">
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  caption,
  children,
}: {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  title: string;
  caption?: string;
  children?: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View className="items-center gap-3 px-10 py-20">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
        <IconSymbol name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text variant="heading">{title}</Text>
      {caption && (
        <Text variant="body" className="text-center text-muted-foreground">
          {caption}
        </Text>
      )}
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const unreadNotifications = useUnreadNotificationCount();
  const { activePrimaryFilter } = useFilter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Likes stay local-only in v1; bookmarks + follows are server-backed.
  const { toggleLike, isLiked } = useSocialStore();
  const { bookmarked, followed } = useServerSocial();
  const toggleBookmark = useToggleBookmark();
  const toggleFollow = useToggleFollow();
  const requireAuth = useRequireAuth();

  const gender: GenderType | null =
    activePrimaryFilter === 'home-lifestyle' ? null : activePrimaryFilter;

  const feedQuery = useProductFeed(gender, activeCategory === 'All' ? undefined : activeCategory);
  const newArrivalsQuery = useNewArrivals(gender);
  const trendingQuery = useTrendingMerchants(gender);
  const categoriesQuery = useCategories(gender);

  const products: Product[] = feedQuery.data?.pages.flatMap((page) => page.products) ?? [];

  const handleMenuPress = () => setIsMenuVisible(true);
  const handleCartPress = () => router.push('/cart');
  const handleNotificationsPress = () => router.push('/notifications');
  const handleCategoryChange = useCallback((category: string) => setActiveCategory(category), []);
  const handleBookmark = (product: Product) => {
    if (!requireAuth()) return;
    toggleBookmark(product.id, resolveBookmarked(bookmarked, product.id, product.isBookmarkedByMe));
  };
  const handleLike = (productId: string) => toggleLike(productId);
  const handleSeeAll = (_title: string) => router.push('/explore');
  const handleBrandPress = (username: string) => router.push(`/artist/${username}`);

  const handleRefresh = useCallback(() => {
    feedQuery.refetch();
    newArrivalsQuery.refetch();
    trendingQuery.refetch();
    categoriesQuery.refetch();
  }, [feedQuery, newArrivalsQuery, trendingQuery, categoriesQuery]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const nearBottom = contentOffset.y + layoutMeasurement.height > contentSize.height - 600;
    if (nearBottom && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      feedQuery.fetchNextPage();
    }
  };

  const trendingBrands = trendingQuery.data?.merchants ?? [];
  const newArrivals = newArrivalsQuery.data?.products ?? [];

  const renderGridRow = (rowProducts: Product[], key: string) => (
    <View key={key} className="mb-3 flex-row gap-3 px-3">
      {rowProducts.map((product) => (
        <View key={product.id} className="flex-1">
          <ProductCard
            productImage={imageSource(product.primaryImage)}
            profileImage={imageSource(product.merchant.logo)}
            artistName={product.merchant.displayName}
            productTitle={product.name}
            price={formatZAR(product.price)}
            location={`${product.merchant.username}`}
            productId={product.id}
            artistId={product.merchant.username}
            onBookmark={() => handleBookmark(product)}
            onLike={() => handleLike(product.id)}
            isLiked={isLiked(product.id)}
            isBookmarked={resolveBookmarked(bookmarked, product.id, product.isBookmarkedByMe)}
          />
        </View>
      ))}
    </View>
  );

  const renderTrendingBrands = () => (
    <View key="trending-brands" className="my-5">
      <View className="mb-4 flex-row items-center justify-between px-5">
        <Text variant="title">Trending Brands</Text>
        {/* ST-9: brand discovery lives on the Shop tab, not the shelved Explore screen. */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Text className="text-[14px] font-medium text-brand">See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
        {trendingBrands.map((brand) => {
          const isFollowingBrand = resolveFollowed(followed, brand.id, brand.isFollowedByMe);
          return (
            <TouchableOpacity key={brand.id} className="w-[120px] items-center" onPress={() => handleBrandPress(brand.username)} activeOpacity={0.9}>
              <Avatar
                uri={brand.logo}
                fallback={brand.displayName.charAt(0).toUpperCase()}
                size={80}
                variant="logo"
                className="mb-2"
              />
              <Text variant="label" numberOfLines={1} className="mb-3 text-center text-[14px]">
                {brand.displayName}
              </Text>
              <TouchableOpacity
                className={cn('min-w-[80px] rounded-full px-5 py-1.5', isFollowingBrand ? 'border border-border bg-card' : 'bg-brand')}
                onPress={(e) => {
                  e.stopPropagation();
                  if (!requireAuth()) return;
                  haptics.light();
                  toggleFollow(brand.id, isFollowingBrand);
                }}
              >
                <Text className={cn('text-center text-[12px] font-semibold', isFollowingBrand ? 'text-foreground' : 'text-brand-foreground')}>
                  {isFollowingBrand ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderNewArrivals = () => (
    <RowProductList
      key="new-arrivals"
      title="New Arrivals"
      products={newArrivals.map((p) => ({
        id: p.id,
        image: imageSource(p.image),
        title: p.name,
        artistName: p.merchant.displayName,
        // NOTE: /api/products/new-arrivals doesn't return merchant.username yet —
        // when nuwa adds it, pass it here to make the rail's artist link live.
        price: formatZAR(p.price),
      }))}
      onSeeAll={() => handleSeeAll('New Arrivals')}
    />
  );

  const renderFeed = () => {
    const content: React.ReactNode[] = [];
    const rows: Product[][] = [];
    for (let i = 0; i < products.length; i += 2) {
      rows.push(products.slice(i, i + 2));
    }

    rows.forEach((rowProducts, rowIndex) => {
      content.push(renderGridRow(rowProducts, `row-${rowIndex}`));
      if (rowIndex === 2 && newArrivals.length > 0) {
        content.push(renderNewArrivals());
      }
      if (rowIndex === 5 && trendingBrands.length > 0) {
        content.push(renderTrendingBrands());
      }
    });

    if (rows.length <= 2 && newArrivals.length > 0) {
      content.push(renderNewArrivals());
    }
    if (rows.length <= 5 && trendingBrands.length > 0) {
      content.push(renderTrendingBrands());
    }

    return content;
  };

  const renderBody = () => {
    if (gender === null) {
      return (
        <EmptyState
          icon="sofa"
          title="Coming soon"
          caption="Home & Lifestyle is on its way. Check back shortly."
        />
      );
    }

    if (feedQuery.isPending) {
      return <FeedSkeleton />;
    }

    if (feedQuery.isError) {
      return (
        <EmptyState icon="wifi.slash" title="Couldn't load the feed">
          <Button variant="brand" className="mt-2 px-8" onPress={() => feedQuery.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    if (products.length === 0) {
      return (
        <EmptyState
          icon="sparkles"
          title="Nothing here yet"
          caption="No products match this view. Try another tab or category."
        />
      );
    }

    return (
      <View className="pb-24 pt-5">
        {renderFeed()}
        {feedQuery.isFetchingNextPage && (
          <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginVertical: 16 }} />
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
      <YiivaHeader
        onMenuPress={handleMenuPress}
        onCartPress={handleCartPress}
        onNotificationsPress={handleNotificationsPress}
        unreadCount={unreadNotifications.data?.unreadCount ?? 0}
      />

      <FeedTabs />

      <ScrollView
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={gender !== null && feedQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.mutedForeground}
          />
        }
      >
        {gender !== null && (
          <CategoryFilter
            onCategoryChange={handleCategoryChange}
            primaryFilter={activePrimaryFilter}
            categories={categoriesQuery.data?.categories ?? []}
          />
        )}
        {renderBody()}
      </ScrollView>
    </View>
  );
}
