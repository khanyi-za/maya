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
  Keyboard,
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
  useCategorySearchResults,
  useDebouncedValue,
  useSearchResults,
  useSearchSuggestions,
  useTrackSearch,
} from '@/hooks/useSearchQueries';
import { useCategories } from '@/hooks/useHomeQueries';
import { trackSearch } from '@/lib/api-client';
import { track } from '@/lib/analytics';

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
  // Active category-scoped search (browse rail tap). Typing/submitting a text
  // query clears it — the two result sources are mutually exclusive.
  const [categorySearch, setCategorySearch] = useState<{ slug: string; label: string } | null>(null);

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

  // Universal text search is suspended (empty query disables it) while a
  // category-scoped search is active.
  const resultsQuery = useSearchResults(categorySearch ? '' : effectiveQuery, gender);
  const categoryResultsQuery = useCategorySearchResults(categorySearch?.slug ?? null, gender);
  const activeQuery = categorySearch ? categoryResultsQuery : resultsQuery;
  const suggestionsQuery = useSearchSuggestions();
  // Real categories for the browse rail (gender-aware, same source as Home).
  const categoriesQuery = useCategories(gender ?? null);
  const browseCategories = categoriesQuery.data?.categories ?? [];

  const searchResults: Product[] =
    activeQuery.data?.pages.flatMap((page) => page.products) ?? [];
  const firstPageCount = resultsQuery.data?.pages[0]?.products.length;
  // Text searches only — the category endpoint tracks itself server-side.
  useTrackSearch(
    categorySearch ? '' : effectiveQuery,
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
    setCategorySearch(null);
  };

  const handleSubmit = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setInstantQuery(trimmed);
    setCategorySearch(null);
    saveRecent(trimmed);
  };

  // Explicit way out of search mode — blur alone only exits when the query is
  // empty, which made leaving results awkward.
  const handleCancel = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setInstantQuery(null);
    setCategorySearch(null);
    setIsSearchFocused(false);
  };
  const clearRecentSearch = (index: number) => {
    setRecentSearches((prev) => {
      const next = prev.filter((_, i) => i !== index);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  };

  // Tapping a category card runs a CATEGORY-scoped search (precise membership
  // via /search/category, not a text match). The category's name fills the
  // field for context. CategoryFilter's reset effect fires
  // onCategoryChange('All') on mount/tab change — ignore it.
  const handleCategoryChange = useCallback(
    (slug: string) => {
      if (slug === 'All') return;
      const cat = categoriesQuery.data?.categories.find((c) => c.slug === slug);
      const label = cat?.displayName ?? slug;
      setSearchQuery(label);
      setInstantQuery(label);
      setCategorySearch({ slug, label });
    },
    [categoriesQuery.data]
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
    if (nearBottom && activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setIsSearchFocused(false);
      setSearchQuery('');
      setInstantQuery(null);
      setCategorySearch(null);
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
              onPress={() => {
                // Ranking feedback signal (phalo-search.md S2). Best-effort.
                trackSearch({
                  q: effectiveQuery,
                  genderType: gender,
                  clickedProductId: product.id,
                  position: rowIndex * 2 + colIndex,
                }).catch(() => {});
                track('search_result_clicked', {
                  query: effectiveQuery,
                  productId: product.id,
                  position: rowIndex * 2 + colIndex,
                });
              }}
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
      <SideMenu visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
      {/* Search Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-background px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        {/* Hamburger hidden while searching to make room for Cancel. */}
        {!isSearchFocused && !isSearching && (
          <TouchableOpacity
            onPress={() => setIsMenuVisible(true)}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <IconSymbol name="line.3.horizontal" size={22} color={colors.foreground} />
          </TouchableOpacity>
        )}

        <View className="h-11 flex-1 flex-row items-center rounded-xl bg-muted px-3">
          <IconSymbol
            name="magnifyingglass"
            size={20}
            color={colors.mutedForeground}
            style={{ marginRight: 8 }}
          />
          <Input
            className="h-full flex-1 border-0 bg-transparent px-0 text-base"
            placeholder="Search brands and products…"
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
            <TouchableOpacity
              onPress={() => handleTextChange('')}
              className="ml-2"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {(isSearchFocused || isSearching) && (
          <TouchableOpacity onPress={handleCancel} accessibilityRole="button">
            <Text variant="body" className="text-brand">
              Cancel
            </Text>
          </TouchableOpacity>
        )}
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
            <CategoryFilter
              onCategoryChange={handleCategoryChange}
              primaryFilter={activePrimaryFilter}
              categories={browseCategories}
              showAll={false}
            />
          ) : (
            <View className="px-5 pt-4">
              {recentSearches.length > 0 && (
                <View className="mb-8">
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text variant="heading">Recent Searches</Text>
                    <TouchableOpacity onPress={clearAllRecentSearches} accessibilityRole="button">
                      <Text variant="caption" className="text-brand">
                        Clear all
                      </Text>
                    </TouchableOpacity>
                  </View>
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
          keyboardDismissMode="on-drag"
        >
          <View className="pt-4">
            {activeQuery.isPending ? (
              <View className="px-3">
                {[0, 1, 2].map((r) => (
                  <View key={r} className="mb-3 flex-row gap-3">
                    <Skeleton className="aspect-[2/3] flex-1 rounded-xl" />
                    <Skeleton className="aspect-[2/3] flex-1 rounded-xl" />
                  </View>
                ))}
              </View>
            ) : activeQuery.isError ? (
              <View className="items-center px-10 pt-[60px]">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <IconSymbol name="wifi.slash" size={28} color={colors.mutedForeground} />
                </View>
                <Text variant="heading" className="mb-2 mt-4">
                  Search failed
                </Text>
                <Text variant="caption" className="text-center">
                  Couldn&apos;t reach YIIVA. Check your connection and try again.
                </Text>
                <Button
                  variant="brand"
                  size="sm"
                  className="mt-4 px-8"
                  onPress={() => activeQuery.refetch()}
                >
                  Retry
                </Button>
              </View>
            ) : searchResults.length > 0 ? (
              <>
                <Text variant="body" className="mb-5 px-5 font-medium text-muted-foreground">
                  {searchResults.length}
                  {activeQuery.hasNextPage ? '+' : ''} result
                  {searchResults.length !== 1 || activeQuery.hasNextPage ? 's' : ''}
                  {categorySearch ? ` in ${categorySearch.label}` : ` for "${effectiveQuery}"`}
                </Text>
                <View
                  className={cn('pb-[100px]', activeQuery.isPlaceholderData && 'opacity-50')}
                >
                  {renderResultsGrid()}
                  {activeQuery.isFetchingNextPage && (
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
                <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <IconSymbol name="magnifyingglass" size={28} color={colors.mutedForeground} />
                </View>
                <Text variant="heading" className="mb-2 mt-4">
                  No results found
                </Text>
                <Text variant="caption" className="text-center">
                  Try adjusting your search or browse by category
                </Text>
                {trendingTags.length > 0 && (
                  <View className="mt-5 flex-row flex-wrap justify-center gap-2">
                    {trendingTags.slice(0, 6).map((tag) => (
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
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
