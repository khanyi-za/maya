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
  const handleArtistPress = (artistName: string) => {
    const artistId = artistName.toLowerCase().replace(/\s+/g, '-');
    router.push(`/artist/${artistId}`);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity className="w-40" onPress={() => handleProductPress(item.id)} activeOpacity={0.8}>
      <Image
        source={item.image}
        style={{ width: '100%', height: 180, borderRadius: 8, marginBottom: 8, backgroundColor: colors.muted }}
      />
      <View className="gap-1 px-1">
        <Text className="text-[13px] font-semibold leading-4 text-foreground" numberOfLines={2}>
          {item.title}
        </Text>
        <TouchableOpacity onPress={() => handleArtistPress(item.artistName)}>
          <Text className="text-[11px] italic text-muted-foreground">By {item.artistName}</Text>
        </TouchableOpacity>
        <Text className="text-[14px] font-semibold text-foreground">{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="bg-card py-5">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-[16px] font-bold tracking-wide text-foreground">{title.toUpperCase()}</Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text className="text-[14px] font-medium text-brand">See All</Text>
        </TouchableOpacity>
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
