import { MasonryGrid } from '@/components/MasonryGrid';
import { ProductCard } from '@/components/ProductCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, StatusBar } from 'react-native';

interface BookmarkedItem {
  id: string;
  productImage: any;
  artistName: string;
  productTitle: string;
  price: string;
  bookmarkedAt: string;
}

// Sample bookmarked items - in a real app this would come from user's saved items
const bookmarkedItems: BookmarkedItem[] = [
  {
    id: '1',
    productImage: require('@/assets/mock-data/tol-thema/Plain Lindy -round neck.png'),
    artistName: 'Tol-thema',
    productTitle: 'Plain Lindy - Round Neck',
    price: 'R1,150',
    bookmarkedAt: '2 days ago'
  },
  {
    id: '2',
    productImage: require('@/assets/images/masonwabe_jersey.png'),
    artistName: 'Masonwabe Ntloko',
    productTitle: 'Sisipho rectangular Rug',
    price: 'R3,600',
    bookmarkedAt: '5 days ago'
  },
  {
    id: '3',
    productImage: require('@/assets/mock-data/tol-thema/Snatched kimono barbie.png'),
    artistName: 'Tol-thema',
    productTitle: 'Snatched Waist Kimono',
    price: 'R1,250',
    bookmarkedAt: '1 week ago'
  },
];

export default function BookmarksScreen() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleBookmarkRemove = (itemId: string) => {
    // Handle removing bookmark
    console.log('Remove bookmark:', itemId);
  };

  const handleLike = () => {
    // Handle like action
    console.log('Liked');
  };


  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'grid' : 'list');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="bookmark" size={64} color="#ccc" />
      <ThemedText style={styles.emptyTitle}>No bookmarks yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Save products you love by tapping the bookmark icon
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Wishlist</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleViewMode} style={styles.viewToggle}>
            <IconSymbol 
              name={viewMode === 'list' ? 'square.grid.2x2' : 'list.bullet'} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {bookmarkedItems.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.content}>
            {viewMode === 'list' ? (
              // List view with ProductCards
              <View style={styles.listView}>
                {bookmarkedItems.map((item) => (
                  <View key={item.id} style={styles.bookmarkItem}>
                    <ProductCard
                      productImage={item.productImage}
                      artistName={item.artistName}
                      productTitle={item.productTitle}
                      price={item.price}
                      productId={item.id}
                      onBookmark={() => handleBookmarkRemove(item.id)}
                      onLike={handleLike}
                    />
                    <View style={styles.bookmarkMeta}>
                      <ThemedText style={styles.bookmarkTime}>
                        Saved {item.bookmarkedAt}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              // Grid view with MasonryGrid
              <View style={styles.gridView}>
                <MasonryGrid
                  data={bookmarkedItems.map(item => ({
                    id: item.id,
                    image: item.productImage,
                    brand: item.artistName,
                    title: item.productTitle,
                    price: item.price,
                    height: Math.floor(Math.random() * 100) + 200,
                  }))}
                  onItemPress={(item) => console.log('Grid item pressed:', item.title)}
                  spacing={12}
                  columns={2}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggle: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  listView: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  gridView: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bookmarkItem: {
    marginBottom: 16,
  },
  bookmarkMeta: {
    paddingLeft: 4,
    marginTop: 8,
  },
  bookmarkTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});