import React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useCancelMerchantOrder,
  useMerchantOrder,
  useUpdateMerchantOrderStatus,
} from '@/hooks/useMerchantDashboard';
import { APIError, type MerchantCancelReason } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { imageSource } from '@/lib/image-source';
import { MERCHANT_SALE_STATUS } from '@/lib/merchant-sale-status';
import { useThemeColors } from '@/lib/theme';

// Sale detail + the daily-ops actions: advance CONFIRMED→PROCESSING→
// READY_FOR_DISPATCH, or cancel while still CONFIRMED/PROCESSING. Courier and
// delivery statuses arrive via ShipLogic webhooks — no merchant action there.

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text variant={bold ? 'label' : 'caption'}>{label}</Text>
      <Text variant={bold ? 'label' : 'caption'} className="text-foreground">
        {value}
      </Text>
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View className="gap-4 p-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </View>
  );
}

export default function MerchantSaleDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const saleQuery = useMerchantOrder(orderId);
  const updateStatus = useUpdateMerchantOrderStatus();
  const cancelSale = useCancelMerchantOrder();

  const busy = updateStatus.isPending || cancelSale.isPending;

  const handleActionError = (error: unknown) => {
    saleQuery.refetch();
    const message =
      error instanceof APIError &&
      (error.code === 'INVALID_TRANSITION' || error.code === 'CANNOT_CANCEL')
        ? 'This sale has moved on since you opened it — the screen has been refreshed.'
        : 'Something went wrong. Please try again.';
    Alert.alert("Couldn't update the sale", message);
  };

  const advance = (status: 'PROCESSING' | 'READY_FOR_DISPATCH') => {
    if (!orderId || busy) return;
    haptics.light();
    updateStatus.mutate(
      { orderId, status },
      { onError: handleActionError }
    );
  };

  const confirmCancel = () => {
    if (!orderId || busy) return;
    const cancelWith = (reason: MerchantCancelReason) =>
      cancelSale.mutate({ orderId, reason }, { onError: handleActionError });

    Alert.alert(
      'Cancel this sale?',
      'The buyer will be notified and refunded. Why are you cancelling?',
      [
        { text: 'Out of stock', onPress: () => cancelWith('OUT_OF_STOCK') },
        { text: "Can't fulfil it", onPress: () => cancelWith('CANNOT_FULFILL') },
        { text: 'Other reason', onPress: () => cancelWith('OTHER') },
        { text: 'Keep the sale', style: 'cancel' },
      ]
    );
  };

  const renderBody = () => {
    if (saleQuery.isPending) {
      return <DetailSkeleton />;
    }

    if (saleQuery.isError || !saleQuery.data) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load this sale">
          <Button variant="brand" className="mt-4 px-10" onPress={() => saleQuery.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    const sale = saleQuery.data.order;
    const meta = MERCHANT_SALE_STATUS[sale.status];
    const canAdvanceToProcessing = sale.status === 'CONFIRMED';
    const canAdvanceToReady = sale.status === 'PROCESSING';
    const canCancel = sale.status === 'CONFIRMED' || sale.status === 'PROCESSING';

    return (
      <>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        >
          {/* Status + reference */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text variant="heading">Order #{sale.orderNumber}</Text>
              <Text variant="caption" className="mt-0.5">
                Placed {formatDate(sale.placedAt)}
              </Text>
            </View>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </View>

          {sale.cancelReason && (
            <Card className="mt-4 p-4">
              <Text variant="caption">Cancellation reason: {sale.cancelReason}</Text>
            </Card>
          )}

          {/* Items */}
          <Text variant="micro" className="mb-2 mt-5 uppercase tracking-wide">
            Items
          </Text>
          <Card className="px-4">
            {sale.items.map((item, i) => {
              const thumb = imageSource(item.productImageUrl);
              return (
                <View
                  key={item.id}
                  className={
                    i > 0
                      ? 'flex-row items-center gap-3 border-t border-border py-3'
                      : 'flex-row items-center gap-3 py-3'
                  }
                >
                  <View className="h-12 w-12 overflow-hidden rounded-lg bg-muted">
                    {thumb && (
                      <Image source={thumb} style={{ width: 48, height: 48 }} contentFit="cover" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text variant="body" numberOfLines={1}>
                      {item.productTitle}
                    </Text>
                    <Text variant="caption" className="mt-0.5">
                      {item.variantName ? `${item.variantName} · ` : ''}
                      {item.quantity} × {formatZAR(item.unitPriceInCents)}
                    </Text>
                  </View>
                  <Text variant="label">{formatZAR(item.totalInCents)}</Text>
                </View>
              );
            })}
          </Card>

          {/* Money */}
          <Text variant="micro" className="mb-2 mt-5 uppercase tracking-wide">
            Totals
          </Text>
          <Card className="px-4 py-3">
            <Row label="Subtotal" value={formatZAR(sale.subtotalInCents)} />
            <Row label="Shipping (paid by YIIVA)" value={formatZAR(sale.shippingInCents)} />
            {sale.discountInCents > 0 && (
              <Row label="Discount" value={`−${formatZAR(sale.discountInCents)}`} />
            )}
            <View className="my-1 border-t border-border" />
            <Row label="Sale total" value={formatZAR(sale.totalInCents)} bold />
            {sale.payment && (
              <Row
                label="Your payout"
                value={formatZAR(sale.payment.merchantPayoutInCents)}
                bold
              />
            )}
          </Card>

          {/* Buyer + delivery */}
          <Text variant="micro" className="mb-2 mt-5 uppercase tracking-wide">
            Deliver to
          </Text>
          <Card className="px-4 py-3">
            <Text variant="body">{sale.shippingAddress.recipientName}</Text>
            <Text variant="caption" className="mt-1">
              {sale.shippingAddress.addressLine1}
              {sale.shippingAddress.addressLine2 ? `, ${sale.shippingAddress.addressLine2}` : ''}
            </Text>
            <Text variant="caption">
              {sale.shippingAddress.city}, {sale.shippingAddress.province},{' '}
              {sale.shippingAddress.postalCode}
            </Text>
            <Text variant="caption" className="mt-1">
              {sale.shippingAddress.phone}
            </Text>
          </Card>
        </ScrollView>

        {/* Action footer */}
        {(canAdvanceToProcessing || canAdvanceToReady || canCancel) && (
          <View
            className="gap-2 border-t border-border bg-background px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            {canAdvanceToProcessing && (
              <Button
                variant="brand"
                loading={updateStatus.isPending}
                disabled={busy}
                onPress={() => advance('PROCESSING')}
              >
                Start preparing
              </Button>
            )}
            {canAdvanceToReady && (
              <Button
                variant="brand"
                loading={updateStatus.isPending}
                disabled={busy}
                onPress={() => advance('READY_FOR_DISPATCH')}
              >
                Ready for courier
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                textClassName="text-danger"
                loading={cancelSale.isPending}
                disabled={busy}
                onPress={confirmCancel}
              >
                Cancel sale
              </Button>
            )}
          </View>
        )}
      </>
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
        <Text variant="heading">Sale</Text>
        <View className="w-10" />
      </View>

      {renderBody()}
    </View>
  );
}
