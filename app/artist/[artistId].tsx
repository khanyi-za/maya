import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/theme';
import { useAllCategories } from '@/hooks/useHomeQueries';
import { resolveFollowed, useServerSocial } from '@/lib/server-social';
import { useRequireAuth, useToggleFollow } from '@/hooks/useSocialMutations';
import { imageSource } from '@/lib/image-source';
import { haptics } from '@/lib/haptics';
import { APIError } from '@/lib/api-client';
import { track } from '@/lib/analytics';
import { merchantLocations, type MerchantLocation } from '@/lib/merchant-locations';
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

/** Home-category-card look: 145×190 image tile with a bottom scrim label. */
function BrowseCard({
  image,
  label,
  count,
  onPress,
}: {
  image: string | null;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="relative h-[190px] w-[145px] overflow-hidden rounded-xl"
      onPress={onPress}
      activeOpacity={0.9}
    >
      {image ? (
        <Image
          source={imageSource(image)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View className="h-full w-full bg-muted" />
      )}
      {/* Dark scrim over imagery — intentional in both themes (white label on media). */}
      <View className="absolute bottom-0 left-0 right-0 items-center justify-center bg-black/40 px-2 py-2">
        <Text className="text-center text-[13px] font-semibold text-white" numberOfLines={1}>
          {label}
        </Text>
        {count !== undefined && (
          <Text className="text-center text-[11px] text-white/80">
            {count} item{count === 1 ? '' : 's'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Collapsible store-locations list for the bio section. Collapsed it reads
 * like the old one-line location row (pin + city, or "N locations"); expanded
 * it lists each storefront with its address. Data is mock per-brand fixtures
 * until nuwa serves real locations (see lib/merchant-locations.ts).
 */
function LocationsDropdown({ locations }: { locations: MerchantLocation[] }) {
  const [open, setOpen] = useState(false);
  const colors = useThemeColors();

  if (locations.length === 0) return null;

  const collapsedLabel =
    locations.length === 1 ? locations[0].city : `${locations.length} locations`;

  // City-only fallback (brands without owner-supplied storefronts): render a
  // plain location line — no chevron, nothing to expand.
  if (locations.length === 1 && !locations[0].address) {
    return (
      <View className="flex-row items-center gap-1.5 py-1">
        <IconSymbol name="location.fill" size={14} color={colors.mutedForeground} />
        <Text variant="caption">{collapsedLabel}</Text>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        className="flex-row items-center gap-1.5 self-start py-1"
        onPress={() => {
          haptics.light();
          setOpen((prev) => !prev);
        }}
      >
        <IconSymbol name="location.fill" size={14} color={colors.mutedForeground} />
        <Text variant="caption">{collapsedLabel}</Text>
        <IconSymbol
          name={open ? 'chevron.up' : 'chevron.down'}
          size={11}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {open && (
        <View className="mt-2 gap-3 rounded-lg bg-muted px-4 py-3.5">
          {locations.map((loc) => (
            <View key={loc.id} className="flex-row items-start gap-3">
              <View className="mt-0.5">
                <IconSymbol name="mappin.and.ellipse" size={16} color={colors.brand} />
              </View>
              <View className="flex-1">
                <Text variant="label">{loc.label}</Text>
                {loc.address ? <Text variant="caption">{loc.address}</Text> : null}
                <Text variant="caption">{loc.city}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function BrowseRailEmpty({ label }: { label: string }) {
  return (
    <View className="items-center px-10 pb-10 pt-4">
      <Text variant="body" className="text-center text-muted-foreground">
        This brand hasn&apos;t set up {label} yet.
      </Text>
    </View>
  );
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
    }
  );

  // Drive play/pause + mute from live state — the setup callback only runs at
  // player creation, which is why videos past the cover never autoplayed on
  // swipe (and the mute toggle didn't reach existing players).
  React.useEffect(() => {
    if (media.type !== 'video') return;
    videoPlayer.muted = isVideoMuted;
    if (index === currentMediaIndex) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [currentMediaIndex, isVideoMuted, index, media.type, videoPlayer]);

  return (
    <View className="h-full" style={{ width: screenWidth }}>
      {media.type === 'image' ? (
        <Image
          source={media.source}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
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
  // What the browse rail shows: the brand's own site sections (collections)
  // or YIIVA categories this brand sells in.
  const [browseMode, setBrowseMode] = useState<'collections' | 'categories'>('collections');
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
  // Unfiltered page-1 fetch — its `categories` field lists the platform
  // category slugs this brand actually sells in (feeds the Categories rail).
  const productsQuery = useMerchantProducts(username);
  const categoriesQuery = useAllCategories();
  const merchant = profileQuery.data?.merchant;
  useTrackMerchantView(merchant?.id, username);

  // The brand's own site sections (StoreCollections, merchant-ordered).
  const collections = merchant?.collections ?? [];

  // Cross-reference the brand's category slugs against the platform chip
  // list (name + card image) — the same imagery the Home rail uses.
  // FIELDS-only for now (owner call 2026-07-09): swap each card's platform
  // image for the brand's OWN product shot in that category
  // (`categoryCovers` from the merchant-products endpoint). Drop the
  // username gate to roll brand-own covers out to every profile.
  const brandCategories = React.useMemo(() => {
    const firstPage = productsQuery.data?.pages[0];
    const slugs = new Set(firstPage?.categories ?? []);
    const covers =
      username === 'fieldsstore'
        ? new Map(
            (firstPage?.categoryCovers ?? []).map((c) => [c.slug, c.image])
          )
        : null;
    return (categoriesQuery.data?.categories ?? [])
      .filter((c) => slugs.has(c.slug))
      .map((c) => ({ ...c, image: covers?.get(c.slug) ?? c.image }));
  }, [productsQuery.data, categoriesQuery.data, username]);

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
    haptics.light();
    const isCurrentlySubscribed = resolveFollowed(
      followed,
      merchant.id,
      merchant.isFollowedByMe
    );
    toggleFollow(merchant.id, isCurrentlySubscribed);
    track(isCurrentlySubscribed ? 'brand_unsubscribed' : 'brand_subscribed', {
      merchantId: merchant.id,
      username,
    });
    // Confirm on subscribe only (nothing on unsubscribe) — UI copy says
    // "Subscribe"; the API vocabulary stays "follow".
    if (!isCurrentlySubscribed) {
      Alert.alert(
        'Subscribed',
        `You will now get notifications when ${merchant.displayName} releases new items.`
      );
    }
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

  // Card tap → the full-screen browse sheet (app/merchant-browse.tsx).
  const handleBrowse = (type: 'collection' | 'category', slug: string, name: string) => {
    haptics.light();
    router.push({
      pathname: '/merchant-browse',
      params: { username, type, slug, name },
    });
  };

  const handleMediaScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    setCurrentMediaIndex(index);
  };

  const toggleVideoMute = () => setIsVideoMuted(!isVideoMuted);

  // ── Loading / error / suspended states ──

  if (profileQuery.isPending) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {/* Banner */}
        <Skeleton className="w-full rounded-none" style={{ height: screenWidth * 1.33 }} />
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
        {/* Browse toggle + card rail */}
        <Skeleton className="mx-5 mt-6 h-11 rounded-lg" />
        <View className="mt-4 flex-row gap-3 px-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[190px] w-[145px] rounded-xl" />
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
          className="px-8"
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
          className="px-8"
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
        <View className="relative" style={{ height: screenWidth * 1.33 }}>
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
              variant="logo"
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
                      ? 'w-5 h-2 rounded-full bg-white'
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
            className="flex-1"
            onPress={handleFollow}
          >
            {isFollowing ? 'Subscribed' : 'Subscribe'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
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
          <LocationsDropdown locations={merchantLocations(username)} />
        </View>

        {/* Browse toggle — the Shop screen's segmented control, scoped to
            this brand: its own site sections vs the YIIVA categories it
            sells in. Cards below open the full-screen browse sheet. */}
        <View className="mb-4 mt-2 px-5">
          <View className="flex-row rounded-lg bg-muted p-0.5">
            <TouchableOpacity
              className={cn(
                'flex-1 items-center justify-center rounded-md px-4 py-2.5',
                browseMode === 'collections' && 'bg-card'
              )}
              onPress={() => {
                haptics.light();
                setBrowseMode('collections');
              }}
            >
              <Text
                className={cn(
                  'text-[15px]',
                  browseMode === 'collections'
                    ? 'font-semibold text-foreground'
                    : 'font-medium text-muted-foreground'
                )}
              >
                Collections
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={cn(
                'flex-1 items-center justify-center rounded-md px-4 py-2.5',
                browseMode === 'categories' && 'bg-card'
              )}
              onPress={() => {
                haptics.light();
                setBrowseMode('categories');
              }}
            >
              <Text
                className={cn(
                  'text-[15px]',
                  browseMode === 'categories'
                    ? 'font-semibold text-foreground'
                    : 'font-medium text-muted-foreground'
                )}
              >
                Categories
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Browse rail — Home-category-card design (image, scrim, label). */}
        {browseMode === 'collections' ? (
          collections.length === 0 ? (
            <BrowseRailEmpty label="collections" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 32 }}
            >
              {collections.map((collection) => (
                <BrowseCard
                  key={collection.slug}
                  image={collection.image}
                  label={collection.name}
                  count={collection.productCount}
                  onPress={() => handleBrowse('collection', collection.slug, collection.name)}
                />
              ))}
            </ScrollView>
          )
        ) : productsQuery.isPending || categoriesQuery.isPending ? (
          <View className="flex-row gap-3 px-5 pb-8">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[190px] w-[145px] rounded-xl" />
            ))}
          </View>
        ) : brandCategories.length === 0 ? (
          <BrowseRailEmpty label="categories" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 32 }}
          >
            {brandCategories.map((category) => (
              <BrowseCard
                key={category.slug}
                image={category.image}
                label={category.displayName}
                onPress={() => handleBrowse('category', category.slug, category.displayName)}
              />
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}
