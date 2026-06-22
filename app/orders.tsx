import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrders } from '@/hooks/useOrderQueries';
import { useAuthStore } from '@/lib/auth-store';
import type { MobileOrderStatus, OrderListItem } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';

const STATUS_META: Record<MobileOrderStatus, { label: string; fg: string; bg: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', fg: '#9a6700', bg: '#fff4e0' },
  PAYMENT_FAILED: { label: 'Payment failed', fg: '#b3261e', bg: '#fdecec' },
  CONFIRMED: { label: 'Confirmed', fg: '#1c7c44', bg: '#e8f6ee' },
  PREPARING: { label: 'Being prepared', fg: '#1c7c44', bg: '#e8f6ee' },
  SHIPPED: { label: 'Shipped', fg: '#1a73e8', bg: '#e8f0fe' },
  DELIVERED: { label: 'Delivered', fg: '#1c7c44', bg: '#e8f6ee' },
  CANCELLED: { label: 'Cancelled', fg: '#666', bg: '#f0f0f0' },
};

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

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((s) => s.state.status);
  const ordersQuery = useOrders();

  const orders = ordersQuery.data?.pages.flatMap((p) => p.orders) ?? [];

  const renderBody = () => {
    if (authStatus === 'guest') {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>Sign in to see your orders</Text>
          <Text style={styles.stateSubtitle}>
            Your order history lives in your YIIVA account
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (ordersQuery.isPending || authStatus === 'loading') {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      );
    }

    if (ordersQuery.isError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>Couldn&apos;t load your orders</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => ordersQuery.refetch()}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (orders.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>No orders yet</Text>
          <Text style={styles.stateSubtitle}>
            When you check out, your orders will appear here.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.primaryButtonText}>Start shopping</Text>
          </TouchableOpacity>
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
            <ActivityIndicator color="#333" style={{ marginVertical: 16 }} />
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
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My orders</Text>
        <View style={styles.headerSpacer} />
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
  const meta = STATUS_META[order.status];
  const thumb = imageSource(order.image);
  const store =
    order.storeCount > 1
      ? `${order.storeName} +${order.storeCount - 1} more`
      : order.storeName;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.thumb}>
        {thumb ? (
          <Image source={thumb} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <View style={[styles.thumbImage, styles.thumbPlaceholder]} />
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.storeName} numberOfLines={1}>
            {store}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusChipText, { color: meta.fg }]}>{meta.label}</Text>
          </View>
        </View>

        <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>

        <View style={styles.cardBottomRow}>
          <Text style={styles.metaText}>
            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
            {relativeDate(order.placedAt)}
          </Text>
          <Text style={styles.total}>{formatZAR(order.total)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 26,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  thumbImage: {
    width: 56,
    height: 56,
  },
  thumbPlaceholder: {
    backgroundColor: '#f0f0f0',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  storeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  statusChip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  total: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});
