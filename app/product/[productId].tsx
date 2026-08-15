import React, { useState, useEffect, useRef } from 'react';
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
import { track } from '@/lib/analytics';
import {
  useProductDetail,
  useSimilarProducts,
  useTrackProductView,
} from '@/hooks/useProductQueries';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAddCartItem, useCart } from '@/hooks/useCartQueries';
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
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [policyExpanded, setPolicyExpanded] = useState(false);
  const galleryRef = useRef<ScrollView>(null);
  const pageRef = useRef<ScrollView>(null);
  const addItem = useAddCartItem();
  const authStatus = useAuthStore((s) => s.state.status);
  const { toggleLike, isLiked } = useSocialStore();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const detailQuery = useProductDetail(productId);
  const similarQuery = useSimilarProducts(productId);
  useTrackProductView(productId, detailQuery.isSuccess, {
    name: detailQuery.data?.product.name,
    priceInCents: detailQuery.data?.product.price,
    merchant: detailQuery.data?.product.merchant?.username,
  });

  const product = detailQuery.data?.product;
  const variants: ProductVariant[] = product?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const similarProducts = similarQuery.data?.products ?? [];

  // Colour grouping: with >1 distinct colour the selector splits into a
  // colour row + size chips filtered to the chosen colour. Colour-only
  // products (no size option) select the variant directly from the colour
  // row. Single/no-colour products behave exactly as before.
  const colorOptions = [
    ...new Set(variants.map((v) => v.color).filter((c): c is string => !!c)),
  ];
  const multiColor = colorOptions.length > 1;
  const effectiveColor = multiColor ? (selectedColor ?? colorOptions[0]) : null;
  const visibleVariants = multiColor
    ? variants.filter((v) => v.color === effectiveColor)
    : variants;
  const hasSizes = visibleVariants.some((v) => v.size);

  // Jump the gallery to a variant's image (same URL string as its media[]
  // entry, per the ProductVariant.imageUrl contract). No image / no match →
  // no-op, gallery stays put. Returns whether a jump happened so callers can
  // decide to reveal the gallery.
  const jumpToVariantImage = (image: string | null): boolean => {
    if (!image) return false;
    const media = detailQuery.data?.product.media ?? [];
    const idx = media.findIndex((m) => m.url === image);
    if (idx < 0) return false;
    galleryRef.current?.scrollTo({ x: idx * width, animated: true });
    setCurrentMediaIndex(idx);
    return true;
  };

  const handleColorSelect = (color: string) => {
    haptics.light();
    setSelectedColor(color);
    const inColor = variants.filter((v) => v.color === color);
    if (!inColor.some((v) => v.size)) {
      // Colour-only product: the colour IS the variant.
      setSelectedVariantId(inColor.find((v) => v.available)?.id ?? '');
    } else if (selectedVariant && selectedVariant.color !== color) {
      // Size picked under another colour no longer applies.
      setSelectedVariantId('');
    }
    // Show the colour: its selected-size variant's image if one survives the
    // switch, else the colour's first imaged variant — and slide the page
    // back up so the buyer actually SEES the colourway change (the selector
    // sits below the fold).
    const representative =
      inColor.find((v) => v.id === selectedVariantId && v.image) ??
      inColor.find((v) => v.image);
    if (jumpToVariantImage(representative?.image ?? null)) {
      pageRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // "Already in cart" state, at cart-line granularity (productId + variantId).
  // With variants: no size selected → any variant in cart counts (tap goes to
  // the cart); selecting a NOT-yet-carted size flips back to "Add to cart" so
  // other sizes stay addable. Guests never match (empty cart shape).
  const cartItems = useCart().data?.cart.items ?? [];
  const inCart = product
    ? cartItems.some(
        (item) =>
          item.productId === product.id &&
          (variants.length === 0 ||
            (selectedVariant
              ? item.variantId === selectedVariant.id
              : item.variantId !== null))
      )
    : false;

  const handleAddToCart = () => {
    if (!product) return;

    if (variants.length > 0 && !selectedVariant) {
      const noun = hasSizes ? 'size' : 'colour';
      Alert.alert(
        `Select a ${noun}`,
        `Please select a ${noun} before adding to cart.`,
      );
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
          track('add_to_cart', {
            productId: product.id,
            variantId: selectedVariant?.id ?? null,
            size: selectedVariant?.size ?? null,
            color: selectedVariant?.color ?? null,
            priceInCents: product.price,
            merchant: product.merchant?.username ?? null,
          });
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
        ref={pageRef}
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
            ref={galleryRef}
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

          {/* Payment Options — the methods checkout actually offers (Paystack
              channels). Pay-later (Payflex etc.) is a post-launch decision;
              don't promise it here until it exists. */}
          <View className="py-4 border-b border-border">
            <Text variant="label" className="mb-2">Ways to pay</Text>
            <Text variant="caption">
              Pay securely at checkout with card, instant EFT, or SnapScan.
            </Text>
          </View>

          {/* Colour Selector — only when the product genuinely comes in
              multiple colours. Text chips (colour names are merchant-authored;
              hex swatches would be guesswork). */}
          {multiColor && (
            <View className="py-4 border-b border-border">
              <Text variant="label" className="mb-4">Select a colour</Text>

              <View className="flex-row flex-wrap gap-3">
                {colorOptions.map((color) => {
                  const isSelected = effectiveColor === color;
                  const anyAvailable = variants.some(
                    (v) => v.color === color && v.available,
                  );
                  return (
                    <TouchableOpacity
                      key={color}
                      className={cn(
                        'px-6 py-3 rounded-full active:scale-95',
                        isSelected
                          ? 'border-2 border-brand bg-brand-subtle'
                          : 'border border-border',
                        !anyAvailable && 'bg-muted border-border',
                      )}
                      onPress={() => {
                        if (!anyAvailable) return;
                        handleColorSelect(color);
                      }}
                      disabled={!anyAvailable}
                      accessibilityRole="button"
                      accessibilityLabel={`Colour ${color}${anyAvailable ? '' : ', sold out'}`}
                    >
                      <Text
                        variant="label"
                        className={cn(
                          isSelected && 'text-brand',
                          !anyAvailable && 'text-muted-foreground line-through',
                        )}
                      >
                        {color}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Size Selector (dead SIZE INFO / FIND YOUR FIT CTAs removed) —
              filtered to the chosen colour when a colour row is showing. */}
          {variants.length > 0 && hasSizes && (
            <View className="py-4 border-b border-border">
              <Text variant="label" className="mb-4">Select a size</Text>

              <View className="flex-row flex-wrap gap-3">
                {visibleVariants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  const sizeLabel = variant.size ?? variant.label;
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
                        jumpToVariantImage(variant.image);
                      }}
                      disabled={!variant.available}
                      accessibilityRole="button"
                      accessibilityLabel={`Size ${sizeLabel}${variant.available ? '' : ', sold out'}`}
                    >
                      <Text
                        variant="label"
                        className={cn(
                          isSelected && 'text-brand',
                          !variant.available && 'text-muted-foreground line-through',
                        )}
                      >
                        {sizeLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Shipping — honest platform copy: shipping on YIIVA is always the
              real per-store Courier Guy rate quoted at checkout. No free-over-X
              promise, no collection option — neither exists. */}
          <View className="py-4 border-b border-border">
            <Text variant="label" className="mb-4">Shipping</Text>

            <View className="flex-row items-center mb-4">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-muted">
                <IconSymbol name="shippingbox" size={17} color={colors.foreground} />
              </View>
              <View className="flex-1">
                <Text variant="body" className="font-medium mb-0.5">Shipped door-to-door via The Courier Guy.</Text>
                <Text variant="caption">Exact delivery rate calculated at checkout.</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-muted">
                <IconSymbol name="location" size={17} color={colors.foreground} />
              </View>
              <View className="flex-1">
                <Text variant="body" className="font-medium mb-0.5">Track every step in the app.</Text>
                <Text variant="caption">Live updates from dispatch to delivery.</Text>
              </View>
            </View>
          </View>

          {/* Returns — the brand's own policy (from their Shopify) when
              captured, collapsible; otherwise the honest platform copy. */}
          <View className="py-4 border-b border-border">
            <Text variant="label" className="mb-2">Returns</Text>
            <Text variant="caption">{product.returnPolicy.displayText}</Text>
            {product.returnPolicy.fullText ? (
              <>
                <Text
                  variant="caption"
                  className="mt-2"
                  numberOfLines={policyExpanded ? undefined : 3}
                >
                  {product.returnPolicy.fullText}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setPolicyExpanded((e) => !e);
                  }}
                  className="mt-1 self-start"
                >
                  <Text variant="label" className="text-[13px] text-brand">
                    {policyExpanded ? 'Show less' : 'Read full policy'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
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
          variant={inCart ? 'outline' : 'brand'}
          className="flex-1"
          loading={addItem.isPending}
          disabled={(soldOut && !inCart) || addItem.isPending}
          onPress={inCart ? () => router.push('/(tabs)/cart') : handleAddToCart}
        >
          {inCart
            ? 'In cart · View cart'
            : soldOut
              ? 'Sold out'
              : addItem.isPending
                ? 'Adding…'
                : 'Add to cart'}
        </Button>
      </View>
    </View>
  );
}
