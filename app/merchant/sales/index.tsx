import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMerchantOrders } from '@/hooks/useMerchantDashboard';
import type { MerchantOrderSummary, MerchantSaleStatus } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { MERCHANT_SALE_STATUS } from '@/lib/merchant-sale-status';
import { useThemeColors } from '@/lib/theme';

const FILTERS: { label: string; status?: MerchantSaleStatus }[] = [
  { label: 'All' },
  { label: 'New', status: 'CONFIRMED' },
  { label: 'Preparing', status: 'PROCESSING' },
  { label: 'Ready', status: 'READY_FOR_DISPATCH' },
];

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
  return then.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SalesSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} className="gap-2 rounded-xl border border-border p-4">
          <View className="flex-row justify-between">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </View>
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-4 w-16" />
        </View>
      ))}
    </View>
  );
}

export default function MerchantSalesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  // Deep links from the dashboard's needs-attention chips preselect a stage.
  const { initialStatus } = useLocalSearchParams<{ initialStatus?: MerchantSaleStatus }>();
  const [filter, setFilter] = useState<MerchantSaleStatus | undefined>(
    initialStatus && FILTERS.some((f) => f.status === initialStatus)
      ? initialStatus
      : undefined
  );
  const salesQuery = useMerchantOrders(filter);

  const sales = salesQuery.data?.pages.flatMap((p) => p.orders) ?? [];

  const renderBody = () => {
    if (salesQuery.isPending) {
      return <SalesSkeleton />;
    }

    if (salesQuery.isError) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load your sales">
          <Button variant="brand" className="mt-4 px-10" onPress={() => salesQuery.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    if (sales.length === 0) {
      return (
        <EmptyState
          fill
          icon="chart.bar.fill"
          title={filter ? 'Nothing here right now' : 'No sales yet'}
          caption={
            filter
              ? 'Sales in this stage will appear here.'
              : "They'll show up here the moment a buyer checks out."
          }
        />
      );
    }

    return (
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={salesQuery.isRefetching && !salesQuery.isFetchingNextPage}
            onRefresh={() => salesQuery.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (salesQuery.hasNextPage && !salesQuery.isFetchingNextPage) {
            salesQuery.fetchNextPage();
          }
        }}
        ListFooterComponent={
          salesQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.mutedForeground} style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <SaleCard
            sale={item}
            onPress={() => {
              haptics.light();
              router.push({
                pathname: '/merchant/sales/[orderId]',
                params: { orderId: item.id },
              });
            }}
          />
        )}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading">Sales</Text>
        <View className="w-10" />
      </View>

      {/* Stage filter pills */}
      <View className="flex-row gap-2 px-4 py-3">
        {FILTERS.map((f) => {
          const active = filter === f.status;
          return (
            <TouchableOpacity
              key={f.label}
              activeOpacity={0.7}
              onPress={() => {
                haptics.light();
                setFilter(f.status);
              }}
              className={
                active
                  ? 'rounded-full bg-brand px-4 py-1.5'
                  : 'rounded-full border border-border bg-card px-4 py-1.5'
              }
            >
              <Text
                variant="caption"
                className={active ? 'text-brand-foreground' : 'text-foreground'}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {renderBody()}
    </View>
  );
}

function SaleCard({
  sale,
  onPress,
}: {
  sale: MerchantOrderSummary;
  onPress: () => void;
}) {
  const meta = MERCHANT_SALE_STATUS[sale.status];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="mb-3">
      <Card className="p-4">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="label" numberOfLines={1} className="flex-1">
            {sale.buyerName}
          </Text>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </View>
        <Text variant="caption" className="mt-0.5">
          Order #{sale.orderNumber}
        </Text>
        <View className="mt-1.5 flex-row items-end justify-between gap-2">
          <Text variant="caption" className="flex-1">
            {sale.itemCount} {sale.itemCount === 1 ? 'item' : 'items'} ·{' '}
            {relativeDate(sale.placedAt)}
          </Text>
          <Text variant="label">{formatZAR(sale.totalInCents)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
