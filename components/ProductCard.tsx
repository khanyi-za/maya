import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { Text } from './ui/text';
import { useThemeColors } from '@/lib/theme';
import { haptics } from '@/lib/haptics';

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
  /** Observe product taps (e.g. search-click analytics); navigation still happens. */
  onPress?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

// YIIVA redesign — token-driven card, type-scale text, animated (press-scale)
// like/bookmark, token icon colors (like = the shared like token, not #ff0000).
// Kills the old negative-margin spacing hacks + unloaded font families.
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

export function ProductCard({
  productImage,
  artistName,
  productTitle,
  price,
  productId,
  artistId,
  onBookmark,
  onLike,
  onPress,
  isLiked = false,
  isBookmarked = false,
}: ProductCardProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const handleArtistPress = () => {
    const id = artistId || artistName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/artist/${id}`);
  };

  const handleProductPress = () => {
    onPress?.();
    if (productId) {
      router.push(`/product/${productId}`);
    }
  };

  return (
    <View
      className="mb-5 w-[97%] self-center overflow-hidden rounded-lg border border-border bg-card"
      style={CARD_SHADOW}
    >
      <TouchableOpacity onPress={handleProductPress} activeOpacity={0.9}>
        <Image
          source={productImage}
          style={{ width: '100%', height: 370, backgroundColor: colors.muted }}
        />
      </TouchableOpacity>

      <View className="gap-1 px-3 pb-2.5 pt-2">
        <Text variant="label" numberOfLines={1}>
          {productTitle}
        </Text>

        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleArtistPress} activeOpacity={0.7} className="flex-1">
            <Text variant="caption" numberOfLines={1}>
              <Text variant="caption" className="italic">
                By{' '}
              </Text>
              {artistName}
            </Text>
          </TouchableOpacity>

          <View className="flex-row gap-1">
            <Pressable
              onPress={() => {
                haptics.light();
                onBookmark?.();
              }}
              className="p-1.5 active:scale-90"
            >
              <IconSymbol
                name={isBookmarked ? 'bookmark.fill' : 'bookmark'}
                size={22}
                color={isBookmarked ? colors.brand : colors.foreground}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.light();
                onLike?.();
              }}
              className="p-1.5 active:scale-90"
            >
              <IconSymbol
                name={isLiked ? 'heart.fill' : 'heart'}
                size={22}
                color={isLiked ? colors.like : colors.foreground}
              />
            </Pressable>
          </View>
        </View>

        <Text variant="label">{price}</Text>
      </View>
    </View>
  );
}
