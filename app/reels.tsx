import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { ProductCard } from '@/components/ProductCard';
import { useReels } from '@/hooks/useSearchQueries';
import { useSimilarProducts } from '@/hooks/useProductQueries';
import { imageSource } from '@/lib/image-source';
import { formatZAR } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { track } from '@/lib/analytics';

/**
 * Reel detail — Pinterest-style video page (replaced the full-screen infinite
 * reel loop, owner call 2026-09-08, inspo assets/inspo/1-3.jpeg). Opened from
 * the Search Discover grid at a given index:
 *
 *   - the tapped reel plays in a rounded card ~52% of the screen height
 *     (spec: 40–57%), floating back + mute controls on top of it;
 *   - below: the brand identity row (tap → brand profile), a featured row for
 *     the reel's own product (tap → product detail), then "More from {brand}"
 *     — the brand's other items as product cards via the brand-scoped
 *     /products/:id/similar endpoint.
 *
 * Deliberately dark like the old reel feed: the video is the hero.
 */

const SCREEN_H = Dimensions.get('window').height;
const VIDEO_H = Math.round(SCREEN_H * 0.52);

export default function ReelDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const { data } = useReels();
  const reels = data ?? [];
  const index = Math.min(
    Math.max(parseInt(start ?? '0', 10) || 0, 0),
    Math.max(reels.length - 1, 0),
  );
  const reel = reels[index];

  const [muted, setMuted] = useState(false);
  const isFocused = useIsFocused();

  const player = useVideoPlayer(reel ? imageSource(reel.video) : null, (p) => {
    p.loop = true;
  });

  // Drive playback from live state (never from the setup callback — footgun).
  useEffect(() => {
    if (!player) return;
    player.muted = muted;
    if (isFocused) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isFocused, muted]);

  useEffect(() => {
    if (!reel) return;
    track('reel_viewed', { productId: reel.productId, index });
  }, [reel, index]);

  const similarQuery = useSimilarProducts(reel?.productId);
  // The similar rail is brand-scoped server-side; drop the reel's own product
  // if it appears (it has its own featured row above the grid).
  const gridProducts = useMemo(
    () => (similarQuery.data?.products ?? []).filter((p) => p.id !== reel?.productId),
    [similarQuery.data, reel?.productId],
  );

  if (!reel) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-white">This reel is no longer available.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-3">
          <Text className="text-white underline">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
      >
        {/* Video card */}
        <View style={styles.videoCard}>
          <VideoView
            player={player}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            nativeControls={false}
          />
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <IconSymbol name="chevron.left" size={22} color="#111" />
          </Pressable>
          <Pressable
            style={styles.muteButton}
            onPress={() => {
              haptics.light();
              setMuted((m) => !m);
            }}
            hitSlop={12}
          >
            <IconSymbol
              name={muted ? 'speaker.slash' : 'speaker.wave.2'}
              size={18}
              color="#fff"
            />
          </Pressable>
        </View>

        {/* Brand identity → profile */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.brandRow}
          onPress={() => router.push(`/artist/${reel.merchant.username}`)}
        >
          <Avatar
            uri={reel.merchant.logo || undefined}
            fallback={reel.merchant.displayName[0]}
            size={40}
            variant="logo"
          />
          <View style={{ flex: 1 }}>
            <Text variant="heading" className="text-white" numberOfLines={1}>
              {reel.merchant.displayName}
            </Text>
            <Text variant="caption" className="text-white/60">
              View brand
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* More from this brand */}
        {gridProducts.length > 0 && (
          <>
            <Text variant="heading" className="mb-3 mt-6 px-4 text-white">
              More from {reel.merchant.displayName}
            </Text>
            <View style={styles.grid}>
              {gridProducts.map((p) => (
                <View key={p.id} style={styles.gridItem}>
                  <ProductCard
                    productImage={imageSource(p.image)}
                    profileImage={imageSource(reel.merchant.logo)}
                    artistName={p.merchant.displayName}
                    productTitle={p.name}
                    price={formatZAR(p.price)}
                    productId={p.id}
                    artistId={reel.merchant.username}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerAll: { alignItems: 'center', justifyContent: 'center' },
  videoCard: {
    height: VIDEO_H,
    marginHorizontal: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    rowGap: 12,
  },
  gridItem: { width: '50%', paddingHorizontal: 4 },
});
