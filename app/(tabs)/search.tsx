import { CategoryFilter } from '@/components/CategoryFilter';
import { ProductCard } from '@/components/ProductCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SideMenu } from '@/components/SideMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
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

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 5;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
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

  const handleBackToGrid = () => {
    setIsSearchFocused(false);
    setSearchQuery('');
    setInstantQuery(null);
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
      <View key={`row-${rowIndex}`} style={styles.gridRow}>
        {rowProducts.map((product) => (
          <View key={product.id} style={styles.gridItem}>
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
              isLiked={isLiked(product.id)}
              isBookmarked={resolveBookmarked(bookmarked, product.id, product.isBookmarkedByMe)}
            />
          </View>
        ))}
      </View>
    ));
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SideMenu
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        userName="Khanyisomthamo2"
      />
      {/* Search Header */}
      <View style={[styles.searchHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.menuButton}>
          <View style={styles.menuIcon}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <IconSymbol name="magnifyingglass" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists, products, locations..."
            placeholderTextColor="#999"
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
            <TouchableOpacity onPress={() => handleTextChange('')} style={styles.clearButton}>
              <IconSymbol name="xmark.circle.fill" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      {!isSearchFocused && !isSearching && (
        <CategoryFilter onCategoryChange={handleCategoryChange} searchMode={true} />
      )}

      {isSearchFocused && !isSearching && (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Recent Searches</ThemedText>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => handleSubmit(search)}
                  >
                    <IconSymbol name="clock" size={16} color="#666" />
                    <ThemedText style={styles.recentSearchText}>{search}</ThemedText>
                    <TouchableOpacity
                      onPress={() => clearRecentSearch(index)}
                      style={styles.clearRecentButton}
                    >
                      <IconSymbol name="xmark" size={14} color="#999" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {trendingTags.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Trending</ThemedText>
                <View style={styles.trendingTags}>
                  {trendingTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.trendingTag}
                      onPress={() => handleSubmit(tag.replace(/^#/, ''))}
                    >
                      <ThemedText style={styles.trendingTagText}>{tag}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.backToGridArea}
            onPress={handleBackToGrid}
            activeOpacity={1}
          />
        </ScrollView>
      )}

      {isSearching && (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={handleResultsScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.resultsContainer}>
            {resultsQuery.isPending ? (
              <View style={styles.noResults}>
                <ActivityIndicator size="large" color="#333" />
              </View>
            ) : resultsQuery.isError ? (
              <View style={styles.noResults}>
                <ThemedText style={styles.noResultsTitle}>Search failed</ThemedText>
                <ThemedText style={styles.noResultsText}>
                  Couldn&apos;t reach YIIVA. Check your connection and try again.
                </ThemedText>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => resultsQuery.refetch()}
                >
                  <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                </TouchableOpacity>
              </View>
            ) : searchResults.length > 0 ? (
              <>
                <ThemedText style={styles.resultsHeader}>
                  {searchResults.length}
                  {resultsQuery.hasNextPage ? '+' : ''} result
                  {searchResults.length !== 1 || resultsQuery.hasNextPage ? 's' : ''} for &quot;
                  {effectiveQuery}&quot;
                </ThemedText>
                <View
                  style={[styles.results, resultsQuery.isPlaceholderData && styles.resultsStale]}
                >
                  {renderResultsGrid()}
                  {resultsQuery.isFetchingNextPage && (
                    <ActivityIndicator size="small" color="#333" style={styles.pagingSpinner} />
                  )}
                </View>
              </>
            ) : (
              <View style={styles.noResults}>
                <IconSymbol name="magnifyingglass" size={48} color="#ccc" />
                <ThemedText style={styles.noResultsTitle}>No results found</ThemedText>
                <ThemedText style={styles.noResultsText}>
                  Try adjusting your search or browse by category
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {!isSearchFocused && !isSearching && (
        <View style={styles.placeholderContainer}>
          <IconSymbol name="magnifyingglass" size={64} color="#ccc" />
          <ThemedText style={styles.placeholderTitle}>Search for products</ThemedText>
          <ThemedText style={styles.placeholderText}>
            Search by product name, category, or brand name
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    gap: 3,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  clearButton: {
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentSearchText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  clearRecentButton: {
    padding: 4,
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trendingTagText: {
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    paddingTop: 16,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  results: {
    paddingBottom: 100,
  },
  resultsStale: {
    opacity: 0.5,
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
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
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
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  backToGridArea: {
    flex: 1,
    minHeight: 200,
    backgroundColor: 'transparent',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
