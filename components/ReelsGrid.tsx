import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ReelCard } from './ReelCard';
import { useReels } from '@/hooks/useSearchQueries';
import { type Reel } from '@/lib/api-client';

/**
 * 2-column discover grid of merchant reels, served by GET /api/reels (the
 * dynamic feed that replaced the bundled fixtures). Rendered inside the
 * Search screen's browse scroll view, below the categories / trending row.
 * When the catalogue has no product videos the whole section disappears —
 * an empty "Discover" header would just advertise the gap.
 */
export function ReelsGrid() {
  const { data: reels } = useReels();
  if (!reels || reels.length === 0) return null;

  // Two independent columns (not aligned rows): the right column's first cell
  // is shorter, so the columns offset and the whole grid "runs" — the
  // staggered mosaic look. Original indices are preserved for the full-screen
  // feed's start position.
  const left: { reel: Reel; index: number }[] = [];
  const right: typeof left = [];
  reels.forEach((reel, index) => {
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
