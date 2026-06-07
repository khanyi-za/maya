import { CategoryFilter } from '@/components/CategoryFilter';
import { ProductCard } from '@/components/ProductCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SideMenu } from '@/components/SideMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSocialStore } from '@/lib/social-store';
import { getLocalAsset } from '@/lib/local-assets';
import { searchDummyProducts } from '@/lib/dummy-data';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Abstract Art',
    'Handmade Rugs',
    'Urban Style',
    'Local Artists',
  ]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasBeenInteracted, setHasBeenInteracted] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const { toggleLike, toggleBookmark, isLiked, isBookmarked } = useSocialStore();

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = isSearching ? searchDummyProducts(searchQuery) : [];
  const totalResults = searchResults.length;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0 && !recentSearches.includes(query.trim())) {
      setRecentSearches([query.trim(), ...recentSearches.slice(0, 4)]);
    }
  };

  const handleRecentSearchPress = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    setHasBeenInteracted(true);
  };

  const clearRecentSearch = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  const handleBookmark = (productId: string) => toggleBookmark(productId);
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
    setHasBeenInteracted(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      setIsSearchFocused(false);
      setSearchQuery('');

      return () => {
        setHasBeenInteracted(false);
      };
    }, [])
  );

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
            onChangeText={handleSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
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
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Recent Searches</ThemedText>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => handleRecentSearchPress(search)}
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

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Trending</ThemedText>
              <View style={styles.trendingTags}>
                {[
                  '#HandmadeArt',
                  '#LocalArtists',
                  '#VintageRugs',
                  '#ModernDesign',
                  '#SouthAfricanArt',
                ].map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.trendingTag}
                    onPress={() => handleSearch(tag.substring(1))}
                  >
                    <ThemedText style={styles.trendingTagText}>{tag}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.backToGridArea}
            onPress={handleBackToGrid}
            activeOpacity={1}
          />
        </ScrollView>
      )}

      {isSearching && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsContainer}>
            <ThemedText style={styles.resultsHeader}>
              {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
            </ThemedText>

            {searchResults.length > 0 && (
              <View style={styles.results}>
                {(() => {
                  const content = [];
                  for (let i = 0; i < searchResults.length; i += 2) {
                    const rowProducts = [];

                    const product1 = searchResults[i];
                    const productImage1 = getLocalAsset(product1.primaryImage);
                    const merchantLogo1 = product1.merchant.logo ? getLocalAsset(product1.merchant.logo) : undefined;

                    rowProducts.push(
                      <View key={product1.id} style={styles.gridItem}>
                        <ProductCard
                          productImage={productImage1 || { uri: product1.primaryImage }}
                          profileImage={merchantLogo1}
                          artistName={product1.merchant.displayName}
                          productTitle={product1.name}
                          price={`R${product1.price.toFixed(2)}`}
                          location={product1.merchant.username}
                          productId={product1.id}
                          artistId={product1.merchant.username}
                          onBookmark={() => handleBookmark(product1.id)}
                          onLike={() => handleLike(product1.id)}
                          isLiked={isLiked(product1.id)}
                          isBookmarked={isBookmarked(product1.id)}
                        />
                      </View>
                    );

                    if (i + 1 < searchResults.length) {
                      const product2 = searchResults[i + 1];
                      const productImage2 = getLocalAsset(product2.primaryImage);
                      const merchantLogo2 = product2.merchant.logo ? getLocalAsset(product2.merchant.logo) : undefined;

                      rowProducts.push(
                        <View key={product2.id} style={styles.gridItem}>
                          <ProductCard
                            productImage={productImage2 || { uri: product2.primaryImage }}
                            profileImage={merchantLogo2}
                            artistName={product2.merchant.displayName}
                            productTitle={product2.name}
                            price={`R${product2.price.toFixed(2)}`}
                            location={product2.merchant.username}
                            productId={product2.id}
                            artistId={product2.merchant.username}
                            onBookmark={() => handleBookmark(product2.id)}
                            onLike={() => handleLike(product2.id)}
                            isLiked={isLiked(product2.id)}
                            isBookmarked={isBookmarked(product2.id)}
                          />
                        </View>
                      );
                    }

                    content.push(
                      <View key={`row-${i}`} style={styles.gridRow}>
                        {rowProducts}
                      </View>
                    );
                  }
                  return content;
                })()}
              </View>
            )}

            {searchResults.length === 0 && (
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
