import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { type ReelFixture } from '@/lib/reels-fixtures';
import { imageSource } from '@/lib/image-source';

/**
 * One cell in the Search reels grid: a muted, looping, autoplaying clip with the
 * merchant name over a bottom gradient scrim (not a solid bar) and a small
 * reel glyph cueing "this is video". Tapping opens the full-screen reel feed at
 * this index. Matches the expo-video usage in artist/[productId] (one player
 * per instance).
 */
export function ReelCard({
  reel,
  index,
  size = 'tall',
}: {
  reel: ReelFixture;
  index: number;
  /** 'short' trims the cell (staggers the grid columns for the running look). */
  size?: 'tall' | 'short';
}) {
  const router = useRouter();

  const player = useVideoPlayer(imageSource(reel.video), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View
      className={`w-full overflow-hidden rounded-xl bg-black ${
        size === 'short' ? 'aspect-[9/12]' : 'aspect-[9/16]'
      }`}
    >
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
        <IconSymbol
          name="play.fill"
          size={12}
          color="rgba(255,255,255,0.9)"
          style={styles.playGlyph}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.scrim}
        >
          <Text
            variant="caption"
            className="text-[12px] font-semibold leading-4 text-white"
            numberOfLines={1}
          >
            {reel.merchant.displayName}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: '100%',
  },
  playGlyph: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
});
