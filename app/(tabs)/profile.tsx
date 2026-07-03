import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { YiivaHeader } from '@/components/YiivaHeader';
import { SideMenu } from '@/components/SideMenu';
import { FeedTabs } from '@/components/FeedTabs';
import { useFilter } from '@/contexts/FilterContext';
import { useCategories } from '@/hooks/useHomeQueries';
import { useMerchantDirectory } from '@/hooks/useShopQueries';
import { imageSource } from '@/lib/image-source';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { DirectoryMerchant, GenderType } from '@/lib/api-client';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries';

const VIEW_MODE_KEY = 'yiiva.shopViewMode';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { activePrimaryFilter } = useFilter();
  const [shopFilterMode, setShopFilterMode] = useState<'brands' | 'categories'>('brands');
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // 'home-lifestyle' has no backend taxonomy yet (open-questions §P-4).
  const gender: GenderType | null =
    activePrimaryFilter === 'home-lifestyle' ? null : activePrimaryFilter;

  const directoryQuery = useMerchantDirectory(gender);
  const categoriesQuery = useCategories(gender);

  const brands: DirectoryMerchant[] =
    directoryQuery.data?.pages.flatMap((page) => page.merchants) ?? [];
  const lettersWithBrands = new Set(
    directoryQuery.data?.pages[0]?.lettersWithBrands ?? []
  );
  const categories = categoriesQuery.data?.categories ?? [];

  // Letter -> section y-offset, measured at render for the index jump.
  const sectionOffsets = useRef<Record<string, number>>({});
  const brandsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY)
      .then((mode) => {
        if (mode === 'brands' || mode === 'categories') setShopFilterMode(mode);
      })
      .catch(() => {});
  }, []);

  const handleMenuPress = () => setIsMenuVisible(true);
  const handleCartPress = () => router.push('/cart');
  const handleNotificationsPress = () => router.push('/notifications');
  const unreadNotifications = useUnreadNotificationCount();

  const handleShopFilterChange = (mode: 'brands' | 'categories') => {
    setShopFilterMode(mode);
    AsyncStorage.setItem(VIEW_MODE_KEY, mode).catch(() => {});
  };

  const handleCategoryPress = (slug: string) => {
    // Category Listing screen doesn't exist yet (open work in status.md).
    console.log('Category pressed:', slug);
  };

  const handleBrandPress = (brand: DirectoryMerchant) =>
    router.push(`/artist/${brand.username}`);

  const handleLetterPress = (letter: string) => {
    const y = sectionOffsets.current[letter];
    if (y !== undefined) {
      brandsScrollRef.current?.scrollTo({ y, animated: true });
    }
  };

  const handleBrandsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const nearBottom =
      contentOffset.y + layoutMeasurement.height > contentSize.height - 400;
    if (nearBottom && directoryQuery.hasNextPage && !directoryQuery.isFetchingNextPage) {
      directoryQuery.fetchNextPage();
    }
  };

  // Group loaded brands by first letter (backend sorts name_asc).
  const groupedBrands: { [key: string]: DirectoryMerchant[] } = {};
  brands.forEach((brand) => {
    const firstLetter = brand.displayName[0]?.toUpperCase() ?? '#';
    if (!groupedBrands[firstLetter]) {
      groupedBrands[firstLetter] = [];
    }
    groupedBrands[firstLetter].push(brand);
  });
  const loadedLetters = Object.keys(groupedBrands).sort();

  const renderPlaceholder = (
    icon: React.ComponentProps<typeof IconSymbol>['name'],
    title: string,
    body: string
  ) => (
    <View className="flex-1 items-center justify-center gap-3 px-10 pt-20">
      <IconSymbol name={icon} size={64} color={colors.mutedForeground} />
      <Text variant="title" className="text-center">
        {title}
      </Text>
      <Text variant="body" className="text-center text-muted-foreground">
        {body}
      </Text>
    </View>
  );

  const renderRetry = (message: string, onRetry: () => void) => (
    <View className="flex-1 items-center justify-center gap-4 px-10 pt-20">
      <IconSymbol name="exclamationmark.triangle" size={64} color={colors.mutedForeground} />
      <Text variant="title" className="text-center">
        {message}
      </Text>
      <Button variant="brand" className="px-10" onPress={onRetry}>
        Retry
      </Button>
    </View>
  );

  const renderCategoriesSkeleton = () => (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[100px] w-full rounded-2xl" />
      ))}
    </View>
  );

  const renderBrandsSkeleton = () => (
    <View className="flex-1 flex-row">
      <View className="w-[30px] items-center gap-2 bg-muted py-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-3 w-3 rounded-sm" />
        ))}
      </View>
      <View className="flex-1 gap-4 px-5 py-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} className="flex-row items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-md" />
          </View>
        ))}
      </View>
    </View>
  );

  const renderCategoriesView = () => {
    if (gender === null) {
      return renderPlaceholder(
        'clock',
        'Coming soon',
        'Home & Lifestyle is on its way. Check back shortly.'
      );
    }
    if (categoriesQuery.isPending) {
      return renderCategoriesSkeleton();
    }
    if (categoriesQuery.isError) {
      return renderRetry("Couldn't load categories", () => categoriesQuery.refetch());
    }
    if (categories.length === 0) {
      return renderPlaceholder('square.grid.2x2', 'No categories yet', 'Check back soon.');
    }

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {categories.map((category) => (
            <TouchableOpacity
              key={category.slug}
              className="mb-3 overflow-hidden rounded-2xl bg-muted"
              onPress={() => handleCategoryPress(category.slug)}
              activeOpacity={0.9}
            >
              <View className="min-h-[100px] flex-row items-center justify-between px-6 py-6">
                <Text variant="heading" className="flex-1 tracking-wide">
                  {category.displayName.toUpperCase()}
                </Text>
                {category.image && (
                  <Image
                    source={imageSource(category.image)}
                    style={{
                      width: 80,
                      height: 60,
                      marginLeft: 16,
                      borderRadius: 8,
                      backgroundColor: colors.muted,
                    }}
                    contentFit="cover"
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderBrandsView = () => {
    if (gender === null) {
      return renderPlaceholder(
        'clock',
        'Coming soon',
        'Home & Lifestyle is on its way. Check back shortly.'
      );
    }
    if (directoryQuery.isPending) {
      return renderBrandsSkeleton();
    }
    if (directoryQuery.isError) {
      return renderRetry("Couldn't load brands", () => directoryQuery.refetch());
    }
    if (brands.length === 0) {
      return renderPlaceholder(
        'bag',
        'No brands yet',
        'New brands are joining YIIVA soon.'
      );
    }

    return (
      <View className="flex-1 flex-row">
        {/* Alphabetical Index — letters without brands render dimmed */}
        <View className="w-[30px] items-center bg-muted py-4">
          {ALPHABET.map((letter) => {
            const hasBrands = lettersWithBrands.has(letter);
            return (
              <TouchableOpacity
                key={letter}
                className="min-h-6 items-center justify-center px-1 py-[3px]"
                onPress={() => hasBrands && handleLetterPress(letter)}
                disabled={!hasBrands}
              >
                <Text
                  className={cn(
                    'text-[12px]',
                    hasBrands ? 'font-semibold text-brand' : 'text-muted-foreground'
                  )}
                >
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Brands List */}
        <ScrollView
          ref={brandsScrollRef}
          className="flex-1 bg-background"
          showsVerticalScrollIndicator={false}
          onScroll={handleBrandsScroll}
          scrollEventThrottle={16}
        >
          {loadedLetters.map((letter) => (
            <View
              key={letter}
              onLayout={(e) => {
                sectionOffsets.current[letter] = e.nativeEvent.layout.y;
              }}
            >
              <View className="border-b border-border bg-muted px-5 py-2">
                <Text variant="label" className="text-muted-foreground">
                  {letter}
                </Text>
              </View>
              {groupedBrands[letter].map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  className="flex-row items-center gap-4 border-b border-border bg-card px-5 py-4"
                  onPress={() => handleBrandPress(brand)}
                  activeOpacity={0.9}
                >
                  <Avatar
                    uri={brand.logo && brand.logo.startsWith('http') ? brand.logo : undefined}
                    fallback={brand.displayName.charAt(0).toUpperCase()}
                    size={40}
                    variant="logo"
                  />
                  <Text variant="label" className="flex-1">
                    {brand.displayName}
                  </Text>
                  <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {directoryQuery.isFetchingNextPage && (
            <ActivityIndicator
              size="small"
              color={colors.mutedForeground}
              style={{ marginVertical: 16 }}
            />
          )}
        </ScrollView>
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

      {/* Shop Filter Toggle */}
      <View className="mb-4 px-5">
        <View className="flex-row rounded-lg bg-muted p-0.5">
          <TouchableOpacity
            className={cn(
              'flex-1 items-center justify-center rounded-md px-4 py-2.5',
              shopFilterMode === 'brands' && 'bg-card'
            )}
            onPress={() => handleShopFilterChange('brands')}
          >
            <Text
              className={cn(
                'text-[15px]',
                shopFilterMode === 'brands'
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground'
              )}
            >
              Brands
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={cn(
              'flex-1 items-center justify-center rounded-md px-4 py-2.5',
              shopFilterMode === 'categories' && 'bg-card'
            )}
            onPress={() => handleShopFilterChange('categories')}
          >
            <Text
              className={cn(
                'text-[15px]',
                shopFilterMode === 'categories'
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground'
              )}
            >
              Categories
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {shopFilterMode === 'categories' ? renderCategoriesView() : renderBrandsView()}
    </View>
  );
}
