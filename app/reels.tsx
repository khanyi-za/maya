import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { haptics } from '@/lib/haptics';
import { REELS, type ReelFixture } from '@/lib/reels-fixtures';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';
import { useSocialStore } from '@/lib/social-store';
import { resolveBookmarked, useServerSocial } from '@/lib/server-social';
import { useRequireAuth, useToggleBookmark } from '@/hooks/useSocialMutations';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

/**
 * Full-screen, TikTok/Instagram-style vertical reel feed (Phase 1 — static
 * product reels). Opened from the Search discover grid at a given index. Each
 * reel overlays the merchant logo + product name/price/description (bottom-left)
 * and a vertical action stack (bottom-right): "Buy" → product detail, like
 * (local v1), bookmark (server, auth-gated).
 */
export default function ReelsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const startIndex = Math.min(
    Math.max(parseInt(start ?? '0', 10) || 0, 0),
    REELS.length - 1,
  );
  const [activeIndex, setActiveIndex] = useState(startIndex);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setActiveIndex(first.index);
  });
  const viewConfigRef = useRef({ itemVisiblePercentThreshold: 80 });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <FlatList
        data={REELS}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <ReelItem reel={item} active={index === activeIndex} insets={insets} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: SCREEN_H, offset: SCREEN_H * i, index: i })}
        initialScrollIndex={startIndex}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        windowSize={3}
        maxToRenderPerBatch={2}
        decelerationRate="fast"
      />

      <Pressable
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <IconSymbol name="xmark" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

function ReelItem({
  reel,
  active,
  insets,
}: {
  reel: ReelFixture;
  active: boolean;
  insets: EdgeInsets;
}) {
  const router = useRouter();
  const player = useVideoPlayer(imageSource(reel.video), (p) => {
    p.loop = true;
  });

  // Only the on-screen reel plays (FlatList windowing keeps a few mounted).
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  // Like is local-only (v1); bookmark is server-backed + auth-gated.
  const likedProducts = useSocialStore((s) => s.likedProducts);
  const toggleLike = useSocialStore((s) => s.toggleLike);
  const isLiked = likedProducts.has(reel.productId);

  const { bookmarked } = useServerSocial();
  const toggleBookmark = useToggleBookmark();
  const requireAuth = useRequireAuth();
  const isBookmarked = resolveBookmarked(bookmarked, reel.productId, false);

  const handleBookmark = () => {
    if (!requireAuth()) return;
    toggleBookmark(reel.productId, isBookmarked);
  };

  return (
    <View style={styles.item}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.scrim} pointerEvents="none" />

      {/* Bottom-left: merchant + product */}
      <View style={[styles.info, { bottom: insets.bottom + 24 }]}>
        <Pressable
          style={styles.merchantRow}
          onPress={() => router.push(`/artist/${reel.merchant.username}`)}
        >
          <Image source={imageSource(reel.merchant.logo)} style={styles.logo} contentFit="cover" />
          <Text style={styles.brand}>{reel.merchant.displayName}</Text>
        </Pressable>
        <Text style={styles.product} numberOfLines={1}>
          {reel.productName}
        </Text>
        <Text style={styles.price}>{formatZAR(reel.priceInCents)}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {reel.description}
        </Text>
      </View>

      {/* Bottom-right: action stack */}
      <View style={[styles.actions, { bottom: insets.bottom + 24 }]}>
        <ActionButton
          icon="cart"
          label="Buy"
          onPress={() => {
            haptics.medium();
            router.push(`/product/${reel.productId}`);
          }}
        />
        {/* like/save colors match the --like / --save tokens (theme-independent). */}
        <ActionButton
          icon={isLiked ? 'heart.fill' : 'heart'}
          color={isLiked ? '#ff3040' : '#fff'}
          label="Like"
          onPress={() => {
            haptics.light();
            toggleLike(reel.productId);
          }}
        />
        <ActionButton
          icon={isBookmarked ? 'bookmark.fill' : 'bookmark'}
          color={isBookmarked ? '#ffd24d' : '#fff'}
          label="Save"
          onPress={() => {
            haptics.light();
            handleBookmark();
          }}
        />
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color = '#fff',
  onPress,
}: {
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.action} onPress={onPress} hitSlop={8}>
      <IconSymbol name={icon as any} size={30} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  item: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
  // VideoView needs explicit dimensions (absoluteFill renders zero-sized).
  video: { width: '100%', height: '100%' },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    position: 'absolute',
    left: 16,
    right: 88, // leave room for the action stack
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  brand: { color: '#fff', fontSize: 15, fontWeight: '700' },
  product: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  price: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  desc: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  actions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 22,
  },
  action: { alignItems: 'center', gap: 4 },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
