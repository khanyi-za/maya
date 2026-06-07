import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { getLocalAsset } from '@/lib/local-assets';

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
  primaryFilter?: 'men' | 'women' | 'home-lifestyle';
  searchMode?: boolean;
}

// TODO: Replace with actual category-specific images
const getCategoryImage = (category: string, primaryFilter: string) => {
  // Using placeholder images from demo assets
  // In production, each category should have its own representative image
  const placeholderImages: { [key: string]: string } = {
    'All': '/demo-assets/tol_thema/The_Bonang_dress_1.png',
    'Pants': '/demo-assets/tol_thema/The_Khosi_Shirt.png',
    'Tops': '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    'Footwear': '/demo-assets/tol_thema/Lindy_2.png',
    'Dresses': '/demo-assets/tol_thema/The_Bonang_dress_1.png',
    'Bottoms': '/demo-assets/tol_thema/The_Khosi_Shirt.png',
    'Sports': '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    'Hoodies': '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    'Streetwear': '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    'Activewear': '/demo-assets/tol_thema/The_Bonang_dress_1.png',
  };

  return placeholderImages[category] || '/demo-assets/tol_thema/The_Bonang_dress_1.png';
};

const categoryMap = {
  men: [
    'All',
    'Pants',
    'Tops',
    'Footwear',
    'Sports',
    'Hoodies',
    'Streetwear',
    'Smart Casual',
    'Denim',
    'Accessories',
    'Outerwear',
    'Formal'
  ],
  women: [
    'All',
    'Dresses',
    'Tops',
    'Bottoms',
    'Footwear',
    'Activewear',
    'Loungewear',
    'Formal',
    'Accessories',
    'Outerwear',
    'Swimwear',
    'Lingerie'
  ],
  'home-lifestyle': [
    'All',
    'Furniture',
    'Décor',
    'Kitchen',
    'Bedroom',
    'Bathroom',
    'Lighting',
    'Textiles',
    'Art & Prints',
    'Plants & Garden',
    'Storage',
    'Candles & Scents'
  ]
};

export function CategoryFilter({ onCategoryChange, primaryFilter = 'men', searchMode = false }: CategoryFilterProps) {
  const [selectedCategory, setSelectedCategory] = useState(searchMode ? 'All' : 'All');

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category);
    onCategoryChange(category);
  };

  // Get categories based on search mode or primary filter
  const categories = searchMode 
    ? ['All', 'Men', 'Women', 'Home & Lifestyle']
    : categoryMap[primaryFilter] || categoryMap.men;

  // Reset selected category when primary filter changes
  React.useEffect(() => {
    setSelectedCategory('All');
    onCategoryChange('All');
  }, [primaryFilter, onCategoryChange, searchMode]);

  return (
    <ThemedView style={styles.container}>
      {/* Section Header with Lines */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLine} />
        <ThemedText style={styles.headerText}>SELECT FROM CATEGORIES</ThemedText>
        <View style={styles.headerLine} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {categories.map((category) => {
          const imageUrl = getCategoryImage(category, primaryFilter);
          const imageAsset = getLocalAsset(imageUrl);

          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryCard,
                selectedCategory === category && styles.selectedCategoryCard
              ]}
              onPress={() => handleCategoryPress(category)}
              activeOpacity={0.9}
            >
              <Image
                source={imageAsset}
                style={styles.categoryImage}
                contentFit="cover"
              />
              <View style={styles.categoryOverlay}>
                <ThemedText
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.selectedCategoryText
                  ]}
                  numberOfLines={1}
                >
                  {category}
                </ThemedText>
              </View>
              {selectedCategory === category && (
                <View style={styles.selectedBorder} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '300',
    color: '#999',
    letterSpacing: 1,
    marginHorizontal: 12,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    width: 100,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedCategoryCard: {
    // Selection will be handled by border overlay
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  selectedCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  selectedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 12,
  },
});