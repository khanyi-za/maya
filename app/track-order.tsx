import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCancelOrder, useOrder, useOrderTracking } from '@/hooks/useOrderQueries';
import { APIError, type MobileOrderStatus } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';
import { ORDER_STATUS } from '@/lib/order-status';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/theme';

interface TimelineStep {
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

function formatDateTime(iso: string | undefined | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function buildTimeline(
  status: MobileOrderStatus,
  statusHistory: { status: string; at: string }[]
): TimelineStep[] {
  const at = (s: string) => statusHistory.find((h) => h.status === s)?.at;

  const confirmedDone = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'].includes(status);
  const shippedDone = ['SHIPPED', 'DELIVERED'].includes(status);
  const deliveredDone = status === 'DELIVERED';

  const steps: TimelineStep[] = [
    {
      title: 'Order Placed',
      description: 'Your order has been received',
      completed: true,
      current: false,
      timestamp: formatDateTime(at('PENDING_PAYMENT')),
    },
    {
      title: 'Order Confirmed',
      description: 'Payment confirmed — the brand is preparing your order',
      completed: confirmedDone,
      current: false,
      timestamp: formatDateTime(at('CONFIRMED')),
    },
    {
      title: 'Shipped',
      description: 'Your order is on its way to you',
      completed: shippedDone,
      current: false,
      timestamp: formatDateTime(at('SHIPPED')),
    },
    {
      title: 'Delivered',
      description: 'Order successfully delivered',
      completed: deliveredDone,
      current: false,
      timestamp: formatDateTime(at('DELIVERED')),
    },
  ];

  const firstIncomplete = steps.find((s) => !s.completed);
  if (firstIncomplete) firstIncomplete.current = true;
  return steps;
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  const orderQuery = useOrder(orderId);
  const trackingQuery = useOrderTracking(orderId);
  const cancelMutation = useCancelOrder();

  const order = orderQuery.data?.order;
  const tracking = trackingQuery.data?.tracking;
  const trackingPending =
    trackingQuery.isError &&
    trackingQuery.error instanceof APIError &&
    trackingQuery.error.status === 404;

  const handleClosePress = () => router.dismissTo('/(tabs)');

  const handleContactBrand = () => {
    const username = order?.items[0]?.merchant.username;
    if (username) router.push(`/chat/${username}`);
  };

  const canCancel =
    !!order &&
    (order.status === 'PENDING_PAYMENT' ||
      (order.status === 'CONFIRMED' &&
        !!order.cancellationEligibleUntil &&
        new Date(order.cancellationEligibleUntil) > new Date()));

  const handleCancelOrder = () => {
    if (!orderId) return;
    Alert.alert('Cancel this order?', 'This can’t be undone.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: () =>
          cancelMutation.mutate(
            { orderId, reason: 'CHANGED_MIND' },
            {
              onError: () =>
                Alert.alert("Couldn't cancel", 'The order may already be processing.'),
            }
          ),
      },
    ]);
  };

  const renderHeader = () => (
    <View
      className="flex-row items-center justify-between border-b border-border bg-card px-5 pb-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      <View className="w-10" />
      <Text variant="heading">Track Order</Text>
      <TouchableOpacity onPress={handleClosePress} className="p-2">
        <IconSymbol name="xmark" size={20} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );

  // ── Loading / error states ──

  if (!orderId || orderQuery.isError || (orderQuery.isSuccess && !order)) {
    const notFound =
      !orderId ||
      (orderQuery.error instanceof APIError && orderQuery.error.status === 404);
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center gap-4 px-10" style={{ paddingTop: insets.top }}>
          <IconSymbol name="exclamationmark.triangle" size={72} color={colors.mutedForeground} />
          <Text variant="title" className="text-center">
            {notFound ? "We couldn't find that order" : "Couldn't load your order"}
          </Text>
          <Button
            variant="brand"
            className="px-10"
            onPress={() => (notFound ? handleClosePress() : orderQuery.refetch())}
          >
            {notFound ? 'Browse YIIVA' : 'Retry'}
          </Button>
        </View>
      </View>
    );
  }

  if (orderQuery.isPending || !order) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View className="gap-4 p-5">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </View>
      </View>
    );
  }

  const statusMeta = ORDER_STATUS[order.status];
  const timeline = buildTimeline(order.status, order.statusHistory);
  const address = order.shipping.address;
  const estimatedDelivery =
    tracking?.estimatedDeliveryTo ?? order.shipping.estimatedDelivery;

  const renderStatusStep = (step: TimelineStep, index: number) => {
    const isLast = index === timeline.length - 1;

    return (
      <View key={step.title} className="flex-row items-start gap-4">
        <View className="w-8 items-center">
          <View
            className={cn(
              'h-8 w-8 items-center justify-center rounded-full border-2',
              step.completed
                ? 'border-success bg-success'
                : step.current
                  ? 'border-brand bg-brand'
                  : 'border-border bg-muted'
            )}
          >
            {step.completed ? (
              <IconSymbol name="checkmark" size={16} color="#fff" />
            ) : (
              <View
                className={cn(
                  'h-3 w-3 rounded-full',
                  step.current ? 'bg-white' : 'bg-border'
                )}
              />
            )}
          </View>
          {!isLast && (
            <View className={cn('mt-2 h-10 w-0.5', step.completed ? 'bg-success' : 'bg-border')} />
          )}
        </View>

        <View className="flex-1 pb-6">
          <Text
            variant="label"
            className={cn(
              'mb-1',
              step.current
                ? 'text-brand'
                : step.completed
                  ? 'text-foreground'
                  : 'text-muted-foreground'
            )}
          >
            {step.title}
          </Text>
          <Text variant="caption" className="mb-1 leading-5">
            {step.description}
          </Text>
          {step.timestamp && (
            <Text variant="micro" className="font-normal">
              {step.timestamp}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={orderQuery.isRefetching}
            onRefresh={() => {
              orderQuery.refetch();
              trackingQuery.refetch();
            }}
            tintColor={colors.mutedForeground}
          />
        }
      >
        {/* Order Info Card */}
        <Card className="mx-5 mt-5 p-5">
          <View className="mb-4 flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text variant="heading" className="mb-1">
                {order.orderNumber}
              </Text>
              <Text className="text-[16px] font-semibold text-brand">
                {formatZAR(order.total)}
              </Text>
            </View>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </View>

          <Text variant="caption" className="mb-3 mt-1 font-semibold">
            Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
          </Text>

          {order.items.map((item) => {
            const imageAsset = imageSource(item.image);
            return (
              <View
                key={item.id}
                className="mb-3 flex-row items-center gap-3 border-b border-border pb-3"
              >
                {imageAsset ? (
                  <Image
                    source={imageAsset}
                    style={{ width: 60, height: 80, borderRadius: 8, backgroundColor: colors.muted }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-20 w-[60px] rounded-lg bg-muted" />
                )}
                <View className="flex-1">
                  <Text variant="label" numberOfLines={2} className="mb-1">
                    {item.name}
                  </Text>
                  <Text variant="caption" className="mb-1 italic">
                    By {item.merchant.displayName}
                  </Text>
                  {item.size && (
                    <Text variant="caption" className="mb-2">
                      Size: {item.size}
                    </Text>
                  )}
                  <View className="flex-row items-center justify-between">
                    <Text variant="caption" className="font-semibold">
                      Qty: {item.quantity}
                    </Text>
                    <Text variant="label">{formatZAR(item.lineTotal)}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <IconSymbol name="calendar" size={16} color={colors.mutedForeground} />
              <Text variant="caption" className="flex-1">
                Estimated delivery:{' '}
                {estimatedDelivery
                  ? new Date(estimatedDelivery).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'To be confirmed'}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <IconSymbol name="location" size={16} color={colors.mutedForeground} />
              <Text variant="caption" className="flex-1">
                {address.line1}, {address.city}, {address.postalCode}
              </Text>
            </View>
          </View>
        </Card>

        {/* Cancelled banner OR Status Timeline */}
        {order.status === 'CANCELLED' ? (
          <Card className="mx-5 mt-4 p-5">
            <View className="flex-row items-start gap-3">
              <IconSymbol name="slash.circle" size={24} color={colors.danger} />
              <View className="flex-1">
                <Text variant="label" className="mb-1 text-danger">
                  Order cancelled
                </Text>
                <Text variant="caption" className="leading-5">
                  This order has been cancelled and won&apos;t be delivered.
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card className="mx-5 mt-4 p-5">
            <Text variant="heading" className="mb-5">
              Order Status
            </Text>
            <View>{timeline.map((step, index) => renderStatusStep(step, index))}</View>
          </Card>
        )}

        {/* Courier Tracking */}
        {order.status !== 'CANCELLED' && (
          <Card className="mx-5 mt-4 p-5">
            <Text variant="heading" className="mb-5">
              Courier Tracking
            </Text>
            {trackingQuery.isPending ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : tracking ? (
              <>
                <View className="mb-3">
                  <Text variant="label">
                    {tracking.courier} · {tracking.trackingNumber}
                  </Text>
                </View>
                {tracking.events.length === 0 ? (
                  <Text variant="caption" className="leading-5">
                    No scans yet — updates appear here as the parcel moves.
                  </Text>
                ) : (
                  tracking.events.map((event, index) => (
                    <View key={index} className="border-b border-border py-2.5">
                      <Text className="mb-0.5 text-[14px] font-medium text-foreground">
                        {event.description ?? 'Update'}
                      </Text>
                      <Text variant="micro" className="font-normal">
                        {[formatDateTime(event.at), event.location]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  ))
                )}
              </>
            ) : trackingPending ? (
              <Text variant="caption" className="leading-5">
                The courier hasn&apos;t collected your order yet. Tracking will
                appear here once it&apos;s on the move.
              </Text>
            ) : (
              <Text variant="caption" className="leading-5">
                Couldn&apos;t load tracking right now. Pull to refresh.
              </Text>
            )}
          </Card>
        )}

        {/* Actions */}
        <Card className="mx-5 mt-4 p-5">
          <TouchableOpacity className="flex-row items-center gap-3 py-1" onPress={handleContactBrand}>
            <IconSymbol name="message" size={20} color={colors.brand} />
            <View className="flex-1">
              <Text variant="label" className="mb-0.5">
                Contact {order.items[0]?.merchant.displayName ?? 'the brand'}
              </Text>
              <Text variant="caption">Ask questions about your order</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {canCancel && (
            <>
              <Separator className="my-4" />
              <TouchableOpacity
                className="flex-row items-center gap-3 py-1"
                onPress={handleCancelOrder}
                disabled={cancelMutation.isPending}
              >
                <IconSymbol name="xmark.circle" size={20} color={colors.danger} />
                <View className="flex-1">
                  <Text variant="label" className="mb-0.5 text-danger">
                    {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
                  </Text>
                  <Text variant="caption">Free cancellation before dispatch</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Help Section */}
        <Card className="mx-5 mt-4 flex-row items-start gap-3 p-5">
          <IconSymbol name="questionmark.circle" size={24} color={colors.mutedForeground} />
          <View className="flex-1">
            <Text variant="label" className="mb-1">
              Need Help?
            </Text>
            <Text variant="caption" className="leading-5">
              If you have any questions about your order, feel free to contact
              the brand directly.
            </Text>
          </View>
        </Card>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
