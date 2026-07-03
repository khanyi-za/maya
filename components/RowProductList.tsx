import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { Text } from './ui/text';
import { useThemeColors } from '@/lib/theme';

interface Product {
  id: string;
  image: any;
  title: string;
  artistName: string;
  /** Merchant username (route param). Without it the artist link falls back to a
      display-name slug, which 404s whenever username ≠ slugified display name. */
  artistUsername?: string;
  price: string;
}

interface RowProductListProps {
  title: string;
  products: Product[];
  onSeeAll?: () => void;
}

// YIIVA redesign — token-driven horizontal rail (New Arrivals etc.).
export function RowProductList({ title, products, onSeeAll }: RowProductListProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const handleProductPress = (productId: string) => router.push(`/product/${productId}`);
  // No slug-guessing: a display-name slug usually isn't the username and 404s.
  const handleArtistPress = (item: Product) => {
    if (item.artistUsername) router.push(`/artist/${item.artistUsername}`);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity className="w-40" onPress={() => handleProductPress(item.id)} activeOpacity={0.8}>
      <Image
        source={item.image}
        // 2:3 portrait — same ratio as ProductCard so rails and grids match.
        style={{ width: '100%', aspectRatio: 2 / 3, borderRadius: 12, marginBottom: 8, backgroundColor: colors.muted }}
        contentFit="cover"
        transition={200}
      />
      <View className="gap-1 px-1">
        <Text variant="label" className="text-[13px] leading-4" numberOfLines={2}>
          {item.title}
        </Text>
        <TouchableOpacity onPress={() => handleArtistPress(item)} disabled={!item.artistUsername}>
          <Text variant="micro" className="italic font-normal">
            By {item.artistName}
          </Text>
        </TouchableOpacity>
        <Text variant="label" className="text-[14px]">
          {item.price}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="bg-card py-5">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text variant="label" className="text-[16px] tracking-wide">
          {title.toUpperCase()}
        </Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
            <Text className="text-[14px] font-medium text-brand">See All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View className="w-3" />}
      />
    </View>
  );
}
