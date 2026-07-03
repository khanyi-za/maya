import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from './ui/text';
import { cn } from '@/lib/utils';
import { useFilter } from '@/contexts/FilterContext';
import { haptics } from '@/lib/haptics';

interface FeedTabsProps {
  onTabChange?: (tab: 'men' | 'women' | 'home-lifestyle') => void;
}

const TABS: { value: 'women' | 'men' | 'home-lifestyle'; label: string }[] = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'home-lifestyle', label: 'Home & Lifestyle' },
];

// YIIVA redesign — token tabs with a brand (Azure) active underline.
export function FeedTabs({ onTabChange }: FeedTabsProps) {
  const { activePrimaryFilter, setActivePrimaryFilter } = useFilter();

  const handleTabPress = (tab: 'men' | 'women' | 'home-lifestyle') => {
    haptics.light();
    setActivePrimaryFilter(tab);
    onTabChange?.(tab);
  };

  return (
    <View className="flex-row justify-center gap-8 bg-card px-5 pb-2.5 pt-4">
      {TABS.map((tab) => {
        const active = activePrimaryFilter === tab.value;
        return (
          <TouchableOpacity key={tab.value} className="items-center pb-1" onPress={() => handleTabPress(tab.value)}>
            <Text
              className={cn(
                'text-[16px]',
                active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
              )}
            >
              {tab.label}
            </Text>
            {/* Underline always rendered (transparent when inactive) so switching
                tabs never shifts the row height. */}
            <View className={cn('mt-2 h-0.5 w-full rounded-full', active ? 'bg-brand' : 'bg-transparent')} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
