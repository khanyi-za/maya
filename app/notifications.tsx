import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotificationQueries';
import { useAuthStore } from '@/lib/auth-store';
import { haptics } from '@/lib/haptics';
import { useThemeColors } from '@/lib/theme';
import type { AppNotification, AppNotificationType } from '@/lib/api-client';

function relativeTime(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

// Notification type → SF Symbol. `accent` types tint brand; the rest stay muted.
const ICON_FOR: Record<string, { name: string; accent?: boolean }> = {
  ORDER_CONFIRMED: { name: 'checkmark.circle', accent: true },
  PAYMENT_RECEIVED: { name: 'creditcard', accent: true },
  ORDER_SHIPPED: { name: 'shippingbox' },
  ORDER_DELIVERED: { name: 'checkmark.circle' },
  ORDER_CANCELLED: { name: 'xmark.circle' },
  PAYMENT_FAILED: { name: 'exclamationmark.triangle' },
  PROMOTION: { name: 'tag' },
  SYSTEM: { name: 'bell' },
};

function iconFor(type: AppNotificationType) {
  return ICON_FOR[type as string] ?? { name: 'bell' };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const authStatus = useAuthStore((s) => s.state.status);
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = query.data?.pages.flatMap((p) => p.notifications) ?? [];
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;

  const handlePress = (n: AppNotification) => {
    haptics.light();
    if (!n.isRead) markRead.mutate(n.id);
    const orderId = n.data?.orderId;
    if (orderId) {
      router.push({ pathname: '/track-order', params: { orderId } });
    }
  };

  const renderBody = () => {
    if (authStatus === 'guest') {
      return (
        <EmptyState fill icon="bell" title="Sign in to see your notifications">
          <Button variant="brand" className="mt-4 px-10" onPress={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </EmptyState>
      );
    }

    if (query.isPending || authStatus === 'loading') {
      // Mirrors the row anatomy: icon circle + title/body/time lines.
      return (
        <View className="pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="flex-row gap-3 border-b border-border px-5 py-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-16" />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (query.isError) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load notifications">
          <Button variant="brand" className="mt-4 px-10" onPress={() => query.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    if (notifications.length === 0) {
      return (
        <EmptyState
          fill
          icon="bell"
          title="No notifications yet"
          caption="Purchase updates and confirmations will show up here."
        />
      );
    }

    return (
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.mutedForeground}
              style={{ marginVertical: 16 }}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const icon = iconFor(item.type);
          return (
            <TouchableOpacity
              className={`flex-row gap-3 border-b border-border px-5 py-4 ${
                !item.isRead ? 'bg-brand-subtle' : 'bg-background'
              }`}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              {/* Type icon */}
              <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-muted">
                <IconSymbol
                  name={icon.name as any}
                  size={18}
                  color={icon.accent ? colors.brand : colors.mutedForeground}
                />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  {!item.isRead && <View className="h-2 w-2 rounded-full bg-brand" />}
                  <Text
                    variant="label"
                    className={`flex-1 ${!item.isRead ? '' : 'font-normal text-muted-foreground'}`}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text variant="body" numberOfLines={2} className="mt-0.5 text-muted-foreground">
                  {item.body}
                </Text>
                <Text variant="caption" className="mt-1.5">
                  {relativeTime(item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="flex-row items-center justify-between border-b border-border bg-background px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="w-14 py-1">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading">Notifications</Text>
        {authStatus === 'authenticated' && unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAll.mutate()} className="w-14">
            <Text variant="caption" className="text-right text-brand">
              Read all
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="w-14" />
        )}
      </View>

      {renderBody()}
    </View>
  );
}
