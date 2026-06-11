import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EvenGrid } from '@/components/EvenGrid';
import { resolveFollowed, useServerSocial } from '@/lib/server-social';
import { useRequireAuth, useToggleFollow } from '@/hooks/useSocialMutations';
import { imageSource } from '@/lib/image-source';
import { formatZAR } from '@/lib/format';
import { APIError } from '@/lib/api-client';
import {
  useMerchantProfile,
  useMerchantProducts,
  useTrackMerchantView,
} from '@/hooks/useMerchantQueries';

const { width: screenWidth } = Dimensions.get('window');

// Cloudinary video URLs live under /video/upload/; .mp4 covers legacy fixtures.
function isVideoUrl(url: string): boolean {
  return url.includes('/video/') || url.endsWith('.mp4');
}

function HeroMediaItem({
  media,
  index,
  currentMediaIndex,
  isVideoMuted,
}: {
  media: { url: string; type: 'image' | 'video'; source: any };
  index: number;
  currentMediaIndex: number;
  isVideoMuted: boolean;
}) {
  const videoPlayer = useVideoPlayer(
    media.type === 'video' ? media.source : null,
    (player) => {
      player.loop = true;
      player.muted = isVideoMuted;
      if (index === currentMediaIndex) {
        player.play();
      }
    }
  );

  return (
    <View style={styles.heroMediaContainer}>
      {media.type === 'image' ? (
        <Image source={media.source} style={styles.heroMedia} contentFit="cover" />
      ) : (
        <VideoView
          player={videoPlayer}
          style={styles.heroMedia}
          contentFit="cover"
          nativeControls={false}
        />
      )}
    </View>
  );
}

export default function ArtistProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const insets = useSafeAreaInsets();

  // Route param is named artistId for historical reasons; the value is the
  // merchant username (see CLAUDE.md footguns).
  const username = params.artistId as string;

  const { followed } = useServerSocial();
  const toggleFollow = useToggleFollow();
  const requireAuth = useRequireAuth();

  const profileQuery = useMerchantProfile(username);
  const productsQuery = useMerchantProducts(
    username,
    selectedCategory !== 'All' ? selectedCategory : undefined
  );
  const merchant = profileQuery.data?.merchant;
  useTrackMerchantView(merchant?.id);

  const products = React.useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.products) ?? [],
    [productsQuery.data]
  );
  const categories = productsQuery.data?.pages[0]?.categories ?? [];

  const gridData = React.useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        image: imageSource(product.primaryImage),
        title: product.name,
        price: formatZAR(product.price),
      })),
    [products]
  );

  const heroMediaItems = React.useMemo(
    () =>
      (merchant?.heroMedia ?? []).map((url: string) => ({
        url,
        type: (isVideoUrl(url) ? 'video' : 'image') as 'image' | 'video',
        source: imageSource(url),
      })),
    [merchant]
  );
  const hasVideo = heroMediaItems.some((m) => m.type === 'video');

  const handleFollow = () => {
    if (!merchant || !requireAuth()) return;
    toggleFollow(
      merchant.id,
      resolveFollowed(followed, merchant.id, merchant.isFollowedByMe)
    );
  };
  const handleContact = () => setShowContactModal(true);

  const handleSendMessage = () => {
    setShowContactModal(false);
    router.push(`/chat/${username}`);
  };

  const handleSendEmail = () => {
    if (!merchant?.contact.email) return;
    Linking.openURL(`mailto:${merchant.contact.email}`);
    setShowContactModal(false);
  };

  const handleGridItemPress = (item: any) => router.push(`/product/${item.id}`);

  const handleMediaScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    setCurrentMediaIndex(index);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const nearBottom =
      contentOffset.y + layoutMeasurement.height > contentSize.height - 600;
    if (nearBottom && productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      productsQuery.fetchNextPage();
    }
  };

  const toggleVideoMute = () => setIsVideoMuted(!isVideoMuted);

  // ── Loading / error / suspended states ──

  if (profileQuery.isPending) {
    return (
      <View style={[styles.container, styles.stateContainer]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  if (profileQuery.isError || !merchant) {
    const notFound =
      profileQuery.error instanceof APIError && profileQuery.error.status === 404;
    return (
      <View style={[styles.container, styles.stateContainer]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedText style={styles.stateTitle}>
          {notFound ? 'Brand not found' : "Couldn't load this brand"}
        </ThemedText>
        <TouchableOpacity
          style={styles.stateButton}
          onPress={() =>
            notFound ? router.dismissTo('/(tabs)') : profileQuery.refetch()
          }
        >
          <ThemedText style={styles.stateButtonText}>
            {notFound ? 'Browse YIIVA' : 'Retry'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.stateBackLink}>Go back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (merchant.status !== 'ACTIVE') {
    return (
      <View style={[styles.container, styles.stateContainer]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedText style={styles.stateTitle}>{merchant.displayName}</ThemedText>
        <ThemedText style={styles.stateText}>
          This brand is currently unavailable on YIIVA.
        </ThemedText>
        <TouchableOpacity
          style={styles.stateButton}
          onPress={() => router.dismissTo('/(tabs)')}
        >
          <ThemedText style={styles.stateButtonText}>Browse YIIVA</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const isFollowing = resolveFollowed(followed, merchant.id, merchant.isFollowedByMe);
  const contactEmail = merchant.contact.email;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowContactModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Contact {merchant.displayName}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowContactModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol name="xmark" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptions}>
              <TouchableOpacity style={styles.contactOption} onPress={handleSendMessage}>
                <View style={styles.contactOptionIcon}>
                  <IconSymbol name="message" size={24} color="#007AFF" />
                </View>
                <View style={styles.contactOptionContent}>
                  <ThemedText style={styles.contactOptionTitle}>
                    Message {merchant.displayName}
                  </ThemedText>
                  <ThemedText style={styles.contactOptionSubtitle}>
                    Send a direct message
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={20} color="#ccc" />
              </TouchableOpacity>

              {contactEmail && (
                <TouchableOpacity style={styles.contactOption} onPress={handleSendEmail}>
                  <View style={styles.contactOptionIcon}>
                    <IconSymbol name="envelope" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.contactOptionContent}>
                    <ThemedText style={styles.contactOptionTitle}>Email</ThemedText>
                    <ThemedText style={styles.contactOptionSubtitle}>
                      {contactEmail}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching}
            onRefresh={() => {
              profileQuery.refetch();
              productsQuery.refetch();
            }}
          />
        }
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, { height: screenWidth * 1.2 }]}>
          {heroMediaItems.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleMediaScroll}
              scrollEventThrottle={16}
              style={styles.heroCarousel}
            >
              {heroMediaItems.map((media, index) => (
                <HeroMediaItem
                  key={index}
                  media={media}
                  index={index}
                  currentMediaIndex={currentMediaIndex}
                  isVideoMuted={isVideoMuted}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.heroCarousel, styles.heroPlaceholder]}>
              {merchant.logo && (
                <Image
                  source={imageSource(merchant.logo)}
                  style={styles.heroPlaceholderLogo}
                  contentFit="cover"
                />
              )}
            </View>
          )}

          <View style={styles.heroOverlay} pointerEvents="none" />

          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="#fff" />
          </TouchableOpacity>

          {hasVideo && (
            <TouchableOpacity
              style={[styles.muteButton, { top: insets.top + 10 }]}
              onPress={toggleVideoMute}
            >
              <IconSymbol
                name={isVideoMuted ? 'speaker.slash' : 'speaker.wave.2'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          )}

          <View style={styles.profilePictureContainer}>
            <Image
              source={imageSource(merchant.logo)}
              style={[styles.profilePicture, styles.profilePlaceholder]}
              contentFit="cover"
            />
          </View>

          {heroMediaItems.length > 1 && (
            <View style={styles.dotContainer}>
              {heroMediaItems.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index === currentMediaIndex && styles.activeDot]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Merchant Name */}
        <View style={styles.merchantNameSection}>
          <ThemedText style={styles.merchantName}>{merchant.displayName}</ThemedText>
          {merchant.isVerified && (
            <IconSymbol name="checkmark.seal.fill" size={20} color="#007AFF" />
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollow}
          >
            <ThemedText
              style={[styles.followButtonText, isFollowing && styles.followingButtonText]}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
            <ThemedText style={styles.contactButtonText}>Contact</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Bio Section */}
        <View style={styles.bioSection}>
          {merchant.bio ? (
            <ThemedText style={styles.bioText}>{merchant.bio}</ThemedText>
          ) : null}
          {merchant.location ? (
            <View style={styles.locationContainer}>
              <IconSymbol name="location.fill" size={14} color="#666" />
              <ThemedText style={styles.locationText}>{merchant.location}</ThemedText>
            </View>
          ) : null}
        </View>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <View style={styles.categorySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContainer}
            >
              {['All', ...categories].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryTab,
                    selectedCategory === category && styles.selectedCategoryTab,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <ThemedText
                    style={[
                      styles.categoryTabText,
                      selectedCategory === category && styles.selectedCategoryTabText,
                    ]}
                  >
                    {category === 'All'
                      ? 'All'
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Product Grid */}
        {productsQuery.isPending ? (
          <View style={styles.gridStateContainer}>
            <ActivityIndicator size="small" color="#333" />
          </View>
        ) : productsQuery.isError ? (
          <View style={styles.gridStateContainer}>
            <ThemedText style={styles.stateText}>
              Couldn&apos;t load this brand&apos;s products.
            </ThemedText>
            <TouchableOpacity
              style={styles.stateButton}
              onPress={() => productsQuery.refetch()}
            >
              <ThemedText style={styles.stateButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <EvenGrid data={gridData} onItemPress={handleGridItemPress} />
            {productsQuery.isFetchingNextPage && (
              <ActivityIndicator size="small" color="#333" style={styles.pagingSpinner} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  stateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
  gridStateContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  pagingSpinner: {
    marginVertical: 16,
  },
  heroSection: {
    position: 'relative',
  },
  heroCarousel: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderLogo: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  heroMediaContainer: {
    width: screenWidth,
    height: '100%',
  },
  heroMedia: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePictureContainer: {
    position: 'absolute',
    bottom: -30,
    left: 20,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profilePlaceholder: {
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  merchantNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 35.2,
    gap: 12,
    marginBottom: 12,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Roboto',
    letterSpacing: 0.5,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10.56,
  },
  followButton: {
    backgroundColor: '#000',
    paddingHorizontal: 23.94,
    paddingVertical: 8.98,
    borderRadius: 17.95,
    flex: 1,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 11.97,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#666',
  },
  contactButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 23.94,
    paddingVertical: 8.98,
    borderRadius: 17.95,
    flex: 1,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 11.97,
    fontWeight: '600',
  },
  bioSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 11,
  },
  bioText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  categorySection: {
    paddingTop: 8.8,
    paddingBottom: 16,
  },
  categoryScrollContainer: {
    paddingHorizontal: 20,
    gap: 7.8,
  },
  categoryTab: {
    paddingHorizontal: 15.6,
    paddingVertical: 7.8,
    borderRadius: 3.9,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedCategoryTab: {
    backgroundColor: 'transparent',
    borderBottomColor: '#000',
  },
  categoryTabText: {
    fontSize: 10.4,
    fontWeight: '500',
    color: '#666',
  },
  selectedCategoryTabText: {
    color: '#000',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOptions: {
    paddingVertical: 8,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  contactOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactOptionContent: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  contactOptionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
