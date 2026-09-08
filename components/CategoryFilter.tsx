import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './ui/text';
import { cn } from '@/lib/utils';
import { imageSource } from '@/lib/image-source';
import { haptics } from '@/lib/haptics';
import type { Category } from '@/lib/api-client';

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
  primaryFilter?: 'men' | 'women' | 'home-lifestyle';
  categories: Category[];
  /** Hide the synthetic "All" chip (e.g. Search, where "All" is meaningless). */
  showAll?: boolean;
  /** Gender-aware covers for the "All" chip's 2×2 collage (API `allImages` — each distinct from every category cover). */
  allImages?: string[];
}

interface Chip {
  value: string;
  label: string;
  image: any;
  /** 4 images → the chip renders a 2×2 collage instead of a single cover ("All"). */
  collage?: string[];
}

export function CategoryFilter({ onCategoryChange, primaryFilter = 'men', categories, showAll = true, allImages }: CategoryFilterProps) {
  const [selectedValue, setSelectedValue] = useState('All');

  const handleCategoryPress = (value: string) => {
    haptics.light();
    setSelectedValue(value);
    onCategoryChange(value);
  };

  React.useEffect(() => {
    setSelectedValue('All');
    onCategoryChange('All');
  }, [primaryFilter, onCategoryChange]);

  if (categories.length === 0) return null;
  const chips: Chip[] = [
    // The "All" chip renders a 2×2 collage of the API's gender-aware
    // `allImages` (each distinct from every category chip) — a single
    // borrowed image made "All" a visual duplicate of its neighbour. With
    // fewer than 4 images it degrades to a single cover, then to the first
    // category's image.
    ...(showAll
      ? [{
          value: 'All',
          label: 'All',
          image: imageSource(allImages?.[0] ?? categories[0].image),
          collage: allImages && allImages.length >= 4 ? allImages.slice(0, 4) : undefined,
        }]
      : []),
    ...categories.map((c) => ({ value: c.slug, label: c.displayName, image: imageSource(c.image) })),
  ];

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
              className="relative h-[190px] w-[145px] overflow-hidden rounded-xl"
              onPress={() => handleCategoryPress(chip.value)}
              activeOpacity={0.9}
            >
              {chip.collage ? (
                <View className="h-full w-full flex-row flex-wrap">
                  {chip.collage.map((url) => (
                    <Image
                      key={url}
                      source={imageSource(url)}
                      style={{ width: '50%', height: '50%' }}
                      contentFit="cover"
                      transition={200}
                    />
                  ))}
                </View>
              ) : chip.image ? (
                <Image source={chip.image} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
              ) : (
                <View className="h-full w-full bg-muted" />
              )}
              {/* Dark scrim over imagery — intentional in both themes (white label on media). */}
              <View className="absolute bottom-0 left-0 right-0 items-center justify-center bg-black/40 px-2 py-2">
                <Text
                  className={cn('text-center text-[13px] text-white', selected ? 'font-bold' : 'font-semibold')}
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
