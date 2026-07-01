import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './ui/text';
import { cn } from '@/lib/utils';
import { getLocalAsset } from '@/lib/local-assets';
import { imageSource } from '@/lib/image-source';
import type { Category } from '@/lib/api-client';

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
  primaryFilter?: 'men' | 'women' | 'home-lifestyle';
  searchMode?: boolean;
  categories?: Category[];
}

// TODO: Replace with actual category-specific images
const getCategoryImage = (category: string, primaryFilter: string) => {
  const placeholderImages: { [key: string]: string } = {
    All: '/demo-assets/tol_thema/The_Bonang_dress_1.png',
    Pants: '/demo-assets/tol_thema/The_Khosi_Shirt.png',
    Tops: '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    Footwear: '/demo-assets/tol_thema/Lindy_2.png',
    Dresses: '/demo-assets/tol_thema/The_Bonang_dress_1.png',
    Bottoms: '/demo-assets/tol_thema/The_Khosi_Shirt.png',
    Sports: '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    Hoodies: '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    Streetwear: '/demo-assets/suhu/Suhu_Eye_Knitted_Golfer.png',
    Activewear: '/demo-assets/tol_thema/The_Bonang_dress_1.png',
  };
  return placeholderImages[category] || '/demo-assets/tol_thema/The_Bonang_dress_1.png';
};

const categoryMap = {
  men: ['All', 'Pants', 'Tops', 'Footwear', 'Sports', 'Hoodies', 'Streetwear', 'Smart Casual', 'Denim', 'Accessories', 'Outerwear', 'Formal'],
  women: ['All', 'Dresses', 'Tops', 'Bottoms', 'Footwear', 'Activewear', 'Loungewear', 'Formal', 'Accessories', 'Outerwear', 'Swimwear', 'Lingerie'],
  'home-lifestyle': ['All', 'Furniture', 'Décor', 'Kitchen', 'Bedroom', 'Bathroom', 'Lighting', 'Textiles', 'Art & Prints', 'Plants & Garden', 'Storage', 'Candles & Scents'],
};

interface Chip {
  value: string;
  label: string;
  image: any;
}

export function CategoryFilter({ onCategoryChange, primaryFilter = 'men', searchMode = false, categories }: CategoryFilterProps) {
  const [selectedValue, setSelectedValue] = useState('All');
  const apiDriven = categories !== undefined;

  const handleCategoryPress = (value: string) => {
    setSelectedValue(value);
    onCategoryChange(value);
  };

  React.useEffect(() => {
    setSelectedValue('All');
    onCategoryChange('All');
  }, [primaryFilter, onCategoryChange, searchMode]);

  let chips: Chip[];
  if (apiDriven) {
    if (categories.length === 0) return null;
    chips = [
      { value: 'All', label: 'All', image: getLocalAsset(getCategoryImage('All', primaryFilter)) },
      ...categories.map((c) => ({ value: c.slug, label: c.displayName, image: imageSource(c.image) })),
    ];
  } else {
    const names = searchMode ? ['All', 'Men', 'Women', 'Home & Lifestyle'] : categoryMap[primaryFilter] || categoryMap.men;
    chips = names.map((name) => ({ value: name, label: name, image: getLocalAsset(getCategoryImage(name, primaryFilter)) }));
  }

  return (
    <View className="py-4">
      {/* Section header with rules */}
      <View className="mb-4 flex-row items-center px-5">
        <View className="h-px flex-1 bg-border" />
        <Text variant="micro" className="mx-3 tracking-widest">
          SELECT FROM CATEGORIES
        </Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {chips.map((chip) => {
          const selected = selectedValue === chip.value;
          return (
            <TouchableOpacity
              key={chip.value}
              className="relative h-[120px] w-[100px] overflow-hidden rounded-xl"
              onPress={() => handleCategoryPress(chip.value)}
              activeOpacity={0.9}
            >
              {chip.image ? (
                <Image source={chip.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="h-full w-full bg-[#1a1a1a]" />
              )}
              <View className="absolute bottom-0 left-0 right-0 items-center justify-center bg-black/50 px-2 py-2">
                <Text
                  className={cn('text-center text-[12px] text-white', selected ? 'font-bold' : 'font-semibold')}
                  numberOfLines={1}
                >
                  {chip.label}
                </Text>
              </View>
              {selected && <View className="absolute inset-0 rounded-xl border-[3px] border-brand" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
