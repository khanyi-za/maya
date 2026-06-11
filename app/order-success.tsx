import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCancelOrder, useOrder } from '@/hooks/useOrderQueries';
import { APIError } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';

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

  const handleContinueShopping = () => router.dismissTo('/(tabs)');

  const handleTrackOrder = () => {
    router.push({ pathname: '/track-order', params: { orderId } });
  };

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

  const renderCentered = (children: React.ReactNode) => (
    <View style={[styles.centered, { paddingTop: insets.top }]}>{children}</View>
  );

  // ── Missing / not found / loading / error states ──

  if (!orderId) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <ThemedText style={styles.stateTitle}>
              We couldn&apos;t find that order
            </ThemedText>
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinueShopping}>
              <ThemedText style={styles.primaryButtonText}>Browse YIIVA</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>
    );
  }

  if (orderQuery.isPending) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(<ActivityIndicator size="large" color="#333" />)}
      </ThemedView>
    );
  }

  if (orderQuery.isError || !order) {
    const notFound =
      orderQuery.error instanceof APIError && orderQuery.error.status === 404;
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <ThemedText style={styles.stateTitle}>
              {notFound ? "We couldn't find that order" : "Couldn't load your order"}
            </ThemedText>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => (notFound ? handleContinueShopping() : orderQuery.refetch())}
            >
              <ThemedText style={styles.primaryButtonText}>
                {notFound ? 'Browse YIIVA' : 'Retry'}
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>
    );
  }

  // ── Pending payment (polling) ──

  if (status === 'PENDING_PAYMENT') {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <ActivityIndicator size="large" color="#333" />
            <ThemedText style={styles.stateTitle}>Confirming your payment…</ThemedText>
            <ThemedText style={styles.stateText}>
              {longWait
                ? "Still processing. We'll confirm your order shortly — you can keep shopping in the meantime."
                : 'This usually takes a few seconds.'}
            </ThemedText>
            <ThemedText style={styles.orderNumberHint}>
              Order {order.orderNumber}
            </ThemedText>
            {longWait && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleContinueShopping}>
                <ThemedText style={styles.primaryButtonText}>Continue Shopping</ThemedText>
              </TouchableOpacity>
            )}
          </>
        )}
      </ThemedView>
    );
  }

  // ── Failed / cancelled ──

  if (status === 'PAYMENT_FAILED' || status === 'CANCELLED') {
    const failed = status === 'PAYMENT_FAILED';
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderCentered(
          <>
            <IconSymbol
              name={failed ? 'xmark.circle.fill' : 'slash.circle'}
              size={72}
              color={failed ? '#b3261e' : '#999'}
            />
            <ThemedText style={styles.stateTitle}>
              {failed ? "Payment didn't complete" : 'Order cancelled'}
            </ThemedText>
            <ThemedText style={styles.stateText}>
              {failed
                ? 'Your order is unpaid. You can cancel it and try again from your cart.'
                : `Order ${order.orderNumber} has been cancelled.`}
            </ThemedText>
            {failed && (
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleCancelOrder}
                disabled={cancelMutation.isPending}
              >
                <ThemedText style={styles.dangerButtonText}>
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
                </ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinueShopping}>
              <ThemedText style={styles.primaryButtonText}>Continue Shopping</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>
    );
  }

  // ── Confirmed (and beyond) — the success layout ──

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <IconSymbol name="checkmark.circle.fill" size={80} color="#4CAF50" />
          </View>

          {/* Success Message */}
          <ThemedText style={styles.successTitle}>Order Placed Successfully!</ThemedText>
          <ThemedText style={styles.successSubtitle}>
            Thank you for your order. The brands are getting it ready.
          </ThemedText>

          {/* Order Details */}
          <View style={styles.orderDetails}>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Order Number:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>{order.orderNumber}</ThemedText>
            </View>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Total Amount:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>{formatZAR(order.total)}</ThemedText>
            </View>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Items:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </ThemedText>
            </View>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Estimated Delivery:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>
                {formatDeliveryDate(order.shipping.estimatedDelivery)}
              </ThemedText>
            </View>
          </View>

          {/* Order Items */}
          <View style={styles.orderItems}>
            <ThemedText style={styles.orderItemsTitle}>Your Order</ThemedText>
            {order.items.map((item) => {
              const imageAsset = imageSource(item.image);
              return (
                <View key={item.id} style={styles.orderItemCard}>
                  {imageAsset ? (
                    <Image source={imageAsset} style={styles.orderItemImage} contentFit="cover" />
                  ) : (
                    <View style={styles.orderItemImagePlaceholder} />
                  )}
                  <View style={styles.orderItemDetails}>
                    <ThemedText style={styles.orderItemName} numberOfLines={2}>
                      {item.name}
                    </ThemedText>
                    <ThemedText style={styles.orderItemMerchant}>
                      By {item.merchant.displayName}
                    </ThemedText>
                    {item.size && (
                      <ThemedText style={styles.orderItemSize}>Size: {item.size}</ThemedText>
                    )}
                    <View style={styles.orderItemPriceRow}>
                      <ThemedText style={styles.orderItemQuantity}>Qty: {item.quantity}</ThemedText>
                      <ThemedText style={styles.orderItemPrice}>
                        {formatZAR(item.lineTotal)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* What's Next */}
          <View style={styles.nextSteps}>
            <ThemedText style={styles.nextStepsTitle}>What&apos;s Next?</ThemedText>
            <View style={styles.stepItem}>
              <IconSymbol name="checkmark.seal" size={20} color="#666" />
              <ThemedText style={styles.stepText}>Your payment is confirmed</ThemedText>
            </View>
            <View style={styles.stepItem}>
              <IconSymbol name="hammer" size={20} color="#666" />
              <ThemedText style={styles.stepText}>The brand is preparing your order</ThemedText>
            </View>
            <View style={styles.stepItem}>
              <IconSymbol name="shippingbox" size={20} color="#666" />
              <ThemedText style={styles.stepText}>We&apos;ll notify you when it ships</ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.trackOrderButton} onPress={handleTrackOrder}>
              <IconSymbol name="location" size={20} color="#007AFF" />
              <ThemedText style={styles.trackOrderButtonText}>Track Your Order</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.continueShoppingButton} onPress={handleContinueShopping}>
              <ThemedText style={styles.continueShoppingButtonText}>Continue Shopping</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  orderNumberHint: {
    fontSize: 13,
    color: '#999',
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#b3261e',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#b3261e',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  successIcon: {
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  orderDetails: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderDetailLabel: {
    fontSize: 16,
    color: '#666',
  },
  orderDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Didot',
  },
  orderItems: {
    width: '100%',
    marginBottom: 32,
  },
  orderItemsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  orderItemCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  orderItemImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  orderItemImagePlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  orderItemMerchant: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  orderItemSize: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  orderItemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemQuantity: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Didot',
  },
  nextSteps: {
    width: '100%',
    marginBottom: 40,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  actionButtons: {
    width: '100%',
    gap: 16,
  },
  trackOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f8ff',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  trackOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  continueShoppingButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueShoppingButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
