import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Text,
  ActivityIndicator,
  Alert,
  RefreshControl,
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

const { width } = Dimensions.get('window');

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
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoText}>Image not found</Text>
        </View>
      );
    }

    return (
      <Image
        source={source}
        style={styles.heroImage}
        contentFit="cover"
      />
    );
  }

  if (media.type === 'video') {
    if (!source) {
      return (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoText}>Video not found</Text>
        </View>
      );
    }

    return (
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.heroImage}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
        />
        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={togglePlayPause}
          activeOpacity={0.8}
        >
          <View style={styles.playPauseIconContainer}>
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
    <View style={styles.videoPlaceholder}>
      <Text style={styles.videoText}>Media not available</Text>
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
      <View style={[styles.container, styles.stateContainer]}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  if (detailQuery.isError || !product) {
    const isGone =
      detailQuery.error instanceof APIError && detailQuery.error.status === 404;
    return (
      <View style={[styles.container, styles.stateContainer]}>
        <Text style={styles.stateTitle}>
          {isGone ? 'This product is no longer available' : "Couldn't load this product"}
        </Text>
        {isGone ? (
          <TouchableOpacity
            style={styles.stateButton}
            onPress={() => router.dismissTo('/(tabs)')}
          >
            <Text style={styles.stateButtonText}>Back to Home</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.stateButton}
            onPress={() => detailQuery.refetch()}
          >
            <Text style={styles.stateButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.stateBackLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const soldOut = !product.stock.available;
  const liked = isLiked(product.id);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={detailQuery.isRefetching}
            onRefresh={() => detailQuery.refetch()}
          />
        }
      >
        {/* Hero Media Carousel */}
        <View style={[styles.heroSection, { height: width * 1.3 + insets.top }]}>
          <TouchableOpacity style={[styles.backIcon, { top: insets.top + 16 }]} onPress={() => router.back()}>
            <Text style={styles.backIconText}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.shareIcon, { top: insets.top + 16 }]}>
            <Text style={styles.shareIconText}>↗</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cartIcon, { top: insets.top + 16 }]} onPress={() => router.push('/cart')}>
            <Text style={styles.cartIconText}>🛒</Text>
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
              <View key={index} style={[styles.mediaItem, { height: width * 1.3 + insets.top }]}>
                <MediaItem
                  media={media}
                  index={index}
                  isActive={index === currentMediaIndex}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.zoomIndicator}>
            <Text style={styles.zoomText}>TAP TO ZOOM</Text>
          </View>

          <TouchableOpacity style={styles.heartIcon} onPress={() => toggleLike(product.id)}>
            <Text style={[styles.heartText, liked && styles.heartTextLiked]}>
              {liked ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dotsContainer}>
            {product.media.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentMediaIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.productHeader}>
            <View style={styles.productTitleContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              <TouchableOpacity>
                <Text style={styles.moreLink}>MORE →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => router.push(`/artist/${product.merchant.username}`)}>
              <Text style={styles.merchantName}>By {product.merchant.displayName}</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}

          {/* Payment Options */}
          <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Get it now, pay later</Text>
              <Text style={styles.paymentOptions}>3 OPTIONS →</Text>
            </View>
            <Text style={styles.paymentDescription}>
              Pay using our credit options, Payflex, PayJustNow, Mobicred or RCS.
            </Text>
          </View>

          {/* Size Selector */}
          {variants.length > 0 && (
            <View style={styles.sizeSection}>
              <View style={styles.sizeHeader}>
                <Text style={styles.sizeTitle}>Select a size</Text>
                <TouchableOpacity>
                  <Text style={styles.sizeInfo}>SIZE INFO →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sizeOptions}>
                {variants.map((variant) => (
                  <TouchableOpacity
                    key={variant.id}
                    style={[
                      styles.sizeButton,
                      selectedVariantId === variant.id && styles.sizeButtonActive,
                      !variant.available && styles.sizeButtonDisabled,
                    ]}
                    onPress={() => variant.available && setSelectedVariantId(variant.id)}
                    disabled={!variant.available}
                  >
                    <Text
                      style={[
                        styles.sizeText,
                        !variant.available && styles.sizeTextDisabled,
                      ]}
                    >
                      {variant.size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.findFitButton}>
                <Text style={styles.findFitIcon}>📏</Text>
                <Text style={styles.findFitText}>FIND YOUR FIT →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Shipping */}
          <View style={styles.shippingSection}>
            <View style={styles.shippingHeader}>
              <Text style={styles.shippingTitle}>Shipping</Text>
              <TouchableOpacity>
                <Text style={styles.shippingLink}>When will I get it? →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.shippingOption}>
              <Text style={styles.shippingIcon}>🚚</Text>
              <View style={styles.shippingDetails}>
                <Text style={styles.shippingText}>FREE Standard delivery on orders over R650.</Text>
                <Text style={styles.shippingSubtext}>Faster options available.</Text>
              </View>
            </View>

            <View style={styles.shippingOption}>
              <Text style={styles.shippingIcon}>🏪</Text>
              <View style={styles.shippingDetails}>
                <Text style={styles.shippingText}>FREE Collection on orders over R650.</Text>
                <Text style={styles.shippingSubtext}>Open 7 days a week.</Text>
              </View>
            </View>
          </View>

          {/* Returns */}
          <View style={styles.returnsSection}>
            <Text style={styles.returnsTitle}>Returns</Text>
            <Text style={styles.returnsText}>{product.returnPolicy.displayText}</Text>
          </View>

          {/* Similar Items — hidden entirely if the call fails or is empty */}
          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>Similar Items</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {similarProducts.map((item) => {
                  const source = imageSource(item.image);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.similarItem}
                      onPress={() => router.push(`/product/${item.id}`)}
                    >
                      {source ? (
                        <Image
                          source={source}
                          style={styles.similarImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.similarImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }]}>
                          <Text style={{ color: '#999' }}>No image</Text>
                        </View>
                      )}
                      <Text style={styles.similarMerchant}>By {item.merchant.displayName}</Text>
                      <Text style={styles.similarPrice}>{formatZAR(item.price)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.bottomPrice}>{formatZAR(product.price)}</Text>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            (soldOut || addItem.isPending) && styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={soldOut || addItem.isPending}
        >
          <Text style={styles.cartButtonIcon}>🛒</Text>
          <Text style={styles.addToCartText}>
            {soldOut ? 'SOLD OUT' : addItem.isPending ? 'ADDING…' : 'ADD TO CART'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Loading / error states
  stateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  stateButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  stateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stateBackLink: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },

  // Hero Section
  heroSection: {
    position: 'relative',
  },
  backIcon: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backIconText: {
    fontSize: 24,
    color: '#000',
  },
  shareIcon: {
    position: 'absolute',
    right: 72,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  shareIconText: {
    fontSize: 20,
    color: '#000',
  },
  cartIcon: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cartIconText: {
    fontSize: 20,
  },
  mediaItem: {
    width: width,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#fff',
    fontSize: 14,
  },
  playPauseButton: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    marginLeft: -32,
    zIndex: 10,
  },
  playPauseIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heartIcon: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartText: {
    fontSize: 28,
  },
  heartTextLiked: {
    color: '#e0245e',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
  },
  activeDot: {
    backgroundColor: '#fff',
  },

  // Product Info
  infoSection: {
    paddingHorizontal: 16,
  },
  productHeader: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  moreLink: {
    fontSize: 14,
    color: '#666',
  },
  merchantName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },

  // Description
  descriptionSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  descriptionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
  },

  // Payment Options
  paymentSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentOptions: {
    fontSize: 14,
    color: '#666',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Size Selector
  sizeSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sizeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sizeInfo: {
    fontSize: 14,
    color: '#666',
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  sizeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
  },
  sizeButtonActive: {
    borderColor: '#000',
    borderWidth: 2,
  },
  sizeButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sizeTextDisabled: {
    color: '#bbb',
    textDecorationLine: 'line-through',
  },
  findFitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  findFitIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  findFitText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Shipping
  shippingSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shippingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  shippingLink: {
    fontSize: 14,
    color: '#666',
  },
  shippingOption: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  shippingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  shippingDetails: {
    flex: 1,
  },
  shippingText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  shippingSubtext: {
    fontSize: 13,
    color: '#666',
  },

  // Returns
  returnsSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  returnsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  returnsText: {
    fontSize: 14,
    color: '#666',
  },

  // Similar Items
  similarSection: {
    paddingVertical: 16,
  },
  similarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  similarItem: {
    width: 200,
    marginRight: 12,
  },
  similarImage: {
    width: 200,
    height: 280,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  similarMerchant: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  similarPrice: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Didot',
  },

  bottomSpacing: {
    height: 80,
  },

  // Fixed Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bottomPrice: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 16,
    fontFamily: 'Didot',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#999',
  },
  cartButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
