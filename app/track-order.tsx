import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCancelOrder, useOrder, useOrderTracking } from '@/hooks/useOrderQueries';
import { APIError, type MobileOrderStatus } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';

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

  // ── Loading / error states ──

  if (!orderId || orderQuery.isError || (orderQuery.isSuccess && !order)) {
    const notFound =
      !orderId ||
      (orderQuery.error instanceof APIError && orderQuery.error.status === 404);
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ThemedText style={styles.stateTitle}>
            {notFound ? "We couldn't find that order" : "Couldn't load your order"}
          </ThemedText>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => (notFound ? handleClosePress() : orderQuery.refetch())}
          >
            <ThemedText style={styles.primaryButtonText}>
              {notFound ? 'Browse YIIVA' : 'Retry'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (orderQuery.isPending || !order) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      </ThemedView>
    );
  }

  const timeline = buildTimeline(order.status, order.statusHistory);
  const address = order.shipping.address;
  const estimatedDelivery =
    tracking?.estimatedDeliveryTo ?? order.shipping.estimatedDelivery;

  const renderStatusStep = (step: TimelineStep, index: number) => {
    const isLast = index === timeline.length - 1;

    return (
      <View key={step.title} style={styles.statusStep}>
        <View style={styles.statusIndicatorContainer}>
          <View
            style={[
              styles.statusIndicator,
              step.completed && styles.completedIndicator,
              step.current && styles.currentIndicator,
            ]}
          >
            {step.completed ? (
              <IconSymbol name="checkmark" size={16} color="#fff" />
            ) : (
              <View style={[styles.statusDot, step.current && styles.currentDot]} />
            )}
          </View>
          {!isLast && (
            <View style={[styles.statusLine, step.completed && styles.completedLine]} />
          )}
        </View>

        <View style={styles.statusContent}>
          <ThemedText
            style={[styles.statusTitle, step.current && styles.currentStatusTitle]}
          >
            {step.title}
          </ThemedText>
          <ThemedText style={styles.statusDescription}>{step.description}</ThemedText>
          {step.timestamp && (
            <ThemedText style={styles.statusTimestamp}>{step.timestamp}</ThemedText>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSpacer} />
        <ThemedText style={styles.headerTitle}>Track Order</ThemedText>
        <TouchableOpacity onPress={handleClosePress} style={styles.closeButton}>
          <IconSymbol name="xmark" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={orderQuery.isRefetching}
            onRefresh={() => {
              orderQuery.refetch();
              trackingQuery.refetch();
            }}
          />
        }
      >
        {/* Order Info Card */}
        <View style={styles.orderInfoCard}>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <ThemedText style={styles.orderNumber}>{order.orderNumber}</ThemedText>
              <ThemedText style={styles.orderTotal}>{formatZAR(order.total)}</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.itemsHeader}>
            Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
          </ThemedText>

          {order.items.map((item) => {
            const imageAsset = imageSource(item.image);
            return (
              <View key={item.id} style={styles.productInfo}>
                {imageAsset ? (
                  <Image source={imageAsset} style={styles.productImage} contentFit="cover" />
                ) : (
                  <View style={styles.productImagePlaceholder} />
                )}
                <View style={styles.productDetails}>
                  <ThemedText style={styles.productTitle} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={styles.artistName}>
                    By {item.merchant.displayName}
                  </ThemedText>
                  {item.size && (
                    <ThemedText style={styles.productSize}>Size: {item.size}</ThemedText>
                  )}
                  <View style={styles.productPriceRow}>
                    <ThemedText style={styles.productQuantity}>
                      Qty: {item.quantity}
                    </ThemedText>
                    <ThemedText style={styles.productPrice}>
                      {formatZAR(item.lineTotal)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}

          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryRow}>
              <IconSymbol name="calendar" size={16} color="#666" />
              <ThemedText style={styles.deliveryText}>
                Estimated delivery:{' '}
                {estimatedDelivery
                  ? new Date(estimatedDelivery).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'To be confirmed'}
              </ThemedText>
            </View>
            <View style={styles.deliveryRow}>
              <IconSymbol name="location" size={16} color="#666" />
              <ThemedText style={styles.deliveryText}>
                {address.line1}, {address.city}, {address.postalCode}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Cancelled banner OR Status Timeline */}
        {order.status === 'CANCELLED' ? (
          <View style={styles.timelineCard}>
            <View style={styles.cancelledRow}>
              <IconSymbol name="slash.circle" size={24} color="#b3261e" />
              <View style={styles.cancelledContent}>
                <ThemedText style={styles.cancelledTitle}>Order cancelled</ThemedText>
                <ThemedText style={styles.statusDescription}>
                  This order has been cancelled and won&apos;t be delivered.
                </ThemedText>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.timelineCard}>
            <ThemedText style={styles.timelineTitle}>Order Status</ThemedText>
            <View style={styles.timeline}>
              {timeline.map((step, index) => renderStatusStep(step, index))}
            </View>
          </View>
        )}

        {/* Courier Tracking */}
        {order.status !== 'CANCELLED' && (
          <View style={styles.timelineCard}>
            <ThemedText style={styles.timelineTitle}>Courier Tracking</ThemedText>
            {trackingQuery.isPending ? (
              <ActivityIndicator size="small" color="#333" />
            ) : tracking ? (
              <>
                <View style={styles.trackingHeaderRow}>
                  <ThemedText style={styles.trackingWaybill}>
                    {tracking.courier} · {tracking.trackingNumber}
                  </ThemedText>
                </View>
                {tracking.events.length === 0 ? (
                  <ThemedText style={styles.statusDescription}>
                    No scans yet — updates appear here as the parcel moves.
                  </ThemedText>
                ) : (
                  tracking.events.map((event, index) => (
                    <View key={index} style={styles.trackingEvent}>
                      <ThemedText style={styles.trackingEventDescription}>
                        {event.description ?? 'Update'}
                      </ThemedText>
                      <ThemedText style={styles.trackingEventMeta}>
                        {[formatDateTime(event.at), event.location]
                          .filter(Boolean)
                          .join(' · ')}
                      </ThemedText>
                    </View>
                  ))
                )}
              </>
            ) : trackingPending ? (
              <ThemedText style={styles.statusDescription}>
                The courier hasn&apos;t collected your order yet. Tracking will
                appear here once it&apos;s on the move.
              </ThemedText>
            ) : (
              <ThemedText style={styles.statusDescription}>
                Couldn&apos;t load tracking right now. Pull to refresh.
              </ThemedText>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleContactBrand}>
            <IconSymbol name="message" size={20} color="#007AFF" />
            <View style={styles.actionButtonContent}>
              <ThemedText style={styles.actionButtonTitle}>
                Contact {order.items[0]?.merchant.displayName ?? 'the brand'}
              </ThemedText>
              <ThemedText style={styles.actionButtonSubtitle}>
                Ask questions about your order
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>

          {canCancel && (
            <>
              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCancelOrder}
                disabled={cancelMutation.isPending}
              >
                <IconSymbol name="xmark.circle" size={20} color="#b3261e" />
                <View style={styles.actionButtonContent}>
                  <ThemedText style={[styles.actionButtonTitle, styles.cancelActionTitle]}>
                    {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
                  </ThemedText>
                  <ThemedText style={styles.actionButtonSubtitle}>
                    Free cancellation before dispatch
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={16} color="#666" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <IconSymbol name="questionmark.circle" size={24} color="#666" />
          <View style={styles.helpContent}>
            <ThemedText style={styles.helpTitle}>Need Help?</ThemedText>
            <ThemedText style={styles.helpText}>
              If you have any questions about your order, feel free to contact
              the brand directly.
            </ThemedText>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
    backgroundColor: '#fff',
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  orderInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    fontFamily: 'Didot',
  },
  itemsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 4,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productImagePlaceholder: {
    width: 60,
    height: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  productSize: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productQuantity: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Didot',
  },
  deliveryInfo: {
    gap: 8,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  timelineCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  timeline: {
    gap: 0,
  },
  cancelledRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cancelledContent: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#b3261e',
    marginBottom: 4,
  },
  trackingHeaderRow: {
    marginBottom: 12,
  },
  trackingWaybill: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  trackingEvent: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trackingEventDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  trackingEventMeta: {
    fontSize: 12,
    color: '#999',
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  statusIndicatorContainer: {
    alignItems: 'center',
    width: 32,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  completedIndicator: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  currentIndicator: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
  },
  currentDot: {
    backgroundColor: '#fff',
  },
  statusLine: {
    width: 2,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginTop: 8,
  },
  completedLine: {
    backgroundColor: '#4CAF50',
  },
  statusContent: {
    flex: 1,
    paddingBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  currentStatusTitle: {
    color: '#007AFF',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  statusTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  cancelActionTitle: {
    color: '#b3261e',
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  helpCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
