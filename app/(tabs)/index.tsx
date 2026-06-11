import { CategoryFilter } from '@/components/CategoryFilter';
import { FeedTabs } from '@/components/FeedTabs';
import { ProductCard } from '@/components/ProductCard';
import { RowProductList } from '@/components/RowProductList';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { YiivaHeader } from '@/components/YiivaHeader';
import { SideMenu } from '@/components/SideMenu';
import { useFilter } from '@/contexts/FilterContext';
import { useSocialStore } from '@/lib/social-store';
import { resolveBookmarked, resolveFollowed, useServerSocial } from '@/lib/server-social';
import { useRequireAuth, useToggleBookmark, useToggleFollow } from '@/hooks/useSocialMutations';
import { imageSource } from '@/lib/image-source';
import { formatZAR } from '@/lib/format';
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
  StyleSheet,
  View,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

export default function HomeScreen() {
  const router = useRouter();
  const { activePrimaryFilter } = useFilter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Likes stay local-only in v1; bookmarks + follows are server-backed.
  const { toggleLike, isLiked } = useSocialStore();
  const { bookmarked, followed } = useServerSocial();
  const toggleBookmark = useToggleBookmark();
  const toggleFollow = useToggleFollow();
  const requireAuth = useRequireAuth();

  // 'home-lifestyle' has no backend taxonomy yet (open-questions §P-4) —
  // queries stay disabled and the tab renders a placeholder.
  const gender: GenderType | null =
    activePrimaryFilter === 'home-lifestyle' ? null : activePrimaryFilter;

  const feedQuery = useProductFeed(
    gender,
    activeCategory === 'All' ? undefined : activeCategory
  );
  const newArrivalsQuery = useNewArrivals(gender);
  const trendingQuery = useTrendingMerchants(gender);
  const categoriesQuery = useCategories(gender);

  const products: Product[] =
    feedQuery.data?.pages.flatMap((page) => page.products) ?? [];

  const handleMenuPress = () => setIsMenuVisible(true);
  const handleCartPress = () => router.push('/cart');
  const handleNotificationsPress = () => console.log('Notifications pressed');
  const handleCategoryChange = useCallback(
    (category: string) => setActiveCategory(category),
    []
  );
  const handleBookmark = (product: Product) => {
    if (!requireAuth()) return;
    toggleBookmark(
      product.id,
      resolveBookmarked(bookmarked, product.id, product.isBookmarkedByMe)
    );
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
    const nearBottom =
      contentOffset.y + layoutMeasurement.height > contentSize.height - 600;
    if (nearBottom && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      feedQuery.fetchNextPage();
    }
  };

  const trendingBrands = trendingQuery.data?.merchants ?? [];
  const newArrivals = newArrivalsQuery.data?.products ?? [];

  const renderGridRow = (rowProducts: Product[], key: string) => (
    <View key={key} style={styles.gridRow}>
      {rowProducts.map((product) => (
        <View key={product.id} style={styles.gridItem}>
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
    <View key="trending-brands" style={styles.brandsSection}>
      <View style={styles.brandsSectionHeader}>
        <ThemedText style={styles.brandsSectionTitle}>Trending Brands</ThemedText>
        <TouchableOpacity onPress={() => router.push('/explore')}>
          <ThemedText style={styles.seeAllText}>See All</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.brandsContainer}
      >
        {trendingBrands.map((brand) => {
          const isFollowingBrand = resolveFollowed(
            followed,
            brand.id,
            brand.isFollowedByMe
          );
          return (
          <TouchableOpacity
            key={brand.id}
            style={styles.brandCard}
            onPress={() => handleBrandPress(brand.username)}
            activeOpacity={0.9}
          >
            {brand.logo ? (
              <Image source={imageSource(brand.logo)} style={styles.brandLogo} />
            ) : (
              <View style={[styles.brandLogo, styles.brandPlaceholder]}>
                <ThemedText style={styles.brandInitial}>
                  {brand.displayName.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <ThemedText style={styles.brandName} numberOfLines={1}>
              {brand.displayName}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowingBrand && styles.followingButton,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (!requireAuth()) return;
                toggleFollow(brand.id, isFollowingBrand);
              }}
            >
              <ThemedText
                style={[
                  styles.followButtonText,
                  isFollowingBrand && styles.followingButtonText,
                ]}
              >
                {isFollowingBrand ? 'Following' : 'Follow'}
              </ThemedText>
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
        price: formatZAR(p.price),
      }))}
      onSeeAll={() => handleSeeAll('New Arrivals')}
    />
  );

  // Grid rows of 2, with the New Arrivals carousel after row 3 and Trending
  // Brands after row 6 (or at the end of a shorter feed).
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

    // Shorter feeds still get the carousels, appended after the grid.
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
        <View style={styles.placeholderContainer}>
          <ThemedText style={styles.placeholderTitle}>Coming soon</ThemedText>
          <ThemedText style={styles.placeholderText}>
            Home & Lifestyle is on its way. Check back shortly.
          </ThemedText>
        </View>
      );
    }

    if (feedQuery.isPending) {
      return (
        <View style={styles.placeholderContainer}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      );
    }

    if (feedQuery.isError) {
      return (
        <View style={styles.placeholderContainer}>
          <ThemedText style={styles.placeholderTitle}>
            Couldn&apos;t load the feed
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => feedQuery.refetch()}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.placeholderContainer}>
          <ThemedText style={styles.placeholderTitle}>Nothing here yet</ThemedText>
          <ThemedText style={styles.placeholderText}>
            No products match this view. Try another tab or category.
          </ThemedText>
        </View>
      );
    }

    return (
      <ThemedView style={styles.feed}>
        {renderFeed()}
        {feedQuery.isFetchingNextPage && (
          <ActivityIndicator size="small" color="#333" style={styles.pagingSpinner} />
        )}
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SideMenu
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        userName="Khanyisomthamo2"
      />
      <YiivaHeader
        onMenuPress={handleMenuPress}
        onCartPress={handleCartPress}
        onNotificationsPress={handleNotificationsPress}
      />

      <FeedTabs />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={gender !== null && feedQuery.isRefetching}
            onRefresh={handleRefresh}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  feed: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  placeholderContainer: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pagingSpinner: {
    marginVertical: 16,
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
  },
  brandsSection: {
    marginVertical: 20,
  },
  brandsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  brandsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  brandsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  brandCard: {
    width: 120,
    alignItems: 'center',
  },
  brandLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  brandPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ddd',
  },
  brandInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#666',
  },
  brandName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  followButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  followingButtonText: {
    color: '#666',
  },
});
