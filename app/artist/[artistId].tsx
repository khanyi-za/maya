import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EvenGrid } from '@/components/EvenGrid';
import { useSocialStore } from '@/lib/social-store';
import { getLocalAsset } from '@/lib/local-assets';
import { getDummyMerchant, getDummyMerchantProducts } from '@/lib/dummy-data';

const { width: screenWidth } = Dimensions.get('window');

function HeroMediaItem({
  media,
  index,
  currentMediaIndex,
  isVideoMuted,
}: {
  media: { url: string; type: string; localAsset: any };
  index: number;
  currentMediaIndex: number;
  isVideoMuted: boolean;
}) {
  const videoPlayer =
    media.type === 'video'
      ? useVideoPlayer(media.localAsset, (player) => {
          player.loop = true;
          player.muted = isVideoMuted;
          if (index === currentMediaIndex) {
            player.play();
          }
        })
      : null;

  return (
    <View style={styles.heroMediaContainer}>
      {media.type === 'image' ? (
        <Image source={media.localAsset} style={styles.heroMedia} contentFit="cover" />
      ) : (
        <VideoView
          player={videoPlayer!}
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
  const scrollX = useRef(new Animated.Value(0)).current;

  const artistId = params.artistId as string;

  const { toggleFollow, isFollowing: isFollowingStore } = useSocialStore();

  const merchant = getDummyMerchant(artistId);
  const { products, categories } = React.useMemo(
    () => getDummyMerchantProducts(artistId, selectedCategory !== 'All' ? selectedCategory : undefined),
    [artistId, selectedCategory]
  );
  const isFollowing = isFollowingStore(merchant.id);

  const gridData = React.useMemo(
    () =>
      products.map(product => ({
        id: product.id,
        image: getLocalAsset(product.primaryImage),
        title: product.name,
        price: `${product.currency} ${product.price.toFixed(2)}`,
      })),
    [products]
  );

  const heroMediaItems = React.useMemo(
    () =>
      merchant.heroMedia.map((url: string) => ({
        url: url,
        type: url.endsWith('.mp4') ? 'video' : 'image',
        localAsset: getLocalAsset(url),
      })),
    [merchant]
  );

  const logoAsset = React.useMemo(
    () => getLocalAsset(`/demo-assets/${merchant.username}/${merchant.logo}`),
    [merchant]
  );

  const handleFollow = () => toggleFollow(merchant.id);

  const handleContact = () => setShowContactModal(true);

  const handleSendMessage = () => {
    setShowContactModal(false);
    router.push(`/chat/${merchant.username}`);
  };

  const handleSendEmail = () => {
    const email = merchant.email || `info@${merchant.username}.com`;
    Linking.openURL(`mailto:${email}`);
    setShowContactModal(false);
  };

  const handleGridItemPress = (item: any) => router.push(`/product/${item.id}`);

  const handleMediaScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    setCurrentMediaIndex(index);
  };

  const toggleVideoMute = () => setIsVideoMuted(!isVideoMuted);

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

              <TouchableOpacity style={styles.contactOption} onPress={handleSendEmail}>
                <View style={styles.contactOptionIcon}>
                  <IconSymbol name="envelope" size={24} color="#007AFF" />
                </View>
                <View style={styles.contactOptionContent}>
                  <ThemedText style={styles.contactOptionTitle}>Email</ThemedText>
                  <ThemedText style={styles.contactOptionSubtitle}>
                    {merchant.email || `info@${merchant.username}.com`}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { height: screenWidth * 1.2 }]}>
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

          <View style={styles.heroOverlay} />

          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="#fff" />
          </TouchableOpacity>

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

          <View style={styles.profilePictureContainer}>
            <Image
              source={logoAsset}
              style={[styles.profilePicture, styles.profilePlaceholder]}
              contentFit="cover"
            />
          </View>

          <View style={styles.dotContainer}>
            {heroMediaItems.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentMediaIndex && styles.activeDot]}
              />
            ))}
          </View>
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
          <ThemedText style={styles.bioText}>{merchant.bio}</ThemedText>
          <View style={styles.locationContainer}>
            <IconSymbol name="location.fill" size={14} color="#666" />
            <ThemedText style={styles.locationText}>{merchant.location}</ThemedText>
          </View>
        </View>

        {/* Category Tabs */}
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContainer}
          >
            {categories.map((category) => (
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
                  {category}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Product Grid */}
        <EvenGrid data={gridData} onItemPress={handleGridItemPress} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroSection: {
    position: 'relative',
  },
  heroCarousel: {
    width: '100%',
    height: '100%',
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
