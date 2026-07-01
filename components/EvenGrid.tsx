import { Image } from 'expo-image';
import React from 'react';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import { Text } from './ui/text';
import { IconSymbol } from './ui/IconSymbol';
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
        style={{
          width: '100%',
          height: 220,
          borderRadius: 8,
          marginBottom: 8,
          backgroundColor: colors.muted,
        }}
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
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-foreground">{item.price}</Text>
          <TouchableOpacity className="p-1">
            <IconSymbol name="heart" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
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
