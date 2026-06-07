import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';

interface ProductCardProps {
  productImage: any;
  profileImage?: any;
  artistName: string;
  productTitle: string;
  price: string;
  timestamp?: string;
  location?: string;
  productId?: string;
  artistId?: string;
  onBookmark?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export function ProductCard({
  productImage,
  profileImage,
  artistName,
  productTitle,
  price,
  timestamp,
  location,
  productId,
  artistId,
  onBookmark,
  onLike,
  isLiked = false,
  isBookmarked = false,
}: ProductCardProps) {
  const router = useRouter();

  const handleArtistPress = () => {
    // Use provided artistId or fallback to converting artist name
    const id = artistId || artistName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/artist/${id}`);
  };

  const handleProductPress = () => {
    if (productId) {
      router.push(`/product/${productId}`);
    }
  };
  return (
    <ThemedView style={styles.container}>
      {/* Product Image */}
      <TouchableOpacity style={styles.imageContainer} onPress={handleProductPress} activeOpacity={0.9}>
        <Image source={productImage} style={styles.productImage} />
      </TouchableOpacity>
      
      {/* Product Info Footer */}
      <View style={styles.productFooter}>
        <View style={styles.productInfo}>
          <ThemedText style={styles.productTitle}>{productTitle}</ThemedText>
          <View style={styles.artistRow}>
            <TouchableOpacity onPress={handleArtistPress} activeOpacity={0.7} style={styles.artistNameContainer}>
              <ThemedText style={styles.artistName}>
                <ThemedText style={styles.byText}>By </ThemedText>
                {artistName}
              </ThemedText>
            </TouchableOpacity>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
                <IconSymbol
                  name={isBookmarked ? "bookmark.fill" : "bookmark"}
                  size={24}
                  color="#000"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={onLike}>
                <IconSymbol
                  name={isLiked ? "heart.fill" : "heart"}
                  size={24}
                  color={isLiked ? "#ff0000" : "#000"}
                />
              </TouchableOpacity>
            </View>
          </View>
          <ThemedText style={styles.price}>{price}</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: '#fff',
    width: '97%',
    alignSelf: 'center',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  artistName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  byText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    fontStyle: 'italic',
  },
  imageContainer: {
    marginBottom: 3.6,
  },
  productImage: {
    width: '100%',
    height: 370,
    backgroundColor: '#f0f0f0',
  },
  productFooter: {
    paddingVertical: 2.4,
    paddingHorizontal: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: -4,
    lineHeight: 18,
    fontFamily: 'RobotoMono',
  },
  price: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginTop: -4,
    lineHeight: 18,
    fontFamily: 'Didot',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -4,
  },
  artistNameContainer: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});