import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { type ReelFixture } from '@/lib/reels-fixtures';
import { imageSource } from '@/lib/image-source';

/**
 * One cell in the Search reels grid: a muted, looping, autoplaying clip with the
 * merchant name overlaid. Tapping opens the full-screen reel feed at this index.
 * Matches the expo-video usage in artist/[productId] (one player per instance).
 */
export function ReelCard({ reel, index }: { reel: ReelFixture; index: number }) {
  const router = useRouter();

  const player = useVideoPlayer(imageSource(reel.video), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View className="flex-1 aspect-[9/16] overflow-hidden rounded-xl bg-black">
      <VideoView
        player={player}
        // VideoView renders zero-sized with absoluteFill — needs explicit
        // dimensions (matches the working artist/product screens).
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      {/* Overlay captures the tap (so the VideoView doesn't) + holds the label. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() =>
          router.push({ pathname: '/reels', params: { start: String(index) } })
        }
      >
        <View className="absolute inset-x-0 bottom-0 bg-black/40 px-2.5 py-2">
          <Text
            variant="caption"
            className="text-[12px] font-semibold leading-4 text-white"
            numberOfLines={1}
          >
            {reel.merchant.displayName}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: '100%',
  },
});
