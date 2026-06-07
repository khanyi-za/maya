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
import { getLocalAsset } from '@/lib/local-assets';
import { DUMMY_FEED_PRODUCTS, DUMMY_CAROUSEL_PRODUCTS } from '@/lib/dummy-data';
import React, { useState } from 'react';
import {
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

  const { toggleLike, toggleBookmark, isLiked, isBookmarked, toggleFollow, isFollowing } = useSocialStore();

  const trendingBrands = [
    {
      id: 'merchant-1',
      username: 'tol_thema',
      displayName: "Tol'thema",
      logo: { url: "/demo-assets/tol_thema/tol'thema-logo.png" },
    },
    {
      id: 'merchant-2',
      username: 'suhu',
      displayName: 'SUHU',
      logo: { url: '/demo-assets/suhu/suhu-logo.png' },
    },
  ];

  const handleMenuPress = () => setIsMenuVisible(true);
  const handleCartPress = () => router.push('/cart');
  const handleNotificationsPress = () => console.log('Notifications pressed');
  const handleCategoryChange = (category: string) => setActiveCategory(category);
  const handleBookmark = (productId: string) => toggleBookmark(productId);
  const handleLike = (productId: string) => toggleLike(productId);
  const handleFeedTabChange = (tab: 'men' | 'women' | 'home-lifestyle') => console.log('Feed tab changed to:', tab);
  const handleSeeAll = (_title: string) => router.push('/explore');
  const handleBrandPress = (username: string) => router.push(`/artist/${username}`);
  const handleFollowPress = (brandId: string) => toggleFollow(brandId);

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

      <FeedTabs onTabChange={handleFeedTabChange} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <CategoryFilter
          onCategoryChange={handleCategoryChange}
          primaryFilter={activePrimaryFilter}
        />

        <ThemedView style={styles.feed}>
          {(() => {
            const products = DUMMY_FEED_PRODUCTS;
            const content = [];
            let productIndex = 0;

            const createGridRow = (startIndex: number) => {
              const rowProducts = [];
              for (let i = 0; i < 2 && startIndex + i < products.length; i++) {
                const product = products[startIndex + i];
                const productImage = getLocalAsset(product.primaryImage);
                const merchantLogo = product.merchant.logo ? getLocalAsset(product.merchant.logo) : undefined;

                rowProducts.push(
                  <View key={product.id} style={styles.gridItem}>
                    <ProductCard
                      productImage={productImage || { uri: product.primaryImage }}
                      profileImage={merchantLogo}
                      artistName={product.merchant.displayName}
                      productTitle={product.name}
                      price={`R${product.price.toFixed(2)}`}
                      location={`${product.merchant.username}`}
                      productId={product.id}
                      artistId={product.merchant.username}
                      onBookmark={() => handleBookmark(product.id)}
                      onLike={() => handleLike(product.id)}
                      isLiked={isLiked(product.id)}
                      isBookmarked={isBookmarked(product.id)}
                    />
                  </View>
                );
              }
              return rowProducts;
            };

            // First 3 rows (6 products)
            for (let row = 0; row < 3 && productIndex < products.length; row++) {
              content.push(
                <View key={`row-${row}`} style={styles.gridRow}>
                  {createGridRow(productIndex)}
                </View>
              );
              productIndex += 2;
            }

            // New Arrivals after row 3
            if (productIndex >= 6) {
              content.push(
                <RowProductList
                  key="new-arrivals"
                  title="New Arrivals"
                  products={DUMMY_CAROUSEL_PRODUCTS.map(p => {
                    const localImage = getLocalAsset(p.image);
                    return {
                      id: p.id,
                      image: localImage || { uri: p.image },
                      title: p.name,
                      artistName: p.merchant.displayName,
                      price: `R${p.price.toFixed(2)}`,
                    };
                  })}
                  onSeeAll={() => handleSeeAll('New Arrivals')}
                />
              );
            }

            // Next 3 rows
            for (let row = 0; row < 3 && productIndex < products.length; row++) {
              content.push(
                <View key={`row-${row + 3}`} style={styles.gridRow}>
                  {createGridRow(productIndex)}
                </View>
              );
              productIndex += 2;
            }

            // Trending Brands
            if (productIndex >= 12 && trendingBrands.length > 0) {
              content.push(
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
                    {trendingBrands.map((brand) => (
                      <TouchableOpacity
                        key={brand.id}
                        style={styles.brandCard}
                        onPress={() => handleBrandPress(brand.username)}
                        activeOpacity={0.9}
                      >
                        {brand.logo ? (
                          <Image source={getLocalAsset(brand.logo.url)} style={styles.brandLogo} />
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
                            isFollowing(brand.id) && styles.followingButton,
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleFollowPress(brand.id);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.followButtonText,
                              isFollowing(brand.id) && styles.followingButtonText,
                            ]}
                          >
                            {isFollowing(brand.id) ? 'Following' : 'Follow'}
                          </ThemedText>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            }

            // Remaining products
            while (productIndex < products.length) {
              content.push(
                <View key={`row-remaining-${productIndex}`} style={styles.gridRow}>
                  {createGridRow(productIndex)}
                </View>
              );
              productIndex += 2;
            }

            return content;
          })()}
        </ThemedView>
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
