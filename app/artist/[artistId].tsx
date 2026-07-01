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
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EvenGrid } from '@/components/EvenGrid';
import { useThemeColors } from '@/lib/theme';
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
    <View className="h-full" style={{ width: screenWidth }}>
      {media.type === 'image' ? (
        <Image source={media.source} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <VideoView
          player={videoPlayer}
          style={{ width: '100%', height: '100%' }}
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
  const colors = useThemeColors();
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
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {/* Banner */}
        <Skeleton className="w-full rounded-none" style={{ height: screenWidth * 1.2 }} />
        {/* Avatar overlapping the banner */}
        <View className="px-5">
          <Skeleton className="w-20 h-20 rounded-full -mt-10 border-4 border-background" />
        </View>
        {/* Name */}
        <Skeleton className="h-5 w-1/2 mt-4 mx-5" />
        {/* Action buttons */}
        <View className="flex-row gap-3 px-5 mt-4">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 flex-1 rounded-lg" />
        </View>
        {/* Bio */}
        <Skeleton className="h-4 w-3/4 mx-5 mt-6" />
        <Skeleton className="h-4 w-2/3 mx-5 mt-2" />
        {/* Product grid */}
        <View className="flex-row flex-wrap justify-between px-4 mt-8 gap-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-[48%] aspect-square rounded-lg" />
          ))}
        </View>
      </View>
    );
  }

  if (profileQuery.isError || !merchant) {
    const notFound =
      profileQuery.error instanceof APIError && profileQuery.error.status === 404;
    return (
      <View className="flex-1 bg-background items-center justify-center px-10 gap-4">
        <Stack.Screen options={{ headerShown: false }} />
        <Text variant="heading" className="text-center">
          {notFound ? 'Brand not found' : "Couldn't load this brand"}
        </Text>
        <Button
          variant="primary"
          className="rounded-full px-8"
          onPress={() =>
            notFound ? router.dismissTo('/(tabs)') : profileQuery.refetch()
          }
        >
          {notFound ? 'Browse YIIVA' : 'Retry'}
        </Button>
        <TouchableOpacity onPress={() => router.back()}>
          <Text variant="caption" className="underline">
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (merchant.status !== 'ACTIVE') {
    const suspended = merchant.status === 'SUSPENDED';
    return (
      <View className="flex-1 bg-background items-center justify-center px-10 gap-4">
        <Stack.Screen options={{ headerShown: false }} />
        <Text variant="heading" className="text-center">
          {merchant.displayName}
        </Text>
        <Badge tone={suspended ? 'warning' : 'neutral'}>
          {suspended ? 'Suspended' : 'Unavailable'}
        </Badge>
        <Text variant="body" className="text-muted-foreground text-center">
          This brand is currently unavailable on YIIVA.
        </Text>
        <Button
          variant="primary"
          className="rounded-full px-8"
          onPress={() => router.dismissTo('/(tabs)')}
        >
          Browse YIIVA
        </Button>
      </View>
    );
  }

  const isFollowing = resolveFollowed(followed, merchant.id, merchant.isFollowedByMe);
  const contactEmail = merchant.contact.email;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View className="flex-1 items-center justify-center">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => setShowContactModal(false)}
          />
          <Card className="w-[85%] max-w-[400px]">
            <View className="flex-row justify-between items-center px-5 pt-5 pb-4">
              <Text variant="heading">Contact {merchant.displayName}</Text>
              <TouchableOpacity
                onPress={() => setShowContactModal(false)}
                className="p-1"
              >
                <IconSymbol name="xmark" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Separator />

            <View className="py-2">
              <TouchableOpacity
                className="flex-row items-center px-5 py-4 gap-4"
                onPress={handleSendMessage}
              >
                <View className="w-12 h-12 rounded-full bg-brand-subtle items-center justify-center">
                  <IconSymbol name="message" size={24} color={colors.brand} />
                </View>
                <View className="flex-1">
                  <Text variant="label">Message {merchant.displayName}</Text>
                  <Text variant="caption">Send a direct message</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.border} />
              </TouchableOpacity>

              {contactEmail && (
                <TouchableOpacity
                  className="flex-row items-center px-5 py-4 gap-4"
                  onPress={handleSendEmail}
                >
                  <View className="w-12 h-12 rounded-full bg-brand-subtle items-center justify-center">
                    <IconSymbol name="envelope" size={24} color={colors.brand} />
                  </View>
                  <View className="flex-1">
                    <Text variant="label">Email</Text>
                    <Text variant="caption">{contactEmail}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.border} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching}
            tintColor={colors.mutedForeground}
            onRefresh={() => {
              profileQuery.refetch();
              productsQuery.refetch();
            }}
          />
        }
      >
        {/* Hero Section */}
        <View className="relative" style={{ height: screenWidth * 1.2 }}>
          {heroMediaItems.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleMediaScroll}
              scrollEventThrottle={16}
              className="w-full h-full"
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
            <View className="w-full h-full bg-black items-center justify-center">
              {merchant.logo && (
                <Image
                  source={imageSource(merchant.logo)}
                  style={{ width: '100%', height: '100%', opacity: 0.4 }}
                  contentFit="cover"
                />
              )}
            </View>
          )}

          <View className="absolute inset-0 bg-black/30" pointerEvents="none" />

          <TouchableOpacity
            className="absolute left-5 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            style={{ top: insets.top + 10 }}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="#fff" />
          </TouchableOpacity>

          {hasVideo && (
            <TouchableOpacity
              className="absolute right-5 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
              style={{ top: insets.top + 10 }}
              onPress={toggleVideoMute}
            >
              <IconSymbol
                name={isVideoMuted ? 'speaker.slash' : 'speaker.wave.2'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          )}

          <View className="absolute left-5" style={{ bottom: -30 }}>
            <Avatar
              uri={merchant.logo}
              fallback={merchant.displayName?.charAt(0)}
              size={80}
              className="border-4 border-background"
            />
          </View>

          {heroMediaItems.length > 1 && (
            <View className="absolute bottom-5 left-0 right-0 flex-row justify-center items-center gap-2">
              {heroMediaItems.map((_, index) => (
                <View
                  key={index}
                  className={
                    index === currentMediaIndex
                      ? 'w-2 h-2 rounded-full bg-white'
                      : 'w-2 h-2 rounded-full bg-white/50'
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* Merchant Name */}
        <View className="flex-row items-center px-5 gap-3 mb-3" style={{ paddingTop: 35.2 }}>
          <Text variant="heading" className="tracking-wide">
            {merchant.displayName}
          </Text>
          {merchant.isVerified && <Badge tone="brand">Verified</Badge>}
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center px-5 pt-4 gap-3">
          <Button
            variant={isFollowing ? 'outline' : 'brand'}
            className="flex-1 rounded-full"
            onPress={handleFollow}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            onPress={handleContact}
          >
            Contact
          </Button>
        </View>

        {/* Bio Section */}
        <View className="px-5 pt-5 pb-3">
          {merchant.bio ? (
            <Text variant="body" className="mb-3">
              {merchant.bio}
            </Text>
          ) : null}
          {merchant.location ? (
            <View className="flex-row items-center gap-1.5">
              <IconSymbol name="location.fill" size={14} color={colors.mutedForeground} />
              <Text variant="caption">{merchant.location}</Text>
            </View>
          ) : null}
        </View>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <View className="pt-2 pb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {['All', ...categories].map((category) => {
                const selected = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    className={
                      selected
                        ? 'px-4 py-2 rounded-sm border-b-2 border-foreground'
                        : 'px-4 py-2 rounded-sm bg-muted border-b-2 border-transparent'
                    }
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      variant="caption"
                      className={selected ? 'text-foreground font-semibold' : ''}
                    >
                      {category === 'All'
                        ? 'All'
                        : category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Product Grid */}
        {productsQuery.isPending ? (
          <View className="flex-row flex-wrap justify-between px-4 gap-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-[48%] aspect-square rounded-lg" />
            ))}
          </View>
        ) : productsQuery.isError ? (
          <View className="py-10 items-center gap-3">
            <Text variant="body" className="text-muted-foreground text-center">
              Couldn&apos;t load this brand&apos;s products.
            </Text>
            <Button
              variant="primary"
              className="rounded-full px-8"
              onPress={() => productsQuery.refetch()}
            >
              Retry
            </Button>
          </View>
        ) : gridData.length === 0 ? (
          <View className="py-16 items-center gap-3">
            <IconSymbol name="bag" size={40} color={colors.mutedForeground} />
            <Text variant="body" className="text-muted-foreground text-center">
              No products yet.
            </Text>
          </View>
        ) : (
          <>
            <EvenGrid data={gridData} onItemPress={handleGridItemPress} />
            {productsQuery.isFetchingNextPage && (
              <ActivityIndicator
                size="small"
                color={colors.mutedForeground}
                className="my-4"
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
