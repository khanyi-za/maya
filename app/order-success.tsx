import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCartStore } from '@/lib/cart-store';
import { getLocalAsset } from '@/lib/local-assets';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, getCartTotal, getItemCount, clearCart } = useCartStore();

  // Generate order number
  const orderNumber = `YV${Date.now().toString().slice(-6)}`;

  // Calculate totals
  const subtotal = getCartTotal();
  const shippingFee = subtotal >= 650 ? 0 : 65;
  const tax = subtotal * 0.15;
  const total = subtotal + shippingFee + tax;

  const handleContinueShopping = () => {
    router.push('/(tabs)/');
  };

  const handleTrackOrder = () => {
    // Navigate to order tracking
    console.log('Navigate to order tracking');
    router.push('/track-order');
  };

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
            Thank you for your order. We'll send you a confirmation email shortly.
          </ThemedText>

          {/* Order Details */}
          <View style={styles.orderDetails}>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Order Number:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>#{orderNumber}</ThemedText>
            </View>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Total Amount:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>R{total.toFixed(2)}</ThemedText>
            </View>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Items:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>{getItemCount()}</ThemedText>
            </View>
            <View style={styles.orderDetailRow}>
              <ThemedText style={styles.orderDetailLabel}>Estimated Delivery:</ThemedText>
              <ThemedText style={styles.orderDetailValue}>7-10 business days</ThemedText>
            </View>
          </View>

          {/* Order Items */}
          <View style={styles.orderItems}>
            <ThemedText style={styles.orderItemsTitle}>Your Order</ThemedText>
            {items.map((item) => {
              const imageAsset = getLocalAsset(item.image);
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
                    {item.selectedSize && (
                      <ThemedText style={styles.orderItemSize}>Size: {item.selectedSize}</ThemedText>
                    )}
                    <View style={styles.orderItemPriceRow}>
                      <ThemedText style={styles.orderItemQuantity}>Qty: {item.quantity}</ThemedText>
                      <ThemedText style={styles.orderItemPrice}>
                        {item.currency}{(item.price * item.quantity).toFixed(2)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

        {/* What's Next */}
        <View style={styles.nextSteps}>
          <ThemedText style={styles.nextStepsTitle}>What's Next?</ThemedText>
          <View style={styles.stepItem}>
            <IconSymbol name="envelope" size={20} color="#666" />
            <ThemedText style={styles.stepText}>You'll receive a confirmation email</ThemedText>
          </View>
          <View style={styles.stepItem}>
            <IconSymbol name="hammer" size={20} color="#666" />
            <ThemedText style={styles.stepText}>Artist will start creating your item</ThemedText>
          </View>
          <View style={styles.stepItem}>
            <IconSymbol name="truck" size={20} color="#666" />
            <ThemedText style={styles.stepText}>We'll notify you when it ships</ThemedText>
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