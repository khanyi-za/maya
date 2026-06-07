import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

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

export function MasonryGrid({ 
  data, 
  onItemPress, 
  renderItem: customRenderItem,
  spacing = 8,
  columns = 2 
}: MasonryGridProps) {
  const itemWidth = (width - 40 - (spacing * (columns - 1))) / columns;
  
  // Split data into columns
  const columnArrays: MasonryItem[][] = Array.from({ length: columns }, () => []);
  data.forEach((item, index) => {
    columnArrays[index % columns].push(item);
  });

  const defaultRenderItem = (item: MasonryItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.item, { width: itemWidth }]}
      onPress={() => onItemPress?.(item)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={[
            styles.image,
            { height: item.height || Math.floor(Math.random() * 100) + 200 }, // Random height for masonry effect
          ]}
          contentFit="cover"
        />
      </View>
      
      <View style={styles.itemContent}>
        {item.brand && <ThemedText style={styles.brand}>{item.brand}</ThemedText>}
        <ThemedText style={styles.title} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.price}>{item.price}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { gap: spacing }]}>
      {columnArrays.map((columnData, columnIndex) => (
        <View key={columnIndex} style={[styles.column, { gap: spacing }]}>
          {columnData.map((item) => 
            customRenderItem ? customRenderItem({ item }) : defaultRenderItem(item)
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  itemContent: {
    padding: 12,
  },
  brand: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Didot',
  },
});