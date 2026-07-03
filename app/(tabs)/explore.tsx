import { CategoryFilter } from '@/components/CategoryFilter';
import { FeedTabs } from '@/components/FeedTabs';
import { YiivaHeader } from '@/components/YiivaHeader';
import { SideMenu } from '@/components/SideMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFilter } from '@/contexts/FilterContext';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
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
  const colors = useThemeColors();

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

  const handleNotificationsPress = () => router.push('/notifications');

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
    <View className="flex-1 bg-background">
      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
      <YiivaHeader
        onMenuPress={handleMenuPress}
        onCartPress={handleCartPress}
        onNotificationsPress={handleNotificationsPress}
      />

      <FeedTabs onTabChange={handleFeedTabChange} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Trending Brands */}
        <View className="mb-8">
          <View className="mb-4 flex-row items-center justify-between px-5">
            <Text variant="title">Trending Brands</Text>
            <TouchableOpacity>
              <Text className="text-[14px] font-medium text-brand">See All</Text>
            </TouchableOpacity>
          </View>

          {merchantsLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            >
              {[0, 1, 2].map((i) => (
                <View key={i} className="w-[120px] items-center">
                  <Skeleton className="mb-2 h-20 w-20 rounded-full" />
                  <Skeleton className="mb-3 h-4 w-16" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </View>
              ))}
            </ScrollView>
          ) : merchantsError ? (
            <View className="items-center px-5 py-5">
              <Text variant="caption" className="text-center text-danger">
                Error loading artists
              </Text>
            </View>
          ) : merchants.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            >
              {merchants.map((merchant: Merchant) => {
                const isFollowingBrand = isFollowing(merchant.id);
                return (
                  <TouchableOpacity
                    key={merchant.id}
                    className="w-[120px] items-center"
                    onPress={() => handleArtistPress(merchant)}
                    activeOpacity={0.9}
                  >
                    {merchant.logo ? (
                      <Image
                        source={getLocalAsset(merchant.logo.url)}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          marginBottom: 8,
                          backgroundColor: colors.muted,
                        }}
                      />
                    ) : (
                      <View className="mb-2 h-20 w-20 items-center justify-center rounded-full bg-muted">
                        <Text className="text-[28px] font-bold text-muted-foreground">
                          {merchant.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text
                      variant="label"
                      numberOfLines={1}
                      className="mb-3 text-center text-[14px]"
                    >
                      {merchant.displayName}
                    </Text>
                    <TouchableOpacity
                      className={cn(
                        'min-w-[80px] rounded-full px-5 py-1.5',
                        isFollowingBrand ? 'border border-border bg-card' : 'bg-brand',
                      )}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleFollowPress(merchant.id);
                      }}
                    >
                      <Text
                        className={cn(
                          'text-center text-[12px] font-semibold',
                          isFollowingBrand ? 'text-foreground' : 'text-brand-foreground',
                        )}
                      >
                        {isFollowingBrand ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View className="items-center px-5 py-5">
              <Text variant="caption" className="text-center">
                No artists available
              </Text>
            </View>
          )}
        </View>

        {/* Category Filter */}
        <CategoryFilter onCategoryChange={handleCategoryChange} primaryFilter={activePrimaryFilter} />

        {/* Curated Products */}
        <View className="mb-8">
          <Text variant="title" className="mb-4 px-5">
            For You
          </Text>

          {trendingLoading ? (
            <View className="flex-row flex-wrap gap-3 px-5">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="w-[48%]">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <Skeleton className="mt-2 h-3 w-20" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </View>
              ))}
            </View>
          ) : trendingError ? (
            <View className="items-center px-5 py-5">
              <Text variant="caption" className="text-center text-danger">
                Error loading products
              </Text>
            </View>
          ) : trendingProducts.length > 0 ? (
            <View className="flex-row flex-wrap gap-3 px-5">
              {trendingProducts.map((product: Product) => (
                <TouchableOpacity
                  key={product.id}
                  className="w-[48%] overflow-hidden rounded-xl border border-border bg-card"
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={getLocalAsset(product.primaryImage.url)}
                    style={{ width: '100%', height: 200, backgroundColor: colors.muted }}
                    contentFit="cover"
                  />
                  <View className="p-3">
                    <View className="mb-1.5 flex-row items-center">
                      {product.merchant.logo && (
                        <Image
                          source={getLocalAsset(product.merchant.logo.url)}
                          style={{ width: 16, height: 16, borderRadius: 8, marginRight: 4 }}
                        />
                      )}
                      <Text
                        variant="micro"
                        numberOfLines={1}
                        className="flex-1 text-muted-foreground"
                      >
                        {product.merchant.displayName}
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      numberOfLines={2}
                      className="mb-2 font-semibold text-foreground"
                    >
                      {product.name}
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="font-semibold text-foreground">
                        {product.price.formatted}
                      </Text>
                      {product.socialStats && (
                        <View className="flex-row items-center gap-1">
                          <IconSymbol name="heart.fill" size={12} color={colors.like} />
                          <Text variant="micro" className="text-muted-foreground">
                            {product.socialStats.likes >= 1000
                              ? `${(product.socialStats.likes / 1000).toFixed(1)}K`
                              : product.socialStats.likes}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="items-center px-5 py-5">
              <Text variant="caption" className="text-center">
                No products available
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
