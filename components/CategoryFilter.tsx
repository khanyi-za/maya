import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { getLocalAsset } from '@/lib/local-assets';
import { imageSource } from '@/lib/image-source';
import type { Category } from '@/lib/api-client';

interface CategoryFilterProps {
  /**
   * Selected value passed to the callback: a category slug from the API list,
   * or 'All'. (Legacy hardcoded mode passes the display name instead.)
   */
  onCategoryChange: (category: string) => void;
  primaryFilter?: 'men' | 'women' | 'home-lifestyle';
  searchMode?: boolean;
  /**
   * API-driven categories (GET /api/categories). When provided, the rail
   * renders 'All' + these and ignores the legacy hardcoded sets. When
   * provided but empty, the rail hides entirely (categories degrade
   * gracefully — docs/screens/01-home/api-contract.md failure modes).
   */
  categories?: Category[];
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

interface Chip {
  value: string; // passed to onCategoryChange
  label: string;
  image: any; // expo-image source or undefined -> text-only chip
}

export function CategoryFilter({ onCategoryChange, primaryFilter = 'men', searchMode = false, categories }: CategoryFilterProps) {
  const [selectedValue, setSelectedValue] = useState('All');
  const apiDriven = categories !== undefined;

  const handleCategoryPress = (value: string) => {
    setSelectedValue(value);
    onCategoryChange(value);
  };

  // Reset selection when the primary filter (and so the chip set) changes
  React.useEffect(() => {
    setSelectedValue('All');
    onCategoryChange('All');
  }, [primaryFilter, onCategoryChange, searchMode]);

  let chips: Chip[];
  if (apiDriven) {
    if (categories.length === 0) return null;
    chips = [
      { value: 'All', label: 'All', image: getLocalAsset(getCategoryImage('All', primaryFilter)) },
      ...categories.map((c) => ({
        value: c.slug,
        label: c.displayName,
        image: imageSource(c.image),
      })),
    ];
  } else {
    const names = searchMode
      ? ['All', 'Men', 'Women', 'Home & Lifestyle']
      : categoryMap[primaryFilter] || categoryMap.men;
    chips = names.map((name) => ({
      value: name,
      label: name,
      image: getLocalAsset(getCategoryImage(name, primaryFilter)),
    }));
  }

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
        {chips.map((chip) => (
          <TouchableOpacity
            key={chip.value}
            style={[
              styles.categoryCard,
              selectedValue === chip.value && styles.selectedCategoryCard
            ]}
            onPress={() => handleCategoryPress(chip.value)}
            activeOpacity={0.9}
          >
            {chip.image ? (
              <Image
                source={chip.image}
                style={styles.categoryImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.categoryImage, styles.textOnlyChip]} />
            )}
            <View style={styles.categoryOverlay}>
              <ThemedText
                style={[
                  styles.categoryText,
                  selectedValue === chip.value && styles.selectedCategoryText
                ]}
                numberOfLines={1}
              >
                {chip.label}
              </ThemedText>
            </View>
            {selectedValue === chip.value && (
              <View style={styles.selectedBorder} />
            )}
          </TouchableOpacity>
        ))}
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
  textOnlyChip: {
    backgroundColor: '#1a1a1a',
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
