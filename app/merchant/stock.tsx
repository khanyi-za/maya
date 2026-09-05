import React from 'react';
import { FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMerchantLowStock } from '@/hooks/useMerchantDashboard';
import type { LowStockItem } from '@/lib/api-client';
import { imageSource } from '@/lib/image-source';
import { useThemeColors } from '@/lib/theme';

// Read-only stock alerts — availability is net of cart reservations, per
// variant. Restocking happens on the web dashboard (v1).

function StockSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-row gap-3 rounded-xl border border-border p-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <View className="flex-1 gap-2 py-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </View>
        </View>
      ))}
    </View>
  );
}

function StockCard({ item }: { item: LowStockItem }) {
  const thumb = imageSource(item.primaryImageUrl);
  const outBadge = (available: number) =>
    available === 0 ? (
      <Badge tone="danger">Out of stock</Badge>
    ) : (
      <Badge tone="warning">{available} left</Badge>
    );

  return (
    <Card className="mb-3 p-3">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 overflow-hidden rounded-lg bg-muted">
          {thumb && (
            <Image source={thumb} style={{ width: 48, height: 48 }} contentFit="cover" />
          )}
        </View>
        <View className="flex-1">
          <Text variant="label" numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="caption" className="mt-0.5">
            Alert threshold: {item.lowStockThreshold}
          </Text>
        </View>
        {!item.hasVariants && outBadge(item.availableStock)}
      </View>

      {item.hasVariants && (
        <View className="mt-2 border-t border-border pt-1">
          {item.lowVariants.map((v) => (
            <View key={v.id} className="flex-row items-center justify-between py-1.5">
              <Text variant="caption" className="flex-1" numberOfLines={1}>
                {v.name}
              </Text>
              {outBadge(v.availableStock)}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function MerchantStockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const stockQuery = useMerchantLowStock();

  const renderBody = () => {
    if (stockQuery.isPending) {
      return <StockSkeleton />;
    }

    if (stockQuery.isError) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load stock alerts">
          <Button variant="brand" className="mt-4 px-10" onPress={() => stockQuery.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    const items = stockQuery.data.items;
    if (items.length === 0) {
      return (
        <EmptyState
          fill
          icon="shippingbox"
          title="No stock alerts"
          caption="Products running low will appear here."
        />
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={stockQuery.isRefetching}
            onRefresh={() => stockQuery.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
        renderItem={({ item }) => <StockCard item={item} />}
        ListFooterComponent={
          <Text variant="caption" className="mt-2 text-center">
            Update stock from your web dashboard.
          </Text>
        }
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
        <Text variant="heading">Stock alerts</Text>
        <View className="w-10" />
      </View>

      {renderBody()}
    </View>
  );
}
