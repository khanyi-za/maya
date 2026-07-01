import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ReelCard } from './ReelCard';
import { REELS } from '@/lib/reels-fixtures';

/**
 * 2-column discover grid of merchant reels. Static (bundled fixtures) for now;
 * the same layout will render a backend feed once wired. Rendered inside the
 * Search screen's browse scroll view, below the categories / trending row.
 */
export function ReelsGrid() {
  const rows: (typeof REELS)[] = [];
  for (let i = 0; i < REELS.length; i += 2) {
    rows.push(REELS.slice(i, i + 2));
  }

  return (
    <View className="px-5 pb-[100px] pt-2">
      <Text variant="heading" className="mb-4">
        Discover
      </Text>
      {rows.map((row, rowIndex) => (
        <View key={`reel-row-${rowIndex}`} className="mb-3 flex-row gap-3">
          {row.map((reel, colIndex) => (
            <ReelCard key={reel.id} reel={reel} index={rowIndex * 2 + colIndex} />
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}
