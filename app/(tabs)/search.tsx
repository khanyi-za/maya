import { CategoryFilter } from '@/components/CategoryFilter';
import { ReelsGrid } from '@/components/ReelsGrid';
import { ProductCard } from '@/components/ProductCard';
import { SideMenu } from '@/components/SideMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useFilter } from '@/contexts/FilterContext';
import { useSocialStore } from '@/lib/social-store';
import { resolveBookmarked, useServerSocial } from '@/lib/server-social';
import { useRequireAuth, useToggleBookmark } from '@/hooks/useSocialMutations';
import { imageSource } from '@/lib/image-source';
import { formatZAR } from '@/lib/format';
import type { GenderType, Product } from '@/lib/api-client';
import {
  useDebouncedValue,
  useSearchResults,
  useSearchSuggestions,
  useTrackSearch,
} from '@/hooks/useSearchQueries';
import { trackSearch } from '@/lib/api-client';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 5;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { activePrimaryFilter } = useFilter();
  const [searchQuery, setSearchQuery] = useState('');
  // Set on submit / recent / trending tap to bypass the 250ms debounce.
  const [instantQuery, setInstantQuery] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [, setActiveCategory] = useState<string>('All');

  // Likes stay local-only in v1; bookmarks are server-backed.
  const { toggleLike, isLiked } = useSocialStore();
  const { bookmarked } = useServerSocial();
  const toggleBookmark = useToggleBookmark();
  const requireAuth = useRequireAuth();

  // Search respects the global gender tab; home-lifestyle has no backend
  // taxonomy yet so those searches go unscoped (open-questions §P-4).
  const gender: GenderType | undefined =
    activePrimaryFilter === 'home-lifestyle' ? undefined : activePrimaryFilter;

  const debouncedQuery = useDebouncedValue(searchQuery, 250);
  const effectiveQuery = (instantQuery ?? debouncedQuery).trim();

  const resultsQuery = useSearchResults(effectiveQuery, gender);
  const suggestionsQuery = useSearchSuggestions();

  const searchResults: Product[] =
    resultsQuery.data?.pages.flatMap((page) => page.products) ?? [];
  const firstPageCount = resultsQuery.data?.pages[0]?.products.length;
  useTrackSearch(
    effectiveQuery,
    gender,
    resultsQuery.isSuccess && !resultsQuery.isPlaceholderData ? firstPageCount : undefined
  );

  const trendingTags = suggestionsQuery.data?.trending ?? [];
  const isSearching = searchQuery.trim().length > 0;

  // Recent searches persist on-device (contract: hydrate from AsyncStorage).
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((raw) => raw && setRecentSearches(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const saveRecent = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const handleTextChange = (query: string) => {
    setSearchQuery(query);
    setInstantQuery(null);
  };

  const handleSubmit = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setInstantQuery(trimmed);
    saveRecent(trimmed);
  };

  const clearRecentSearch = (index: number) => {
    setRecentSearches((prev) => {
      const next = prev.filter((_, i) => i !== index);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

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

  const handleSearchFocus = () => setIsSearchFocused(true);

  const handleSearchBlur = () => {
    if (searchQuery.length === 0) {
      setIsSearchFocused(false);
    }
  };

  const handleResultsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const nearBottom =
      contentOffset.y + layoutMeasurement.height > contentSize.height - 600;
    if (nearBottom && resultsQuery.hasNextPage && !resultsQuery.isFetchingNextPage) {
      resultsQuery.fetchNextPage();
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setIsSearchFocused(false);
      setSearchQuery('');
      setInstantQuery(null);
    }, [])
  );

  const renderResultsGrid = () => {
    const rows: Product[][] = [];
    for (let i = 0; i < searchResults.length; i += 2) {
      rows.push(searchResults.slice(i, i + 2));
    }

    return rows.map((rowProducts, rowIndex) => (
      <View key={`row-${rowIndex}`} className="mb-3 flex-row gap-3 px-3">
        {rowProducts.map((product, colIndex) => (
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
              onLike={() => handleLike(product.id)}
              onPress={() =>
                // Ranking feedback signal (phalo-search.md S2). Best-effort.
                trackSearch({
                  q: effectiveQuery,
                  genderType: gender,
                  clickedProductId: product.id,
                  position: rowIndex * 2 + colIndex,
                }).catch(() => {})
              }
              isLiked={isLiked(product.id)}
              isBookmarked={resolveBookmarked(bookmarked, product.id, product.isBookmarkedByMe)}
            />
          </View>
        ))}
      </View>
    ));
  };

  return (
    <View className="flex-1 bg-background">
      <SideMenu
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        userName="Khanyisomthamo2"
      />
      {/* Search Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-background px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => setIsMenuVisible(true)} className="p-2">
          <View className="gap-[3px]">
            <View className="h-0.5 w-5 rounded-sm bg-foreground" />
            <View className="h-0.5 w-5 rounded-sm bg-foreground" />
            <View className="h-0.5 w-5 rounded-sm bg-foreground" />
          </View>
        </TouchableOpacity>

        <View className="h-11 flex-1 flex-row items-center rounded-xl bg-muted px-3">
          <IconSymbol
            name="magnifyingglass"
            size={20}
            color={colors.mutedForeground}
            style={{ marginRight: 8 }}
          />
          <Input
            className="h-full flex-1 border-0 bg-transparent px-0 text-base"
            placeholder="Search artists, products, locations..."
            value={searchQuery}
            onChangeText={handleTextChange}
            onSubmitEditing={() => handleSubmit(searchQuery)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleTextChange('')} className="ml-2">
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Browse view (not actively searching): categories ↔ trending on top,
          reels grid always below. */}
      {!isSearching && (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isSearchFocused ? (
            <CategoryFilter onCategoryChange={handleCategoryChange} searchMode={true} />
          ) : (
            <View className="px-5 pt-4">
              {recentSearches.length > 0 && (
                <View className="mb-8">
                  <Text variant="heading" className="mb-4">
                    Recent Searches
                  </Text>
                  {recentSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      className="flex-row items-center border-b border-border px-1 py-3"
                      onPress={() => handleSubmit(search)}
                    >
                      <IconSymbol name="clock" size={16} color={colors.mutedForeground} />
                      <Text variant="body" className="ml-3 flex-1 text-base">
                        {search}
                      </Text>
                      <TouchableOpacity
                        onPress={() => clearRecentSearch(index)}
                        className="p-1"
                      >
                        <IconSymbol name="xmark" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {trendingTags.length > 0 && (
                <View className="mb-8">
                  <Text variant="heading" className="mb-4">
                    Trending
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {trendingTags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        className="rounded-2xl bg-muted px-3 py-1.5"
                        onPress={() => handleSubmit(tag.replace(/^#/, ''))}
                      >
                        <Text variant="caption" className="text-sm">
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Reels stay below across both focus states. */}
          <ReelsGrid />
        </ScrollView>
      )}

      {isSearching && (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={handleResultsScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View className="pt-4">
            {resultsQuery.isPending ? (
              <View className="px-3">
                {[0, 1, 2].map((r) => (
                  <View key={r} className="mb-3 flex-row gap-3">
                    <Skeleton className="h-72 flex-1 rounded-xl" />
                    <Skeleton className="h-72 flex-1 rounded-xl" />
                  </View>
                ))}
              </View>
            ) : resultsQuery.isError ? (
              <View className="items-center px-10 pt-[60px]">
                <IconSymbol name="exclamationmark.triangle" size={48} color={colors.mutedForeground} />
                <Text variant="heading" className="mb-2 mt-4">
                  Search failed
                </Text>
                <Text variant="caption" className="text-center">
                  Couldn&apos;t reach YIIVA. Check your connection and try again.
                </Text>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onPress={() => resultsQuery.refetch()}
                >
                  Retry
                </Button>
              </View>
            ) : searchResults.length > 0 ? (
              <>
                <Text variant="body" className="mb-5 px-5 font-medium text-muted-foreground">
                  {searchResults.length}
                  {resultsQuery.hasNextPage ? '+' : ''} result
                  {searchResults.length !== 1 || resultsQuery.hasNextPage ? 's' : ''} for &quot;
                  {effectiveQuery}&quot;
                </Text>
                <View
                  className={cn('pb-[100px]', resultsQuery.isPlaceholderData && 'opacity-50')}
                >
                  {renderResultsGrid()}
                  {resultsQuery.isFetchingNextPage && (
                    <ActivityIndicator
                      size="small"
                      color={colors.mutedForeground}
                      style={{ marginVertical: 16 }}
                    />
                  )}
                </View>
              </>
            ) : (
              <View className="items-center px-10 pt-[60px]">
                <IconSymbol name="magnifyingglass" size={48} color={colors.mutedForeground} />
                <Text variant="heading" className="mb-2 mt-4">
                  No results found
                </Text>
                <Text variant="caption" className="text-center">
                  Try adjusting your search or browse by category
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
