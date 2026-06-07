import { CategoryFilter } from '@/components/CategoryFilter';
import { FeedTabs } from '@/components/FeedTabs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { YiivaHeader } from '@/components/YiivaHeader';
import { SideMenu } from '@/components/SideMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useFilter } from '@/contexts/FilterContext';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSocialStore } from '@/lib/social-store';
import { getLocalAsset } from '@/lib/local-assets';

// TypeScript interfaces for explore screen data
interface Collection {
  id: string;
  name: string;
  description?: string;
  coverImage: { url: string };
  itemCount: number;
}

interface Merchant {
  id: string;
  username: string;
  displayName: string;
  logo?: { url: string };
  stats: {
    followers: number;
  };
}

interface Product {
  id: string;
  name: string;
  primaryImage: { url: string };
  price: { formatted: string };
  merchant: {
    displayName: string;
    logo?: { url: string };
  };
  socialStats?: {
    likes: number;
  };
}

export default function ExploreScreen() {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { activePrimaryFilter } = useFilter();
  const router = useRouter();

  const { toggleFollow, isFollowing } = useSocialStore();

  // TODO: Replace with REST API calls
  // Static mock data for now
  const collections: Collection[] = [
    {
      id: '1',
      name: 'Heritage Collection',
      description: 'Traditional meets contemporary',
      coverImage: { url: '/demo-assets/tol_thema/The_Bonang_dress_1.png' },
      itemCount: 12,
    },
    {
      id: '2',
      name: 'Summer Essentials',
      description: 'Light & breezy styles',
      coverImage: { url: '/demo-assets/tol_thema/The_Khosi_Shirt.png' },
      itemCount: 8,
    },
    {
      id: '3',
      name: 'Urban Streetwear',
      description: 'Fresh street styles',
      coverImage: { url: '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png' },
      itemCount: 15,
    },
  ];

  const merchants: Merchant[] = [
    {
      id: 'merchant-1',
      username: 'tol_thema',
      displayName: "Tol'thema",
      logo: { url: "/demo-assets/tol_thema/tol'thema-logo.png" },
      stats: { followers: 17201 },
    },
    {
      id: 'merchant-2',
      username: 'suhu',
      displayName: 'SUHU',
      logo: { url: '/demo-assets/suhu/suhu-logo.png' },
      stats: { followers: 9155 },
    },
  ];

  const trendingProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'The Bonang Dress',
      primaryImage: { url: '/demo-assets/tol_thema/The_Bonang_dress_1.png' },
      price: { formatted: 'R 1,899' },
      merchant: {
        displayName: "Tol'thema",
        logo: { url: "/demo-assets/tol_thema/tol'thema-logo.png" },
      },
      socialStats: { likes: 234 },
    },
    {
      id: 'prod-2',
      name: 'Suhu Eye Knitted Golfer',
      primaryImage: { url: '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png' },
      price: { formatted: 'R 1,200' },
      merchant: {
        displayName: 'SUHU',
        logo: { url: '/demo-assets/suhu/suhu-logo.png' },
      },
      socialStats: { likes: 1200 },
    },
    {
      id: 'prod-3',
      name: 'The Khosi Shirt',
      primaryImage: { url: '/demo-assets/tol_thema/The_Khosi_Shirt.png' },
      price: { formatted: 'R 950' },
      merchant: {
        displayName: "Tol'thema",
        logo: { url: "/demo-assets/tol_thema/tol'thema-logo.png" },
      },
      socialStats: { likes: 456 },
    },
    {
      id: 'prod-4',
      name: 'Plain Round Neck Lindy',
      primaryImage: { url: '/demo-assets/tol_thema/Lindy_2.png' },
      price: { formatted: 'R 750' },
      merchant: {
        displayName: "Tol'thema",
        logo: { url: "/demo-assets/tol_thema/tol'thema-logo.png" },
      },
      socialStats: { likes: 189 },
    },
  ];

  const collectionsLoading = false;
  const collectionsError = null;
  const merchantsLoading = false;
  const merchantsError = null;
  const trendingLoading = false;
  const trendingError = null;

  const handleMenuPress = () => {
    setIsMenuVisible(true);
  };

  const handleCartPress = () => {
    router.push('/cart');
  };

  const handleNotificationsPress = () => {
    console.log('Notifications pressed');
  };

  const handleFeedTabChange = (tab: 'men' | 'women' | 'home-lifestyle') => {
    console.log('Feed tab changed to:', tab);
  };

  const handleCategoryChange = (category: string) => {
    console.log('Category changed to:', category);
  };

  const handleCollectionPress = (collection: Collection) => {
    console.log('Collection pressed:', collection.name);
    // TODO: Navigate to collection screen
  };

  const handleArtistPress = (merchant: Merchant) => {
    router.push(`/artist/${merchant.username}`);
  };

  const handleFollowPress = (merchantId: string) => {
    toggleFollow(merchantId);
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleVideoLike = (productId: string) => {
    console.log('Product liked:', productId);
  };

  const handleVideoArtistPress = (username: string) => {
    router.push(`/artist/${username}`);
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

      <FeedTabs onTabChange={handleFeedTabChange} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Featured Collections */}
        {/* <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Featured Collections</ThemedText>

          {collectionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : collectionsError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>Error loading collections</ThemedText>
            </View>
          ) : collections.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.collectionsContainer}
            >
              {collections.map((collection: Collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.collectionCard}
                  onPress={() => handleCollectionPress(collection)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={getLocalAsset(collection.coverImage.url)}
                    style={styles.collectionImage}
                  />
                  <View style={styles.collectionOverlay}>
                    <View style={styles.collectionContent}>
                      <ThemedText style={styles.collectionTitle}>{collection.name}</ThemedText>
                      {collection.description && (
                        <ThemedText style={styles.collectionSubtitle}>
                          {collection.description}
                        </ThemedText>
                      )}
                      <ThemedText style={styles.collectionCount}>
                        {collection.itemCount} items
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No collections available</ThemedText>
            </View>
          )}
        </View> */}

        {/* Trending Brands */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Trending Brands</ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.seeAllText}>See All</ThemedText>
            </TouchableOpacity>
          </View>

          {merchantsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : merchantsError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>Error loading artists</ThemedText>
            </View>
          ) : merchants.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.artistsContainer}
            >
              {merchants.map((merchant: Merchant) => (
                <TouchableOpacity
                  key={merchant.id}
                  style={styles.artistCard}
                  onPress={() => handleArtistPress(merchant)}
                  activeOpacity={0.9}
                >
                  {merchant.logo ? (
                    <Image source={getLocalAsset(merchant.logo.url)} style={styles.artistImage} />
                  ) : (
                    <View style={[styles.artistImage, styles.artistPlaceholder]}>
                      <ThemedText style={styles.artistInitial}>
                        {merchant.displayName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <ThemedText style={styles.artistName} numberOfLines={1}>
                    {merchant.displayName}
                  </ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      isFollowing(merchant.id) && styles.followingButton,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleFollowPress(merchant.id);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.followButtonText,
                        isFollowing(merchant.id) && styles.followingButtonText,
                      ]}
                    >
                      {isFollowing(merchant.id) ? 'Following' : 'Follow'}
                    </ThemedText>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No artists available</ThemedText>
            </View>
          )}
        </View>

        {/* Category Filter */}
        <CategoryFilter onCategoryChange={handleCategoryChange} primaryFilter={activePrimaryFilter} />

        {/* Curated Products */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>For You</ThemedText>

          {trendingLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : trendingError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>Error loading products</ThemedText>
            </View>
          ) : trendingProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {trendingProducts.map((product: Product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={getLocalAsset(product.primaryImage.url)}
                    style={styles.productImage}
                    contentFit="cover"
                  />
                  <View style={styles.productInfo}>
                    <View style={styles.productHeader}>
                      {product.merchant.logo && (
                        <Image
                          source={getLocalAsset(product.merchant.logo.url)}
                          style={styles.productArtistImage}
                        />
                      )}
                      <ThemedText style={styles.productArtistName} numberOfLines={1}>
                        {product.merchant.displayName}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.productTitle} numberOfLines={2}>
                      {product.name}
                    </ThemedText>
                    <View style={styles.productFooter}>
                      <ThemedText style={styles.productPrice}>{product.price.formatted}</ThemedText>
                      {product.socialStats && (
                        <View style={styles.productLikes}>
                          <IconSymbol name="heart.fill" size={12} color="#ff0000" />
                          <ThemedText style={styles.productLikesText}>
                            {product.socialStats.likes >= 1000
                              ? `${(product.socialStats.likes / 1000).toFixed(1)}K`
                              : product.socialStats.likes}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No products available</ThemedText>
            </View>
          )}
        </View>
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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingLeft: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ff0000',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  collectionsContainer: {
    paddingRight: 20,
    gap: 16,
  },
  collectionCard: {
    width: 280,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  collectionImage: {
    width: '100%',
    height: '100%',
  },
  collectionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  collectionContent: {
    padding: 20,
  },
  collectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: '#f0f0f0',
    marginBottom: 8,
  },
  collectionCount: {
    fontSize: 12,
    color: '#ddd',
  },
  artistsContainer: {
    paddingRight: 20,
    gap: 16,
  },
  artistCard: {
    width: 120,
    alignItems: 'center',
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  artistPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ddd',
  },
  artistInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#666',
  },
  artistName: {
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
  productsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    padding: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productArtistImage: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  productArtistName: {
    fontSize: 10,
    color: '#666',
    flex: 1,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 18,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Didot',
  },
  productLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productLikesText: {
    fontSize: 10,
    color: '#666',
  },
});
