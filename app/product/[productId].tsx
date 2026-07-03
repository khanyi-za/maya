import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useLocalSearchParams, router } from 'expo-router';
import { imageSource } from '@/lib/image-source';
import { formatZAR } from '@/lib/format';
import { APIError, type Media, type ProductVariant } from '@/lib/api-client';
import {
  useProductDetail,
  useSimilarProducts,
  useTrackProductView,
} from '@/hooks/useProductQueries';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAddCartItem } from '@/hooks/useCartQueries';
import { useAuthStore } from '@/lib/auth-store';
import { useSocialStore } from '@/lib/social-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useThemeColors } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { RowProductList } from '@/components/RowProductList';

const { width } = Dimensions.get('window');

// Media fill dimensions kept as a style object — expo-image / expo-video take a
// `style`, and these are layout dimensions (not design tokens).
const MEDIA_FILL = { width: '100%', height: '100%' } as const;

function MediaItem({
  media,
  index,
  isActive
}: {
  media: Media;
  index: number;
  isActive: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const source = imageSource(media.url);

  const player = useVideoPlayer(
    media.type === 'video' && source ? source : null,
    (player) => {
      player.loop = true;
      player.muted = false;
    }
  );

  useEffect(() => {
    if (media.type === 'video' && player) {
      if (isActive && isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isActive, isPlaying, player, media.type]);

  useEffect(() => {
    if (media.type === 'video' && isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isActive, media.type]);

  const togglePlayPause = () => setIsPlaying(!isPlaying);

  if (media.type === 'image') {
    if (!source) {
      return (
        <View className="w-full h-full bg-black items-center justify-center">
          <Text variant="caption" className="text-white">Image not found</Text>
        </View>
      );
    }

    return (
      <Image
        source={source}
        style={MEDIA_FILL}
        contentFit="cover"
        transition={200}
      />
    );
  }

  if (media.type === 'video') {
    if (!source) {
      return (
        <View className="w-full h-full bg-black items-center justify-center">
          <Text variant="caption" className="text-white">Video not found</Text>
        </View>
      );
    }

    return (
      <View className="w-full h-full relative">
        <VideoView
          player={player}
          style={MEDIA_FILL}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
        />
        <TouchableOpacity
          className="absolute bottom-[100px] left-1/2 -ml-8 z-10"
          onPress={togglePlayPause}
          activeOpacity={0.8}
        >
          <View className="w-16 h-16 rounded-full bg-black/60 items-center justify-center border-2 border-white/80">
            <IconSymbol
              name={isPlaying ? 'pause.fill' : 'play.fill'}
              size={32}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="w-full h-full bg-black items-center justify-center">
      <Text variant="caption" className="text-white">Media not available</Text>
    </View>
  );
}

export default function ProductScreen() {
  const params = useLocalSearchParams();
  const productId = params.productId as string;
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const addItem = useAddCartItem();
  const authStatus = useAuthStore((s) => s.state.status);
  const { toggleLike, isLiked } = useSocialStore();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const detailQuery = useProductDetail(productId);
  const similarQuery = useSimilarProducts(productId);
  useTrackProductView(productId, detailQuery.isSuccess);

  const product = detailQuery.data?.product;
  const variants: ProductVariant[] = product?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const similarProducts = similarQuery.data?.products ?? [];

  const handleAddToCart = () => {
    if (!product) return;

    if (variants.length > 0 && !selectedVariant) {
      Alert.alert('Select a size', 'Please select a size before adding to cart.');
      return;
    }

    // Guests sign in to buy in v1 (no guest server cart — open-questions §CC-3).
    if (authStatus !== 'authenticated') {
      Alert.alert('Sign in to shop', 'You need an account to add items to your cart.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    addItem.mutate(
      {
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity: 1,
      },
      {
        onSuccess: () => {
          haptics.success();
          Alert.alert('Added to cart', `${product.name} is in your cart.`);
        },
        onError: (err) => {
          if (err instanceof APIError && err.code === 'OUT_OF_STOCK') {
            Alert.alert('Sold out', 'Sold out — please choose another size.');
            // Refresh variant availability so the UI reflects the race.
            detailQuery.refetch();
          } else if (err instanceof APIError && err.status === 401) {
            router.push('/auth/login');
          } else {
            Alert.alert("Couldn't add to cart", 'Please try again.');
          }
        },
      }
    );
  };

  // ── Loading / error states (contract: skeleton, 404, full-screen retry) ──

  if (detailQuery.isPending) {
    return (
      <View className="flex-1 bg-background">
        <Skeleton className="w-full" style={{ height: width * 1.3 }} />
        <View className="px-4 pt-4 gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-20 w-full" />
          <View className="mt-2 flex-row gap-3">
            <Skeleton className="h-11 w-16 rounded-full" />
            <Skeleton className="h-11 w-16 rounded-full" />
            <Skeleton className="h-11 w-16 rounded-full" />
          </View>
        </View>
      </View>
    );
  }

  if (detailQuery.isError || !product) {
    const isGone =
      detailQuery.error instanceof APIError && detailQuery.error.status === 404;
    return (
      <View className="flex-1 bg-background items-center justify-center px-10 gap-4">
        <Text variant="heading" className="text-center">
          {isGone ? 'This product is no longer available' : "Couldn't load this product"}
        </Text>
        {isGone ? (
          <Button variant="primary" onPress={() => router.dismissTo('/(tabs)')}>
            Back to Home
          </Button>
        ) : (
          <Button variant="primary" onPress={() => detailQuery.refetch()}>
            Retry
          </Button>
        )}
        <TouchableOpacity onPress={() => router.back()}>
          <Text variant="caption" className="underline">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const soldOut = !product.stock.available;
  const liked = isLiked(product.id);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={detailQuery.isRefetching}
            onRefresh={() => detailQuery.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
      >
        {/* Hero Media Carousel. Floating chrome sits on fixed white coins over
            media, so icon color stays ink in both themes. */}
        <View className="relative" style={{ height: width * 1.3 + insets.top }}>
          <TouchableOpacity
            className="absolute left-4 w-10 h-10 rounded-full bg-white/90 items-center justify-center z-10"
            style={{ top: insets.top + 16 }}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <IconSymbol name="chevron.left" size={20} color="#18181b" />
          </TouchableOpacity>

          <TouchableOpacity
            className="absolute right-[72px] w-10 h-10 rounded-full bg-white/90 items-center justify-center z-10"
            style={{ top: insets.top + 16 }}
            onPress={() =>
              void Share.share({
                message: `${product.name} by ${product.merchant.displayName} on YIIVA — ${formatZAR(product.price)}`,
              }).catch(() => {})
            }
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <IconSymbol name="square.and.arrow.up" size={18} color="#18181b" />
          </TouchableOpacity>

          <TouchableOpacity
            className="absolute right-4 w-10 h-10 rounded-full bg-white/90 items-center justify-center z-10"
            style={{ top: insets.top + 16 }}
            onPress={() => router.push('/cart')}
            accessibilityRole="button"
            accessibilityLabel="Cart"
          >
            <IconSymbol name="cart" size={18} color="#18181b" />
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentMediaIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {product.media.map((media, index) => (
              <View key={index} style={{ width, height: width * 1.3 + insets.top }}>
                <MediaItem
                  media={media}
                  index={index}
                  isActive={index === currentMediaIndex}
                />
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            className="absolute bottom-20 right-4 w-14 h-14 rounded-full bg-white items-center justify-center"
            onPress={() => {
              haptics.light();
              toggleLike(product.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike' : 'Like'}
          >
            <IconSymbol
              name={liked ? 'heart.fill' : 'heart'}
              size={26}
              color={liked ? colors.like : '#18181b'}
            />
          </TouchableOpacity>

          {/* Active dot stretches to a pill. */}
          <View className="absolute bottom-[50px] left-0 right-0 flex-row justify-center gap-1.5">
            {product.media.map((_, index) => (
              <View
                key={index}
                className={cn(
                  'h-1.5 rounded-full',
                  index === currentMediaIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40',
                )}
              />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View className="px-4">
          <View className="py-4 border-b border-border">
            <Text variant="heading" className="mb-1">{product.name}</Text>
            <TouchableOpacity
              onPress={() => router.push(`/artist/${product.merchant.username}`)}
              className="flex-row items-center gap-1 self-start"
            >
              <Text variant="caption" className="italic">
                By <Text variant="caption" className="italic text-brand">{product.merchant.displayName}</Text>
              </Text>
              <IconSymbol name="chevron.right" size={10} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {product.description ? (
            <View className="py-4 border-b border-border">
              <Text variant="body" className="leading-[21px]">{product.description}</Text>
            </View>
          ) : null}

          {/* Payment Options (informational — dead "3 OPTIONS" CTA removed) */}
          <View className="py-4 border-b border-border">
            <Text variant="label" className="mb-2">Get it now, pay later</Text>
            <Text variant="caption">
              Pay using our credit options, Payflex, PayJustNow, Mobicred or RCS.
            </Text>
          </View>

          {/* Size Selector (dead SIZE INFO / FIND YOUR FIT CTAs removed) */}
          {variants.length > 0 && (
            <View className="py-4 border-b border-border">
              <Text variant="label" className="mb-4">Select a size</Text>

              <View className="flex-row flex-wrap gap-3">
                {variants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  return (
                    <TouchableOpacity
                      key={variant.id}
                      className={cn(
                        'px-6 py-3 rounded-full active:scale-95',
                        isSelected
                          ? 'border-2 border-brand bg-brand-subtle'
                          : 'border border-border',
                        !variant.available && 'bg-muted border-border',
                      )}
                      onPress={() => {
                        if (!variant.available) return;
                        haptics.light();
                        setSelectedVariantId(variant.id);
                      }}
                      disabled={!variant.available}
                      accessibilityRole="button"
                      accessibilityLabel={`Size ${variant.size}${variant.available ? '' : ', sold out'}`}
                    >
                      <Text
                        variant="label"
                        className={cn(
                          isSelected && 'text-brand',
                          !variant.available && 'text-muted-foreground line-through',
                        )}
                      >
                        {variant.size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Shipping (dead "When will I get it?" CTA removed) */}
          <View className="py-4 border-b border-border">
            <Text variant="label" className="mb-4">Shipping</Text>

            <View className="flex-row items-center mb-4">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-muted">
                <IconSymbol name="shippingbox" size={17} color={colors.foreground} />
              </View>
              <View className="flex-1">
                <Text variant="body" className="font-medium mb-0.5">FREE Standard delivery on purchases over R650.</Text>
                <Text variant="caption">Faster options available.</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-muted">
                <IconSymbol name="storefront" size={17} color={colors.foreground} />
              </View>
              <View className="flex-1">
                <Text variant="body" className="font-medium mb-0.5">FREE Collection on purchases over R650.</Text>
                <Text variant="caption">Open 7 days a week.</Text>
              </View>
            </View>
          </View>

          {/* Returns */}
          <View className="py-4 border-b border-border">
            <Text variant="label" className="mb-2">Returns</Text>
            <Text variant="caption">{product.returnPolicy.displayText}</Text>
          </View>

        </View>

        {/* Similar Items — the shared rail (same look as Home's New Arrivals);
            hidden entirely if the call fails or is empty. Sits outside the px-4
            wrapper because the rail owns its own full-bleed section styling. */}
        {similarProducts.length > 0 && (
          <View className="mt-2">
            <RowProductList
              title="Similar Items"
              products={similarProducts.map((item) => ({
                id: item.id,
                image: imageSource(item.image),
                title: item.name,
                artistName: item.merchant.displayName,
                price: formatZAR(item.price),
              }))}
            />
          </View>
        )}

        <View className="h-20" />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center bg-card px-4 py-3 border-t border-border"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Text className="text-[24px] font-bold text-foreground mr-4">{formatZAR(product.price)}</Text>
        <Button
          variant="brand"
          className="flex-1"
          loading={addItem.isPending}
          disabled={soldOut || addItem.isPending}
          onPress={handleAddToCart}
        >
          {soldOut ? 'Sold out' : addItem.isPending ? 'Adding…' : 'Add to cart'}
        </Button>
      </View>
    </View>
  );
}
