import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from './ui/text';
import { useThemeColors } from '@/lib/theme';

interface MasonryItem {
  id: string;
  image: any;
  brand?: string;
  title: string;
  price: string;
  height?: number;
  [key: string]: any; // Allow additional properties
}

interface MasonryGridProps {
  data: MasonryItem[];
  onItemPress?: (item: MasonryItem) => void;
  renderItem?: ({ item }: { item: MasonryItem }) => React.ReactNode;
  spacing?: number;
  columns?: number;
}

const { width } = Dimensions.get('window');

// Raised-card elevation (RN shadow utilities are limited via className).
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
};

export function MasonryGrid({
  data,
  onItemPress,
  renderItem: customRenderItem,
  spacing = 8,
  columns = 2,
}: MasonryGridProps) {
  const colors = useThemeColors();
  const itemWidth = (width - 40 - (spacing * (columns - 1))) / columns;

  // Split data into columns
  const columnArrays: MasonryItem[][] = Array.from({ length: columns }, () => []);
  data.forEach((item, index) => {
    columnArrays[index % columns].push(item);
  });

  const defaultRenderItem = (item: MasonryItem) => (
    <TouchableOpacity
      key={item.id}
      style={[{ width: itemWidth }, CARD_SHADOW]}
      className="overflow-hidden rounded-xl bg-card"
      onPress={() => onItemPress?.(item)}
      activeOpacity={0.9}
    >
      <View className="relative">
        <Image
          source={item.image}
          style={{
            width: '100%',
            height: item.height || Math.floor(Math.random() * 100) + 200, // Random height for masonry effect
            borderRadius: 12,
            backgroundColor: colors.muted,
          }}
          contentFit="cover"
        />
      </View>

      <View className="p-3">
        {item.brand && (
          <Text variant="caption" className="mb-1 font-medium">
            {item.brand}
          </Text>
        )}
        <Text variant="label" numberOfLines={2} className="mb-1.5">
          {item.title}
        </Text>
        <Text className="text-base font-bold text-foreground">{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-row" style={{ gap: spacing }}>
      {columnArrays.map((columnData, columnIndex) => (
        <View key={columnIndex} className="flex-1" style={{ gap: spacing }}>
          {columnData.map((item) =>
            customRenderItem ? customRenderItem({ item }) : defaultRenderItem(item)
          )}
        </View>
      ))}
    </View>
  );
}
