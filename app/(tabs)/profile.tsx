import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { YiivaHeader } from '@/components/YiivaHeader';
import { SideMenu } from '@/components/SideMenu';
import { FeedTabs } from '@/components/FeedTabs';
import { useFilter } from '@/contexts/FilterContext';
import { useCategories } from '@/hooks/useHomeQueries';
import { useMerchantDirectory } from '@/hooks/useShopQueries';
import { imageSource } from '@/lib/image-source';
import type { DirectoryMerchant, GenderType } from '@/lib/api-client';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  StatusBar,
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

  const renderPlaceholder = (title: string, body: string) => (
    <View style={styles.placeholderContainer}>
      <ThemedText style={styles.placeholderTitle}>{title}</ThemedText>
      <ThemedText style={styles.placeholderText}>{body}</ThemedText>
    </View>
  );

  const renderRetry = (message: string, onRetry: () => void) => (
    <View style={styles.placeholderContainer}>
      <ThemedText style={styles.placeholderTitle}>{message}</ThemedText>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderCategoriesView = () => {
    if (gender === null) {
      return renderPlaceholder(
        'Coming soon',
        'Home & Lifestyle is on its way. Check back shortly.'
      );
    }
    if (categoriesQuery.isPending) {
      return (
        <View style={styles.placeholderContainer}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      );
    }
    if (categoriesQuery.isError) {
      return renderRetry("Couldn't load categories", () => categoriesQuery.refetch());
    }
    if (categories.length === 0) {
      return renderPlaceholder('No categories yet', 'Check back soon.');
    }

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.slug}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category.slug)}
              activeOpacity={0.9}
            >
              <View style={styles.categoryContent}>
                <ThemedText style={styles.categoryTitle}>
                  {category.displayName.toUpperCase()}
                </ThemedText>
                {category.image && (
                  <Image
                    source={imageSource(category.image)}
                    style={styles.categoryImage}
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
        'Coming soon',
        'Home & Lifestyle is on its way. Check back shortly.'
      );
    }
    if (directoryQuery.isPending) {
      return (
        <View style={styles.placeholderContainer}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      );
    }
    if (directoryQuery.isError) {
      return renderRetry("Couldn't load brands", () => directoryQuery.refetch());
    }
    if (brands.length === 0) {
      return renderPlaceholder('No brands yet', 'New brands are joining YIIVA soon.');
    }

    return (
      <View style={styles.brandsContainer}>
        {/* Alphabetical Index — letters without brands render greyed */}
        <View style={styles.alphabetIndex}>
          {ALPHABET.map((letter) => {
            const hasBrands = lettersWithBrands.has(letter);
            return (
              <TouchableOpacity
                key={letter}
                style={styles.alphabetItem}
                onPress={() => hasBrands && handleLetterPress(letter)}
                disabled={!hasBrands}
              >
                <ThemedText
                  style={[styles.alphabetText, !hasBrands && styles.alphabetTextEmpty]}
                >
                  {letter}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Brands List */}
        <ScrollView
          ref={brandsScrollRef}
          style={styles.brandsScrollView}
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
              <View style={styles.letterHeader}>
                <ThemedText style={styles.letterHeaderText}>{letter}</ThemedText>
              </View>
              {groupedBrands[letter].map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={styles.brandItem}
                  onPress={() => handleBrandPress(brand)}
                  activeOpacity={0.9}
                >
                  {brand.logo ? (
                    <Image source={imageSource(brand.logo)} style={styles.brandLogo} />
                  ) : (
                    <View style={[styles.brandLogo, styles.brandLogoPlaceholder]}>
                      <ThemedText style={styles.brandLogoInitial}>
                        {brand.displayName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <ThemedText style={styles.brandName}>{brand.displayName}</ThemedText>
                  <ThemedText style={styles.brandChevron}>›</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {directoryQuery.isFetchingNextPage && (
            <ActivityIndicator size="small" color="#333" style={styles.pagingSpinner} />
          )}
        </ScrollView>
      </View>
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
        unreadCount={unreadNotifications.data?.unreadCount ?? 0}
      />

      <FeedTabs />

      {/* Shop Filter Toggle */}
      <View style={styles.shopFilterContainer}>
        <View style={styles.shopFilterToggle}>
          <TouchableOpacity
            style={[
              styles.shopFilterButton,
              styles.leftButton,
              shopFilterMode === 'brands' && styles.activeShopFilterButton
            ]}
            onPress={() => handleShopFilterChange('brands')}
          >
            <ThemedText style={[
              styles.shopFilterText,
              shopFilterMode === 'brands' && styles.activeShopFilterText
            ]}>
              Brands
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shopFilterButton,
              styles.rightButton,
              shopFilterMode === 'categories' && styles.activeShopFilterButton
            ]}
            onPress={() => handleShopFilterChange('categories')}
          >
            <ThemedText style={[
              styles.shopFilterText,
              shopFilterMode === 'categories' && styles.activeShopFilterText
            ]}>
              Categories
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {shopFilterMode === 'categories' ? renderCategoriesView() : renderBrandsView()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
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
  shopFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  shopFilterToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
    position: 'relative',
  },
  shopFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  leftButton: {
    marginRight: 1,
  },
  rightButton: {
    marginLeft: 1,
  },
  activeShopFilterButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shopFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeShopFilterText: {
    color: '#333',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 24,
    minHeight: 100,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    letterSpacing: 0.5,
  },
  categoryImage: {
    width: 80,
    height: 60,
    marginLeft: 16,
    borderRadius: 8,
  },
  brandsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  alphabetIndex: {
    width: 30,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  alphabetItem: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  alphabetText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  alphabetTextEmpty: {
    color: '#ccc',
  },
  brandsScrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  letterHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  letterHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: '#f5f5f5',
  },
  brandLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
  },
  brandLogoInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  brandName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  brandChevron: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: '300',
  },
});
