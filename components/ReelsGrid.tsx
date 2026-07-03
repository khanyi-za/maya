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
  // Two independent columns (not aligned rows): the right column's first cell
  // is shorter, so the columns offset and the whole grid "runs" — the
  // staggered mosaic look. Original indices are preserved for the full-screen
  // feed's start position.
  const left: { reel: (typeof REELS)[number]; index: number }[] = [];
  const right: typeof left = [];
  REELS.forEach((reel, index) => {
    (index % 2 === 0 ? left : right).push({ reel, index });
  });

  return (
    // Tight mosaic gutters (6px) + a slightly wider grid than the text sections
    // — reads as a media wall rather than spaced-out cards.
    <View className="px-3 pb-[100px] pt-2">
      <Text variant="heading" className="mb-3 px-2">
        Discover
      </Text>
      <View className="flex-row items-start gap-1.5">
        <View className="flex-1 gap-1.5">
          {left.map(({ reel, index }) => (
            <ReelCard key={reel.id} reel={reel} index={index} />
          ))}
        </View>
        <View className="flex-1 gap-1.5">
          {right.map(({ reel, index }, i) => (
            <ReelCard key={reel.id} reel={reel} index={index} size={i === 0 ? 'short' : 'tall'} />
          ))}
        </View>
      </View>
    </View>
  );
}
