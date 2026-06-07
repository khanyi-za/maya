import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCartStore } from '@/lib/cart-store';
import { getLocalAsset } from '@/lib/local-assets';

interface OrderStatus {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, getCartTotal, getItemCount } = useCartStore();

  const handleClosePress = () => {
    router.push('/(tabs)/');
  };

  const handleContactArtist = () => {
    console.log('Contact artist');
    // Navigate to chat or contact page
  };

  const handleViewOrderDetails = () => {
    console.log('View order details');
    // Navigate to full order details
  };

  const handleUpdateNotifications = () => {
    console.log('Update notifications');
    // Navigate to notification settings
  };

  // Generate order number
  const orderNumber = `YV${Date.now().toString().slice(-6)}`;

  // Calculate totals
  const subtotal = getCartTotal();
  const shippingFee = subtotal >= 650 ? 0 : 65;
  const tax = subtotal * 0.15;
  const total = subtotal + shippingFee + tax;

  // Order info derived from cart
  const orderInfo = {
    orderNumber: `#${orderNumber}`,
    total: `R${total.toFixed(2)}`,
    itemCount: getItemCount(),
    estimatedDelivery: 'Feb 15, 2024',
    shippingAddress: '123 Long Street, Cape Town, 8001'
  };

  const orderStatuses: OrderStatus[] = [
    {
      step: 1,
      title: 'Order Placed',
      description: 'Your order has been received and confirmed',
      completed: true,
      current: false,
      timestamp: 'Jan 15, 2024 at 2:30 PM'
    },
    {
      step: 2,
      title: 'Order Confirmed',
      description: 'Artist has accepted your order and is creating your item',
      completed: true,
      current: false,
      timestamp: 'Jan 15, 2024 at 3:45 PM'
    },
    {
      step: 3,
      title: 'Shipped',
      description: 'Your order is on its way to you',
      completed: false,
      current: true,
      timestamp: 'Expected Jan 29, 2024'
    },
    {
      step: 4,
      title: 'Delivered',
      description: 'Order successfully delivered',
      completed: false,
      current: false
    }
  ];

  const renderStatusStep = (status: OrderStatus, index: number) => {
    const isLast = index === orderStatuses.length - 1;
    
    return (
      <View key={status.step} style={styles.statusStep}>
        <View style={styles.statusIndicatorContainer}>
          <View style={[
            styles.statusIndicator,
            status.completed && styles.completedIndicator,
            status.current && styles.currentIndicator
          ]}>
            {status.completed ? (
              <IconSymbol name="checkmark" size={16} color="#fff" />
            ) : (
              <View style={[
                styles.statusDot,
                status.current && styles.currentDot
              ]} />
            )}
          </View>
          {!isLast && (
            <View style={[
              styles.statusLine,
              status.completed && styles.completedLine
            ]} />
          )}
        </View>
        
        <View style={styles.statusContent}>
          <ThemedText style={[
            styles.statusTitle,
            status.current && styles.currentStatusTitle
          ]}>
            {status.title}
          </ThemedText>
          <ThemedText style={styles.statusDescription}>
            {status.description}
          </ThemedText>
          {status.timestamp && (
            <ThemedText style={styles.statusTimestamp}>
              {status.timestamp}
            </ThemedText>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Info Card */}
        <View style={styles.orderInfoCard}>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <ThemedText style={styles.orderNumber}>{orderInfo.orderNumber}</ThemedText>
              <ThemedText style={styles.orderTotal}>{orderInfo.total}</ThemedText>
            </View>
            <TouchableOpacity onPress={handleViewOrderDetails} style={styles.detailsButton}>
              <ThemedText style={styles.detailsButtonText}>Details</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.itemsHeader}>Items ({orderInfo.itemCount})</ThemedText>

          {items.map((item) => {
            const imageAsset = getLocalAsset(item.image);
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
                  {item.selectedSize && (
                    <ThemedText style={styles.productSize}>Size: {item.selectedSize}</ThemedText>
                  )}
                  <View style={styles.productPriceRow}>
                    <ThemedText style={styles.productQuantity}>Qty: {item.quantity}</ThemedText>
                    <ThemedText style={styles.productPrice}>
                      {item.currency}{(item.price * item.quantity).toFixed(2)}
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
                Estimated delivery: {orderInfo.estimatedDelivery}
              </ThemedText>
            </View>
            <View style={styles.deliveryRow}>
              <IconSymbol name="location" size={16} color="#666" />
              <ThemedText style={styles.deliveryText}>
                {orderInfo.shippingAddress}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Order Status Timeline */}
        <View style={styles.timelineCard}>
          <ThemedText style={styles.timelineTitle}>Order Status</ThemedText>
          <View style={styles.timeline}>
            {orderStatuses.map((status, index) => renderStatusStep(status, index))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleContactArtist}>
            <IconSymbol name="message" size={20} color="#007AFF" />
            <View style={styles.actionButtonContent}>
              <ThemedText style={styles.actionButtonTitle}>Contact Artist</ThemedText>
              <ThemedText style={styles.actionButtonSubtitle}>Ask questions about your order</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity style={styles.actionButton} onPress={handleUpdateNotifications}>
            <IconSymbol name="bell" size={20} color="#007AFF" />
            <View style={styles.actionButtonContent}>
              <ThemedText style={styles.actionButtonTitle}>Update Notifications</ThemedText>
              <ThemedText style={styles.actionButtonSubtitle}>Change how you receive updates</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <IconSymbol name="questionmark.circle" size={24} color="#666" />
          <View style={styles.helpContent}>
            <ThemedText style={styles.helpTitle}>Need Help?</ThemedText>
            <ThemedText style={styles.helpText}>
              If you have any questions about your order, feel free to contact us or the artist directly.
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
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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