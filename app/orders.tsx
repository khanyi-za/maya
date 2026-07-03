import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useOrders } from '@/hooks/useOrderQueries';
import { useAuthStore } from '@/lib/auth-store';
import type { OrderListItem } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';
import { ORDER_STATUS } from '@/lib/order-status';
import { useThemeColors } from '@/lib/theme';

function relativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (now.toDateString() === then.toDateString()) {
    const hh = then.getHours().toString().padStart(2, '0');
    const mm = then.getMinutes().toString().padStart(2, '0');
    return `Today at ${hh}:${mm}`;
  }
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function OrdersSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-row gap-3 rounded-xl border border-border p-3">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <View className="flex-1 gap-2 py-1">
            <View className="flex-row justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </View>
            <Skeleton className="h-3 w-2/5" />
            <View className="flex-row justify-between">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const authStatus = useAuthStore((s) => s.state.status);
  const ordersQuery = useOrders();

  const orders = ordersQuery.data?.pages.flatMap((p) => p.orders) ?? [];

  const renderBody = () => {
    if (authStatus === 'guest') {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <IconSymbol name="bag" size={72} color={colors.mutedForeground} />
          <Text variant="title" className="mb-2 mt-6 text-center">
            Sign in to see your purchases
          </Text>
          <Text variant="body" className="mb-6 text-center text-muted-foreground">
            Your purchase history lives in your YIIVA account
          </Text>
          <Button variant="brand" className="px-10" onPress={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </View>
      );
    }

    if (ordersQuery.isPending || authStatus === 'loading') {
      return <OrdersSkeleton />;
    }

    if (ordersQuery.isError) {
      return (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <IconSymbol name="exclamationmark.triangle" size={72} color={colors.mutedForeground} />
          <Text variant="title" className="text-center">
            Couldn&apos;t load your purchases
          </Text>
          <Button variant="brand" className="px-10" onPress={() => ordersQuery.refetch()}>
            Retry
          </Button>
        </View>
      );
    }

    if (orders.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <IconSymbol name="bag" size={72} color={colors.mutedForeground} />
          <Text variant="title" className="mb-2 mt-6 text-center">
            No purchases yet
          </Text>
          <Text variant="body" className="mb-6 text-center text-muted-foreground">
            When you check out, your purchases will appear here.
          </Text>
          <Button variant="brand" className="px-10" onPress={() => router.replace('/(tabs)')}>
            Start shopping
          </Button>
        </View>
      );
    }

    return (
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isRefetching && !ordersQuery.isFetchingNextPage}
            onRefresh={() => ordersQuery.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (ordersQuery.hasNextPage && !ordersQuery.isFetchingNextPage) {
            ordersQuery.fetchNextPage();
          }
        }}
        ListFooterComponent={
          ordersQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.mutedForeground} style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() =>
              router.push({ pathname: '/track-order', params: { orderId: item.id } })
            }
          />
        )}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading">My purchases</Text>
        <View className="w-10" />
      </View>

      {renderBody()}
    </View>
  );
}

function OrderCard({
  order,
  onPress,
}: {
  order: OrderListItem;
  onPress: () => void;
}) {
  const meta = ORDER_STATUS[order.status];
  const thumb = imageSource(order.image);
  const store =
    order.storeCount > 1
      ? `${order.storeName} +${order.storeCount - 1} more`
      : order.storeName;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="mb-3">
      <Card className="flex-row gap-3 p-3">
        <View className="h-14 w-14 overflow-hidden rounded-lg bg-muted">
          {thumb ? (
            <Image
              source={thumb}
              style={{ width: 56, height: 56 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-14 w-14 bg-muted" />
          )}
        </View>

        <View className="flex-1 justify-center">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="label" numberOfLines={1} className="flex-1">
              {store}
            </Text>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </View>

          <Text variant="caption" className="mt-0.5">
            Purchase #{order.orderNumber}
          </Text>

          <View className="mt-1.5 flex-row items-end justify-between gap-2">
            <Text variant="caption" className="flex-1">
              {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
              {relativeDate(order.placedAt)}
            </Text>
            <Text variant="label">{formatZAR(order.total)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
