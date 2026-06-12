import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';

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
  const renderItem = (item: GridItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.gridItem}
      onPress={() => onItemPress(item)}
      activeOpacity={0.8}
    >
      <Image source={item.image} style={styles.productImage} />
      <View style={styles.productInfo}>
        <ThemedText style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        {item.brand && (
          <ThemedText style={styles.brandName}>By {item.brand}</ThemedText>
        )}
        <View style={styles.bottomRow}>
          <ThemedText style={styles.price}>{item.price}</ThemedText>
          <TouchableOpacity style={styles.heartButton}>
            <IconSymbol name="heart" size={18} color="#666" />
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
    <View style={styles.container}>
      {ListHeaderComponent && <ListHeaderComponent />}
      <View style={styles.listContainer}>
        {rows.map((rowItems, rowIndex) => (
          <View key={rowItems[0]?.id ?? rowIndex} style={styles.row}>
            {rowItems.map(renderItem)}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    width: itemWidth,
    backgroundColor: '#fff',
  },
  productImage: {
    width: '100%',
    height: 220,
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
  brandName: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Didot',
  },
  heartButton: {
    padding: 4,
  },
});