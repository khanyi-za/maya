import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface Product {
  id: string;
  image: any;
  title: string;
  artistName: string;
  price: string;
}

interface RowProductListProps {
  title: string;
  products: Product[];
  onSeeAll?: () => void;
}

export function RowProductList({ title, products, onSeeAll }: RowProductListProps) {
  const router = useRouter();

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleArtistPress = (artistName: string) => {
    const artistId = artistName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/artist/${artistId}`);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={() => handleProductPress(item.id)}
      activeOpacity={0.8}
    >
      <Image source={item.image} style={styles.productImage} />
      <View style={styles.productInfo}>
        <ThemedText style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <TouchableOpacity onPress={() => handleArtistPress(item.artistName)}>
          <ThemedText style={styles.artistName}>By {item.artistName}</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.price}>{item.price}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header with title and See All */}
      <View style={styles.header}>
        <ThemedText style={styles.sectionTitle}>{title.toUpperCase()}</ThemedText>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <ThemedText style={styles.seeAllText}>See All</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Horizontal product list */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    textDecorationLine: 'underline',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  separator: {
    width: 12,
  },
  productCard: {
    width: 160,
    backgroundColor: '#fff',
  },
  productImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    paddingHorizontal: 4,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    lineHeight: 16,
  },
  artistName: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Didot',
  },
});