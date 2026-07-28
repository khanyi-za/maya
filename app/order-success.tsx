import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCancelOrder, useOrder } from '@/hooks/useOrderQueries';
import { APIError } from '@/lib/api-client';
import { track } from '@/lib/analytics';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';
import { ORDER_STATUS } from '@/lib/order-status';
import { useThemeColors } from '@/lib/theme';

const LONG_WAIT_MS = 2 * 60 * 1000;

function formatDeliveryDate(iso: string | null): string {
  if (!iso) return 'To be confirmed';
  const date = new Date(iso);
  return date.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

export default function OrderSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  const orderQuery = useOrder(orderId);
  const cancelMutation = useCancelOrder();
  const [longWait, setLongWait] = useState(false);

  const order = orderQuery.data?.order;
  const status = order?.status;

  // Flag the long-tail pending case ("still processing") after the poll window.
  useEffect(() => {
    if (status !== 'PENDING_PAYMENT') return;
    const handle = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => clearTimeout(handle);
  }, [status]);

  // Funnel terminus — fires once, when polling lands on a confirmed status.
  // Client-side approximation; the Paystack webhook stays the money truth.
  const purchaseTracked = useRef(false);
  useEffect(() => {
    if (purchaseTracked.current || !order) return;
    if (
      order.status === 'PENDING_PAYMENT' ||
      order.status === 'PAYMENT_FAILED' ||
      order.status === 'CANCELLED'
    ) {
      return;
    }
    purchaseTracked.current = true;
    track('purchase_completed', {
      orderId: orderId ?? null,
      orderNumber: order.orderNumber,
      totalInCents: order.total,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  }, [order, orderId]);

  const handleContinueShopping = () => router.dismissTo('/(tabs)');

  const handleTrackOrder = () => {
    router.push({ pathname: '/track-order', params: { orderId } });
  };

  const handleCancelOrder = () => {
    if (!orderId) return;
    Alert.alert('Cancel this purchase?', 'This can’t be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel purchase',
        style: 'destructive',
        onPress: () =>
          cancelMutation.mutate(
            { orderId, reason: 'CHANGED_MIND' },
            {
              onError: () =>
                Alert.alert("Couldn't cancel", 'The purchase may already be processing.'),
            }
          ),
      },
    ]);
  };

  const renderCentered = (children: React.ReactNode) => (
    <View className="flex-1 items-center justify-center gap-4 px-10" style={{ paddingTop: insets.top }}>
      {children}
    </View>
  );

  // ── Missing / not found / loading / error states ──

  if (!orderId) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <IconSymbol name="exclamationmark.triangle" size={72} color={colors.mutedForeground} />
            <Text variant="title" className="text-center">
              We couldn&apos;t find that purchase
            </Text>
            <Button variant="brand" className="px-10" onPress={handleContinueShopping}>
              Browse YIIVA
            </Button>
          </>
        )}
      </View>
    );
  }

  if (orderQuery.isPending) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(<ActivityIndicator size="large" color={colors.mutedForeground} />)}
      </View>
    );
  }

  if (orderQuery.isError || !order) {
    const notFound =
      orderQuery.error instanceof APIError && orderQuery.error.status === 404;
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <IconSymbol name="exclamationmark.triangle" size={72} color={colors.mutedForeground} />
            <Text variant="title" className="text-center">
              {notFound ? "We couldn't find that purchase" : "Couldn't load your purchase"}
            </Text>
            <Button
              variant="brand"
              className="px-10"
              onPress={() => (notFound ? handleContinueShopping() : orderQuery.refetch())}
            >
              {notFound ? 'Browse YIIVA' : 'Retry'}
            </Button>
          </>
        )}
      </View>
    );
  }

  // ── Pending payment (polling) ──

  if (status === 'PENDING_PAYMENT') {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <ActivityIndicator size="large" color={colors.mutedForeground} />
            <Text variant="title" className="text-center">
              Confirming your payment…
            </Text>
            <Text variant="body" className="text-center text-muted-foreground">
              {longWait
                ? "Still processing. We'll confirm your purchase shortly — you can keep shopping in the meantime."
                : 'This usually takes a few seconds.'}
            </Text>
            <Text variant="caption">Purchase {order.orderNumber}</Text>
            {longWait && (
              <Button variant="brand" className="px-10" onPress={handleContinueShopping}>
                Continue Shopping
              </Button>
            )}
          </>
        )}
      </View>
    );
  }

  // ── Failed / cancelled ──

  if (status === 'PAYMENT_FAILED' || status === 'CANCELLED') {
    const failed = status === 'PAYMENT_FAILED';
    const meta = ORDER_STATUS[status];
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <IconSymbol
              name={failed ? 'xmark.circle.fill' : 'slash.circle'}
              size={72}
              color={failed ? colors.danger : colors.mutedForeground}
            />
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Text variant="title" className="text-center">
              {failed ? "Payment didn't complete" : 'Purchase cancelled'}
            </Text>
            <Text variant="body" className="text-center text-muted-foreground">
              {failed
                ? 'Your purchase is unpaid. You can cancel it and try again from your cart.'
                : `Purchase ${order.orderNumber} has been cancelled.`}
            </Text>
            {failed && (
              <Button
                variant="danger"
                className="px-10"
                loading={cancelMutation.isPending}
                onPress={handleCancelOrder}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Purchase'}
              </Button>
            )}
            <Button variant="brand" className="px-10" onPress={handleContinueShopping}>
              Continue Shopping
            </Button>
          </>
        )}
      </View>
    );
  }

  // ── Confirmed (and beyond) — the success layout ──

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center px-10 pb-10" style={{ paddingTop: insets.top + 60 }}>
          {/* Success Icon */}
          <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-success-subtle">
            <IconSymbol name="checkmark.circle.fill" size={80} color={colors.success} />
          </View>

          {/* Success Message */}
          <Text variant="title" className="mb-3 text-center">
            Purchase Successful!
          </Text>
          <Text variant="body" className="mb-10 text-center text-muted-foreground">
            Thank you for your purchase. The brands are getting it ready.
          </Text>

          {/* Order Details */}
          <View className="mb-8 w-full rounded-xl bg-muted p-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="body" className="text-muted-foreground">
                Purchase Number:
              </Text>
              <Text variant="label">{order.orderNumber}</Text>
            </View>
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="body" className="text-muted-foreground">
                Total Amount:
              </Text>
              <Text variant="label">{formatZAR(order.total)}</Text>
            </View>
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="body" className="text-muted-foreground">
                Items:
              </Text>
              <Text variant="label">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text variant="body" className="text-muted-foreground">
                Estimated Delivery:
              </Text>
              <Text variant="label">
                {formatDeliveryDate(order.shipping.estimatedDelivery)}
              </Text>
            </View>
          </View>

          {/* Order Items */}
          <View className="mb-8 w-full">
            <Text variant="heading" className="mb-4 text-center">
              Your Purchase
            </Text>
            {order.items.map((item) => {
              const imageAsset = imageSource(item.image);
              return (
                <View key={item.id} className="mb-3 flex-row gap-3 rounded-xl bg-muted p-3">
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
          </View>

          {/* What's Next */}
          <View className="mb-10 w-full">
            <Text variant="heading" className="mb-4 text-center">
              What&apos;s Next?
            </Text>
            <View className="mb-3 flex-row items-center gap-3">
              <IconSymbol name="checkmark.seal" size={20} color={colors.mutedForeground} />
              <Text variant="body" className="flex-1 text-muted-foreground">
                Your payment is confirmed
              </Text>
            </View>
            <View className="mb-3 flex-row items-center gap-3">
              <IconSymbol name="hammer" size={20} color={colors.mutedForeground} />
              <Text variant="body" className="flex-1 text-muted-foreground">
                The brand is preparing your purchase
              </Text>
            </View>
            <View className="mb-3 flex-row items-center gap-3">
              <IconSymbol name="shippingbox" size={20} color={colors.mutedForeground} />
              <Text variant="body" className="flex-1 text-muted-foreground">
                We&apos;ll notify you when it ships
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-4">
            <Button variant="brand" className="w-full" onPress={handleTrackOrder}>
              <IconSymbol name="location" size={20} color={colors.brandForeground} />
              <Text variant="label" className="text-brand-foreground">
                Track Your Purchase
              </Text>
            </Button>

            <Button variant="outline" className="w-full" onPress={handleContinueShopping}>
              Continue Shopping
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
