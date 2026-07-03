import { Image } from 'expo-image';
import React from 'react';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import { Text } from './ui/text';
import { useThemeColors } from '@/lib/theme';

interface GridItem {
  id: string;
  image: any;
  brand?: string;
  title: string;
  price: string;
}

interface EvenGridProps {
  data: GridItem[];
  onItemPress: (item: GridItem) => void;
  ListHeaderComponent?: () => React.ReactElement;
}

const screenWidth = Dimensions.get('window').width;
const itemWidth = (screenWidth - 48) / 2; // Account for padding and gap

// Plain mapped grid (not a FlatList): this component renders inside the
// merchant profile's vertical ScrollView, where a nested VirtualizedList
// can't window anyway and RN warns. The outer ScrollView owns scrolling +
// infinite-scroll pagination.
export function EvenGrid({ data, onItemPress, ListHeaderComponent }: EvenGridProps) {
  const colors = useThemeColors();

  const renderItem = (item: GridItem) => (
    <TouchableOpacity
      key={item.id}
      style={{ width: itemWidth }}
      className="bg-card"
      onPress={() => onItemPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={item.image}
        // 2:3 portrait — matches ProductCard/rail proportions app-wide.
        style={{
          width: '100%',
          aspectRatio: 2 / 3,
          borderRadius: 12,
          marginBottom: 8,
          backgroundColor: colors.muted,
        }}
        contentFit="cover"
        transition={200}
      />
      <View className="px-1">
        <Text variant="caption" numberOfLines={2} className="mb-1 font-semibold text-foreground">
          {item.title}
        </Text>
        {item.brand && (
          <Text variant="micro" className="mb-1.5 italic">
            By {item.brand}
          </Text>
        )}
        <Text variant="label" className="text-[14px]">
          {item.price}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const rows: GridItem[][] = [];
  for (let i = 0; i < data.length; i += 2) {
    rows.push(data.slice(i, i + 2));
  }

  return (
    <View className="flex-1 bg-background">
      {ListHeaderComponent && <ListHeaderComponent />}
      <View className="px-4 pb-[100px] pt-4">
        {rows.map((rowItems, rowIndex) => (
          <View key={rowItems[0]?.id ?? rowIndex} className="mb-5 flex-row justify-between">
            {rowItems.map(renderItem)}
          </View>
        ))}
      </View>
    </View>
  );
}
